import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateGroupChatResponse, generateProactiveGroupChatResponse } from '../services/geminiService';
import * as groupChatService from '../services/groupChatService';
import { HumanBrainIcon, SendIcon, CloseIcon, UsersIcon, UploadIcon, ClipboardListIcon, LayersIcon } from './icons';
import { MarkdownRenderer } from '../utils/markdownUtils';
import { imageFileToDataUrl } from '../utils/fileUtils';
import type { Theme, GroupChatSession, GroupChatMessage, QuizPayload, FlashcardPayload, ImagePayload } from '../types';
import { getOrSetUserId, setActiveGroupId, clearActiveGroupId } from '../utils/localStorageUtils';
import GroupQuizRunner from './groupchat/GroupQuizRunner';
import GroupFlashcardViewer from './groupchat/GroupFlashcardViewer';

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
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    // For draggable window
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const positionRef = useRef({ x: 0, y: 0 });
    const offsetRef = useRef({ x: 0, y: 0 });

    // For shared content modals
    const [activeQuiz, setActiveQuiz] = useState<QuizPayload | null>(null);
    const [activeFlashcards, setActiveFlashcards] = useState<FlashcardPayload | null>(null);

    const loadSavedGroups = useCallback(() => {
        const groupIds = groupChatService.getSavedGroups();
        const groups = groupIds.map(groupChatService.getGroupSession).filter(Boolean) as GroupChatSession[];
        setSavedGroups(groups);
    }, []);

    const resetToLanding = useCallback(() => {
        setSession(null);
        setJoinCodeInput('');
        setView('landing');
        loadSavedGroups();
    }, [loadSavedGroups]);

    // This effect runs once on mount to initialize user and load saved groups.
    useEffect(() => {
        setUserId(getOrSetUserId());
        loadSavedGroups();
    }, [loadSavedGroups]);
    
    // This effect manages the storage event listener and component cleanup logic.
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (session && e.key === `viora-group-chat-${session.id}`) {
                const updatedSession = groupChatService.getGroupSession(session.id);
                if (updatedSession) {
                    setSession(updatedSession);
                } else {
                    setError("The host has ended the session.");
                    setTimeout(resetToLanding, 2000);
                }
            }
            if (e.key === 'viora-saved-groups') {
                loadSavedGroups();
            }
        };
        
        window.addEventListener('storage', handleStorage);
        
        if (session) {
            setActiveGroupId(session.id);
        }

        return () => {
            window.removeEventListener('storage', handleStorage);
            clearActiveGroupId();

            if (session && userId) {
                const sessionOnDisk = groupChatService.getGroupSession(session.id);
                if (sessionOnDisk) {
                     if (sessionOnDisk.hostId === userId) {
                        groupChatService.deleteGroupSession(session.id);
                        groupChatService.removeSavedGroup(session.id);
                     } else {
                        sessionOnDisk.members = sessionOnDisk.members.filter(m => m.userId !== userId);
                        groupChatService.saveGroupSession(sessionOnDisk);
                     }
                }
            }
        };
    }, [session, userId, loadSavedGroups, resetToLanding]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    const handleNameChange = (name: string) => {
        setUserName(name);
        localStorage.setItem('viora-username', name);
    };

    const handleCreateGroup = () => {
        if (!userName.trim()) {
            setError("Please enter your name first.");
            return;
        }
        setError('');
        let newGroupId = groupChatService.generateGroupId();
        while(groupChatService.getGroupSession(newGroupId)) {
            newGroupId = groupChatService.generateGroupId();
        }

        const newSession: GroupChatSession = {
            id: newGroupId,
            hostId: userId,
            members: [{ userId, userName }],
            messages: [{
                id: self.crypto.randomUUID(),
                userId: 'viora-ai',
                userName: 'Viora',
                isViora: true,
                text: `Welcome to the study group! The code to join is **${newGroupId}**. Share it with your friends! Feel free to ask me anything by mentioning "Viora".`,
                timestamp: Date.now(),
                type: 'text',
            }],
            groupIcon: newGroupId,
        };
        setSession(newSession);
        groupChatService.saveGroupSession(newSession);
        groupChatService.addSavedGroup(newGroupId);
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
        const existingSession = groupChatService.getGroupSession(code);
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
                timestamp: Date.now(),
                type: 'system',
            });
        }
        
        setSession(existingSession);
        groupChatService.saveGroupSession(existingSession);
        groupChatService.addSavedGroup(code);
        setView('chat');
    };

    const handleLeaveGroup = (isQuiet = false) => {
        if (session) {
            const currentSession = groupChatService.getGroupSession(session.id);
            if (currentSession) {
                 if (currentSession.hostId === userId) {
                    groupChatService.deleteGroupSession(session.id);
                    groupChatService.removeSavedGroup(session.id);
                 } else {
                    currentSession.members = currentSession.members.filter(m => m.userId !== userId);
                    if(!isQuiet) {
                         currentSession.messages.push({
                            id: self.crypto.randomUUID(),
                            userId: 'system',
                            userName: 'System',
                            text: `${userName} has left the chat.`,
                            timestamp: Date.now(),
                            type: 'system',
                        });
                    }
                    groupChatService.saveGroupSession(currentSession);
                 }
            }
        }
        resetToLanding();
        onClose();
    };

    const handleSendMessage = async (messagePayload: { text?: string; type: GroupChatMessage['type']; payload?: GroupChatMessage['payload'] }) => {
        if (!session) return;

        const newMessage: GroupChatMessage = {
            id: self.crypto.randomUUID(),
            userId,
            userName,
            timestamp: Date.now(),
            ...messagePayload
        };

        const updatedSession = { ...session, messages: [...session.messages, newMessage] };
        setSession(updatedSession);
        groupChatService.saveGroupSession(updatedSession);
        
        const messageText = messageInput;
        setMessageInput('');

        if (messagePayload.type === 'text' && messagePayload.text?.toLowerCase().includes('viora')) {
            setIsVioraTyping(true);
            const vioraResponseText = await generateGroupChatResponse(messageText, updatedSession.messages);
            const vioraMessage: GroupChatMessage = {
                id: self.crypto.randomUUID(),
                userId: 'viora-ai',
                userName: 'Viora',
                text: vioraResponseText,
                timestamp: Date.now(),
                isViora: true,
                type: 'text',
            };
            
            const latestSession = groupChatService.getGroupSession(session.id);
            if (latestSession) {
                latestSession.messages.push(vioraMessage);
                setSession(latestSession);
                groupChatService.saveGroupSession(latestSession);
            }
            setIsVioraTyping(false);
        } else if (messagePayload.type === 'text') {
            const userMessages = updatedSession.messages.filter(m => !m.isViora && m.type === 'text');
            if (userMessages.length > 2 && Math.random() < 0.25) {
                const proactiveResponse = await generateProactiveGroupChatResponse(updatedSession.messages, updatedSession.members);
                if (proactiveResponse !== "NULL") {
                    const vioraProactiveMessage: GroupChatMessage = {
                        id: self.crypto.randomUUID(),
                        userId: 'viora-ai',
                        userName: 'Viora',
                        text: proactiveResponse,
                        timestamp: Date.now(),
                        isViora: true,
                        type: 'text',
                    };
                    const latestSession = groupChatService.getGroupSession(session.id);
                    if (latestSession) {
                        latestSession.messages.push(vioraProactiveMessage);
                        setSession(latestSession);
                        groupChatService.saveGroupSession(latestSession);
                    }
                }
            }
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const { src, fileName } = await imageFileToDataUrl(file);
            const payload: ImagePayload = { src, fileName };
            handleSendMessage({ type: 'image', payload });
        } catch(e) {
            alert(e instanceof Error ? e.message : 'Failed to upload image.');
        } finally {
            if (event.target) event.target.value = '';
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
        <div className="p-6 text-center h-full flex flex-col bg-transparent">
            <UsersIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'professional' ? 'text-orange-500' : 'text-violet-400'}`}/>
            <h2 className="text-2xl font-bold mb-2">Viora Group Chat</h2>
            <p className={`mb-6 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>Study together with your friends and Viora.</p>
            
            <div className="space-y-4">
                <input
                    type="text"
                    value={userName}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Enter your name..."
                    className={`w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${theme === 'professional' ? 'bg-white/30 backdrop-blur-sm border-gray-300/50 focus:ring-orange-400' : 'bg-black/10 backdrop-blur-sm border-white/5 focus:ring-violet-500'}`}
                />
                <button
                    onClick={handleCreateGroup}
                    className={`w-full p-3 font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-gradient-to-br from-orange-500 to-sky-500' : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'}`}
                >
                    Create New Group
                </button>
                 <div className="flex gap-2">
                    <input
                        type="number"
                        value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value)}
                        placeholder="Enter 4-digit code..."
                        className={`flex-grow p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${theme === 'professional' ? 'bg-white/30 backdrop-blur-sm border-gray-300/50 focus:ring-orange-400' : 'bg-black/10 backdrop-blur-sm border-white/5 focus:ring-violet-500'}`}
                    />
                    <button
                        onClick={() => handleJoinGroup()}
                        className={`px-4 font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-sky-500' : 'bg-fuchsia-500'}`}
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
                                    className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-colors ${theme === 'professional' ? 'bg-black/5 hover:bg-black/10' : 'bg-black/20 hover:bg-black/30'}`}
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
        const color1 = theme === 'professional' ? `hsl(${hash % 360}, 80%, 60%)` : `hsl(${hash % 360}, 70%, 50%)`;
        const color2 = theme === 'professional' ? `hsl(${(hash * 7) % 360}, 80%, 70%)` : `hsl(${(hash * 7) % 360}, 70%, 60%)`;
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
        <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div 
                className={`flex-shrink-0 p-3 border-b flex justify-between items-center cursor-grab active:cursor-grabbing bg-transparent ${theme === 'professional' ? 'border-gray-200/50' : 'border-white/10'}`}
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
                            <div key={m.userId} className={`w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold ring-2 ${theme === 'professional' ? 'ring-gray-100/80' : 'ring-gray-800/80'}`} title={m.userName}>
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
                    const isSelf = msg.userId === userId;
                    if (msg.type === 'system') {
                        return <p key={msg.id} className="text-center text-xs text-gray-500 italic py-2">{msg.text}</p>
                    }
                    if (msg.type === 'image' && msg.payload) {
                        const payload = msg.payload as ImagePayload;
                        return (
                             <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : ''}`}>
                                 {!isSelf && <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" title={msg.userName}></div>}
                                 <div className={`max-w-xs p-2 rounded-2xl shadow-sm border ${ isSelf ? 'bg-blue-500 border-transparent' : (theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-black/20 border-white/10')}`}>
                                     {!isSelf && <p className={`text-xs font-bold mb-1 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>{msg.userName}</p>}
                                     <img src={payload.src} alt={payload.fileName} className="rounded-lg max-h-48" />
                                 </div>
                             </div>
                        )
                    }
                    if (msg.type === 'quiz' && msg.payload) {
                        const payload = msg.payload as QuizPayload;
                        return (
                             <div key={msg.id} className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center font-bold text-sm" title={msg.userName}>
                                    {msg.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm border ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-black/20 backdrop-blur-md border-white/10'}`}>
                                    <p className={`text-xs font-bold mb-1 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>{msg.userName} shared a quiz:</p>
                                    <div className="flex items-center gap-3">
                                        <ClipboardListIcon className={`w-10 h-10 flex-shrink-0 ${theme === 'professional' ? 'text-orange-500' : 'text-violet-400'}`} />
                                        <div>
                                            <h4 className="font-semibold">{payload.topic}</h4>
                                            <p className="text-sm">{payload.mcqs.length} Questions &bull; {payload.difficulty}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveQuiz(payload)} className={`w-full mt-3 p-2 text-sm font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-orange-500' : 'bg-violet-500'}`}>
                                        Start Quiz
                                    </button>
                                </div>
                            </div>
                        )
                    }
                    if (msg.type === 'flashcards' && msg.payload) {
                        const payload = msg.payload as FlashcardPayload;
                        return (
                             <div key={msg.id} className="flex items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center font-bold text-sm" title={msg.userName}>
                                    {msg.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm border ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-black/20 backdrop-blur-md border-white/10'}`}>
                                    <p className={`text-xs font-bold mb-1 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>{msg.userName} shared flashcards:</p>
                                    <div className="flex items-center gap-3">
                                        <LayersIcon className={`w-10 h-10 flex-shrink-0 ${theme === 'professional' ? 'text-sky-500' : 'text-indigo-400'}`} />
                                        <div>
                                            <h4 className="font-semibold">{payload.topic}</h4>
                                            <p className="text-sm">{payload.flashcards.length} Cards</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveFlashcards(payload)} className={`w-full mt-3 p-2 text-sm font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-sky-500' : 'bg-indigo-500'}`}>
                                        View Flashcards
                                    </button>
                                </div>
                            </div>
                        )
                    }
                    if (msg.type === 'text') {
                        return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : ''}`}>
                                 {!isSelf && (
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${msg.isViora ? (theme === 'professional' ? 'bg-orange-500/10' : 'bg-violet-500/20') : 'bg-gray-300 dark:bg-gray-600'}`} title={msg.userName}>
                                        {msg.isViora ? <HumanBrainIcon theme={theme} className="w-5 h-5"/> : msg.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm border ${
                                    isSelf ? 'bg-gradient-to-br from-blue-500 to-sky-500 text-white rounded-br-lg border-transparent' : 
                                    msg.isViora ? (theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-black/30 backdrop-blur-md border-white/15 shadow-[0_0_10px_rgba(192,132,252,0.15)]') : 
                                    (theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-black/20 backdrop-blur-md border-white/10')
                                }`}>
                                    {!isSelf && <p className={`text-xs font-bold mb-1 ${msg.isViora ? (theme === 'professional' ? 'text-orange-600' : 'text-violet-400') : (theme === 'professional' ? 'text-gray-600' : 'text-gray-400')}`}>{msg.userName}</p>}
                                    <MarkdownRenderer text={msg.text || ''} />
                                </div>
                            </div>
                        )
                    }
                    return null;
                })}
                {isVioraTyping && (
                    <div className="flex items-end gap-2">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${theme === 'professional' ? 'bg-orange-500/10' : 'bg-violet-500/20'}`}>
                            <HumanBrainIcon theme={theme} className="w-5 h-5"/>
                        </div>
                        <div className={`p-3 rounded-2xl ${theme === 'professional' ? 'bg-orange-500/10' : 'bg-violet-500/20'}`}>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${theme === 'professional' ? 'bg-orange-400' : 'bg-violet-400'}`}></span>
                                <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${theme === 'professional' ? 'bg-orange-400' : 'bg-violet-400'}`}></span>
                                <span className={`w-2 h-2 rounded-full animate-bounce ${theme === 'professional' ? 'bg-orange-400' : 'bg-violet-400'}`}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>
            {/* Input */}
            <div className={`flex-shrink-0 p-2 border-t bg-transparent ${theme === 'professional' ? 'border-gray-200/50' : 'border-white/10'}`}>
                <div className={`flex items-center gap-2 p-1 rounded-full ${theme === 'professional' ? 'bg-black/5' : 'bg-black/20'}`}>
                    <button onClick={() => imageInputRef.current?.click()} className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-white/10'}`} title="Upload Image">
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    <input
                        type="text"
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {if (e.key === 'Enter') handleSendMessage({ text: messageInput.trim(), type: 'text' })}}
                        placeholder="Type a message..."
                        className="w-full p-2 bg-transparent focus:outline-none"
                    />
                    <button onClick={() => handleSendMessage({ text: messageInput.trim(), type: 'text' })} disabled={!messageInput.trim()} className="p-2 bg-blue-500 text-white rounded-full disabled:bg-gray-400 transition-colors"><SendIcon className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => handleLeaveGroup(false)}>
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
                    bg-transparent
                    ${theme === 'professional' ? 'text-gray-900 border-white/50' : 'text-gray-200 border-white/20'}
                `}
                style={{ touchAction: 'none' }}
            >
                {view === 'landing' ? renderLanding() : renderChat()}
                {activeQuiz && <GroupQuizRunner quiz={activeQuiz} onClose={() => setActiveQuiz(null)} theme={theme} />}
                {activeFlashcards && <GroupFlashcardViewer flashcards={activeFlashcards} onClose={() => setActiveFlashcards(null)} theme={theme} />}
            </div>
        </div>
    );
};

export default VioraGroupChat;