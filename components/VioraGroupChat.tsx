import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateGroupChatResponse } from '../services/geminiService';
import { HumanBrainIcon, SendIcon, CloseIcon, UsersIcon, UserIcon, MicOffIcon, MicrophoneIcon } from './icons';
import { MarkdownRenderer } from '../utils/markdownUtils';
import type { Theme } from '../App';
import type { GroupChatSession, GroupChatMessage, GroupChatMember } from '../types';

// --- LocalStorage "Backend" Simulation ---
const GROUP_CHAT_KEY_PREFIX = 'viora-group-chat-';
const SAVED_GROUPS_KEY = 'viora-saved-groups';

const generateGroupId = (): string => {
    // Generate a random 4-digit number between 1000 and 9999
    return String(Math.floor(1000 + Math.random() * 9000));
};

const getGroupSession = (groupId: string): GroupChatSession | null => {
    try {
        const data = localStorage.getItem(`${GROUP_CHAT_KEY_PREFIX}${groupId}`);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

const saveGroupSession = (session: GroupChatSession) => {
    try {
        localStorage.setItem(`${GROUP_CHAT_KEY_PREFIX}${session.id}`, JSON.stringify(session));
        // Dispatch a storage event to notify other tabs/windows
        window.dispatchEvent(new StorageEvent('storage', {
            key: `${GROUP_CHAT_KEY_PREFIX}${session.id}`,
            newValue: JSON.stringify(session),
        }));
    } catch (e) {
        console.error("Failed to save group session", e);
    }
};

const getSavedGroups = (): string[] => {
    try {
        const data = localStorage.getItem(SAVED_GROUPS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

const addSavedGroup = (groupId: string) => {
    try {
        let saved = getSavedGroups();
        // Remove if it exists to move it to the front
        saved = saved.filter(id => id !== groupId);
        // Add to the front (most recent)
        saved.unshift(groupId);
        // Keep a max of 5 saved groups
        saved = saved.slice(0, 5);
        localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error("Failed to add saved group", e);
    }
};

const removeSavedGroup = (groupId: string) => {
     try {
        let saved = getSavedGroups();
        saved = saved.filter(id => id !== groupId);
        localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error("Failed to remove saved group", e);
    }
}


// --- Component ---
interface VioraGroupChatProps {
    onClose: () => void;
    theme: Theme;
}

const VioraGroupChat: React.FC<VioraGroupChatProps> = ({ onClose, theme }) => {
    const [view, setView] = useState<'landing' | 'chat'>('landing');
    const [userName, setUserName] = useState(localStorage.getItem('viora-username') || '');
    const [userId, setUserId] = useState('');
    const [session, setSession] = useState<GroupChatSession | null>(null);
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [error, setError] = useState('');
    const [isVioraTyping, setIsVioraTyping] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [savedGroups, setSavedGroups] = useState<GroupChatSession[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // For draggable window
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const positionRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setUserId(self.crypto.randomUUID());
        loadSavedGroups();
        
        const handleStorage = (e: StorageEvent) => {
            if (session && e.key === `${GROUP_CHAT_KEY_PREFIX}${session.id}`) {
                const updatedSession = getGroupSession(session.id);
                setSession(updatedSession);
            }
             if (e.key === SAVED_GROUPS_KEY) {
                loadSavedGroups();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            if (session && userId) {
                handleLeaveGroup(true); // Quiet leave
            }
            window.removeEventListener('storage', handleStorage);
        };
    }, []);
    
     useEffect(() => {
        if (session) {
            const handleStorageUpdate = (event: StorageEvent) => {
                if (event.key === `${GROUP_CHAT_KEY_PREFIX}${session.id}`) {
                    const updatedSession = JSON.parse(event.newValue || 'null') as GroupChatSession | null;
                    if (updatedSession) {
                        setSession(updatedSession);
                    } else {
                        // Session was deleted, kick user out
                        setError("The host has ended the session.");
                        setTimeout(resetToLanding, 2000);
                    }
                }
            };
            window.addEventListener('storage', handleStorageUpdate);
            return () => window.removeEventListener('storage', handleStorageUpdate);
        }
    }, [session]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    const loadSavedGroups = () => {
        const groupIds = getSavedGroups();
        const groups = groupIds.map(getGroupSession).filter(Boolean) as GroupChatSession[];
        setSavedGroups(groups);
    };
    
    const handleNameChange = (name: string) => {
        setUserName(name);
        localStorage.setItem('viora-username', name);
    };

    const resetToLanding = () => {
        setSession(null);
        setJoinCodeInput('');
        setView('landing');
        loadSavedGroups();
    };

    const handleCreateGroup = () => {
        if (!userName.trim()) {
            setError("Please enter your name first.");
            return;
        }
        setError('');
        const newGroupId = generateGroupId();
        const newSession: GroupChatSession = {
            id: newGroupId,
            hostId: userId,
            members: [{ userId, userName }],
            messages: [{
                id: self.crypto.randomUUID(),
                userId: 'system',
                userName: 'System',
                text: `${userName} created the group. Call me Viora when you need help!`,
                timestamp: Date.now(),
            }],
            groupIcon: newGroupId,
        };
        setSession(newSession);
        saveGroupSession(newSession);
        addSavedGroup(newGroupId);
        setView('chat');
    };

    const handleJoinGroup = (codeToJoin?: string) => {
        if (!userName.trim()) {
            setError("Please enter your name first.");
            return;
        }
        const code = (codeToJoin || joinCodeInput).trim();
        if (!code) {
            setError("Please enter a group code.");
            return;
        }
        setError('');
        const existingSession = getGroupSession(code);
        if (!existingSession) {
            setError("Group not found. Please check the code.");
            return;
        }
        if (existingSession.members.length >= 5) {
            setError("This group is full.");
            return;
        }
        if (existingSession.members.find(m => m.userId === userId)) {
             // Already in session, just proceed
        } else {
            existingSession.members.push({ userId, userName });
            existingSession.messages.push({
                id: self.crypto.randomUUID(),
                userId: 'system',
                userName: 'System',
                text: `${userName} has joined the chat.`,
                timestamp: Date.now()
            });
        }
        
        setSession(existingSession);
        saveGroupSession(existingSession);
        addSavedGroup(code);
        setView('chat');
    };

    const handleLeaveGroup = (isQuiet = false) => {
        if (session) {
            const currentSession = getGroupSession(session.id);
            if (currentSession) {
                 if (currentSession.hostId === userId) {
                    // Host is leaving, end session for everyone
                    localStorage.removeItem(`${GROUP_CHAT_KEY_PREFIX}${session.id}`);
                    removeSavedGroup(session.id);
                     window.dispatchEvent(new StorageEvent('storage', { key: `${GROUP_CHAT_KEY_PREFIX}${session.id}`, newValue: null }));
                 } else {
                    // Member is leaving
                    currentSession.members = currentSession.members.filter(m => m.userId !== userId);
                    if(!isQuiet) {
                         currentSession.messages.push({
                            id: self.crypto.randomUUID(),
                            userId: 'system',
                            userName: 'System',
                            text: `${userName} has left the chat.`,
                            timestamp: Date.now()
                        });
                    }
                    saveGroupSession(currentSession);
                 }
            }
        }
        resetToLanding();
        onClose();
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !session) return;

        const newMessage: GroupChatMessage = {
            id: self.crypto.randomUUID(),
            userId,
            userName,
            text: messageInput.trim(),
            timestamp: Date.now(),
        };

        const updatedSession = { ...session, messages: [...session.messages, newMessage] };
        setSession(updatedSession);
        saveGroupSession(updatedSession);
        
        const messageText = messageInput;
        setMessageInput('');

        if (messageText.toLowerCase().includes('viora')) {
            setIsVioraTyping(true);
            const vioraResponseText = await generateGroupChatResponse(messageText, updatedSession.messages);
            const vioraMessage: GroupChatMessage = {
                id: self.crypto.randomUUID(),
                userId: 'viora-ai',
                userName: 'Viora',
                text: vioraResponseText,
                timestamp: Date.now(),
                isViora: true
            };
            
            // Refetch session to not overwrite messages sent while Viora was thinking
            const latestSession = getGroupSession(session.id);
            if (latestSession) {
                latestSession.messages.push(vioraMessage);
                setSession(latestSession);
                saveGroupSession(latestSession);
            }
            setIsVioraTyping(false);
        }
    };
    
    // --- Draggable Window Logic ---
    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        isDraggingRef.current = true;
        const rect = containerRef.current.getBoundingClientRect();
        offsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    const onMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return;
        e.preventDefault();
        positionRef.current = {
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y,
        };
        containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`;
    }, []);
    
    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);
    
    // --- Render Functions ---

    const renderLanding = () => (
        <div className="p-6 text-center h-full flex flex-col">
            <UsersIcon className="w-16 h-16 mx-auto mb-4 text-purple-400"/>
            <h2 className="text-2xl font-bold mb-2">Viora Group Chat</h2>
            <p className={`mb-6 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>Study together with your friends and Viora.</p>
            
            <div className="space-y-4">
                <input
                    type="text"
                    value={userName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Enter your name..."
                    className={`w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${theme === 'professional' ? 'bg-white border-gray-300 focus:ring-orange-400' : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-black/20 focus:ring-purple-500'}`}
                />
                <button
                    onClick={handleCreateGroup}
                    className={`w-full p-3 font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-gradient-to-br from-orange-500 to-sky-500' : 'bg-gradient-to-br from-purple-600 to-pink-600'}`}
                >
                    Create New Group
                </button>
                 <div className="flex gap-2">
                    <input
                        type="number"
                        value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value)}
                        placeholder="Enter 4-digit code..."
                        className={`flex-grow p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${theme === 'professional' ? 'bg-white border-gray-300 focus:ring-orange-400' : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-black/20 focus:ring-purple-500'}`}
                    />
                    <button
                        onClick={() => handleJoinGroup()}
                        className={`px-4 font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-sky-500' : 'bg-pink-500'}`}
                    >
                        Join
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            
            <div className="flex-grow flex flex-col min-h-0 mt-6">
                <h3 className="text-sm font-bold text-left mb-2 text-gray-500">RECENT GROUPS</h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-2">
                    {savedGroups.length > 0 ? (
                        savedGroups.map(group => (
                            <div key={group.id} className="group relative">
                                <button
                                    onClick={() => handleJoinGroup(group.id)}
                                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-colors ${theme === 'professional' ? 'bg-gray-200/50 hover:bg-gray-200' : 'bg-white/5 dark:bg-black/20 hover:bg-white/10 dark:hover:bg-black/30'}`}
                                >
                                    <div>
                                        <p className="font-bold">Group #{group.id}</p>
                                        <p className="text-xs text-gray-500">{group.members.length} member(s)</p>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {group.members.slice(0, 3).map(m => (
                                            <div key={m.userId} className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-100 dark:ring-gray-800" title={m.userName}>
                                                {m.userName.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                </button>
                                <div className="absolute bottom-full left-0 mb-2 w-full p-2 bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <p className="font-bold border-b border-white/20 pb-1 mb-1">Last Messages</p>
                                    {group.messages.slice(-3).map(m => (
                                        <p key={m.id} className="truncate"><span className="font-semibold">{m.isViora ? "Viora" : m.userName}:</span> {m.text}</p>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 text-sm py-4">Your saved groups will appear here.</div>
                    )}
                </div>
            </div>
        </div>
    );
    
    const GenerativeGroupIcon = ({ seed }: { seed: string }) => {
        const hash = seed.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        const color1 = `hsl(${hash % 360}, 70%, 50%)`;
        const color2 = `hsl(${(hash * 7) % 360}, 70%, 60%)`;
        return (
            <svg width="24" height="24" viewBox="0 0 24 24" className="rounded-full">
                <defs>
                    <linearGradient id={`grad-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color1} />
                        <stop offset="100%" stopColor={color2} />
                    </linearGradient>
                </defs>
                <rect width="24" height="24" fill={`url(#grad-${seed})`} />
                <circle cx={6 + (hash % 5)} cy={6 + (hash % 5)} r={2 + (hash % 2)} fill="white" opacity="0.5" />
                <path d={`M ${12 + (hash % 4)} 4 L ${20} ${12 - (hash % 3)} L ${12} 20`} stroke="white" strokeWidth="1.5" fill="none" opacity="0.6"/>
            </svg>
        );
    };

    const renderChat = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div 
                className={`flex-shrink-0 p-3 border-b flex justify-between items-center cursor-grab active:cursor-grabbing ${theme === 'professional' ? 'bg-white/50 border-gray-200' : 'bg-black/20 border-white/10'}`}
                onMouseDown={onMouseDown}
            >
                <div className="flex items-center gap-2">
                    <GenerativeGroupIcon seed={session!.groupIcon} />
                    <div>
                        <h3 className="font-bold leading-tight">Group #{session!.id}</h3>
                        <p className="text-xs text-gray-500 cursor-pointer" onClick={() => navigator.clipboard.writeText(session!.id)} title="Copy code">Click to copy code</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <div className="flex -space-x-2 relative group">
                        {session!.members.map(m => (
                            <div key={m.userId} className={`w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold ring-2 ${theme === 'professional' ? 'ring-gray-100' : 'ring-gray-800'}`} title={m.userName}>
                                {m.userName.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block p-2 bg-gray-800 text-white text-xs rounded-md w-max z-10">
                            {session!.members.map(m => <div key={m.userId}>{m.userName}</div>)}
                        </div>
                    </div>
                    <button onClick={() => handleLeaveGroup(false)} title="Leave Group" className="p-1 rounded-full hover:bg-red-500/20 text-red-500"><CloseIcon className="w-5 h-5"/></button>
                </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {session!.messages.map(msg => {
                    if (msg.userId === 'system') {
                        return <p key={msg.id} className="text-center text-xs text-gray-500 italic py-2">{msg.text}</p>
                    }
                    const isSelf = msg.userId === userId;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : ''}`}>
                             {!isSelf && (
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${msg.isViora ? 'bg-purple-500/20' : 'bg-gray-300 dark:bg-gray-600'}`} title={msg.userName}>
                                    {msg.isViora ? <HumanBrainIcon theme={theme} className="w-5 h-5"/> : msg.userName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${
                                isSelf ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg' : 
                                msg.isViora ? (theme === 'professional' ? 'bg-white border border-gray-200' : 'bg-purple-500/20 backdrop-blur-md') : 
                                (theme === 'professional' ? 'bg-white border border-gray-200' : 'bg-white/10 dark:bg-black/20 backdrop-blur-md')
                            }`}>
                                {!isSelf && <p className={`text-xs font-bold mb-1 ${msg.isViora ? (theme === 'professional' ? 'text-orange-600' : 'text-purple-400') : (theme === 'professional' ? 'text-gray-600' : 'text-gray-400')}`}>{msg.userName}</p>}
                                <MarkdownRenderer text={msg.text} />
                            </div>
                        </div>
                    )
                })}
                {isVioraTyping && (
                    <div className="flex items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex-shrink-0 flex items-center justify-center font-bold text-sm">
                            <HumanBrainIcon theme={theme} className="w-5 h-5"/>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/20">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>
            {/* Input */}
            <div className={`flex-shrink-0 p-2 border-t ${theme === 'professional' ? 'bg-white/50 border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <div className={`flex items-center gap-2 p-1 rounded-full ${theme === 'professional' ? 'bg-gray-200/50' : 'bg-black/20'}`}>
                    <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {if (e.key === 'Enter') handleSendMessage()}}
                        placeholder="Type a message..."
                        className="w-full p-2 bg-transparent focus:outline-none"
                    />
                    <button onClick={handleSendMessage} disabled={!messageInput.trim()} className="p-2 bg-blue-500 text-white rounded-full disabled:bg-gray-400 transition-colors"><SendIcon className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-lg z-40 flex items-center justify-center" onClick={() => handleLeaveGroup(false)}>
            <div
                ref={containerRef}
                onClick={e => e.stopPropagation()}
                className={`
                    fixed md:relative 
                    w-full h-full md:w-[385px] md:h-[800px] md:max-h-[90vh]
                    flex flex-col 
                    shadow-2xl rounded-none md:rounded-[40px]
                    overflow-hidden border
                    animate-slide-in
                    ${theme === 'professional' ? 'bg-gray-100/90 text-gray-900 border-gray-300' : 'bg-gray-900/80 text-gray-200 backdrop-blur-2xl border-white/20'}
                `}
                style={{ touchAction: 'none' }} // Prevent scrolling on mobile when dragging
            >
                {view === 'landing' ? renderLanding() : renderChat()}
            </div>
        </div>
    );
};

export default VioraGroupChat;
