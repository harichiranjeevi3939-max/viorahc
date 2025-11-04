import React from 'react';
import type { ChatMessage as ChatMessageType, AppSettings } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import { MarkdownRenderer } from '../../utils/markdownUtils';
import { HumanBrainIcon, FileTextIcon, UserIcon, StopCircleIcon, Volume2Icon, LightbulbIcon, BrainCircuitIcon } from '../icons';

interface ChatMessageProps {
    message: ChatMessageType;
    theme: Theme;
    settings: AppSettings;
    onSuggestionClick: (suggestion: string) => void;
    onReadMessage: (text: string, messageId: string) => void;
    currentlyPlaying: string | null;
}

const thinkingTexts = [
    'Viora is thinking...',
    'Consulting sources...',
    'Connecting ideas...',
    'Analyzing context...',
    'Drafting response...',
    'Checking facts...'
];

const ChatMessage: React.FC<ChatMessageProps> = ({ message: msg, theme, settings, onSuggestionClick, onReadMessage, currentlyPlaying }) => {
    
    // Dynamic thinking text without causing re-renders
    const thinkingText = thinkingTexts[Math.floor(Date.now() / 2000) % thinkingTexts.length];

    if (msg.role === 'system') {
        return (
            <div className="text-center my-2 animate-slide-in">
                <p className={`text-sm italic p-2 rounded-full inline-block px-4 ${theme === 'professional' ? 'text-gray-600 bg-black/5' : 'text-gray-400 bg-white/5'}`}>
                    {msg.text}
                </p>
                {settings.showSuggestions && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {msg.suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggestionClick(s)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-all hover:scale-105 ${theme === 'professional' ? 'bg-white/60 hover:bg-white/90 backdrop-blur-sm border-white/20' : 'bg-black/20 hover:bg-black/40 backdrop-blur-sm border-white/20'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div key={msg.id}>
            <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role !== 'user' ? 'animate-slide-in' : ''}`}>
                {msg.role === 'model' && <div className={`p-2 rounded-full flex-shrink-0 ${theme === 'professional' ? 'bg-orange-500/10' : 'bg-violet-500/20'}`}><HumanBrainIcon className="w-6 h-6" theme={theme} /></div>}
                <div className={`max-w-xl p-3.5 rounded-2xl shadow-lg group relative border ${
                    msg.role === 'user' 
                        ? (theme === 'professional' ? 'bg-gradient-to-br from-sky-400 to-blue-500 text-white border-transparent' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent')
                        : theme === 'professional' ? 'bg-white/20 backdrop-blur-lg rounded-tl-lg border-white/20' : 'bg-black/10 backdrop-blur-xl rounded-tl-lg border-white/5 shadow-[0_0_20px_rgba(192,132,252,0.1)]'
                }`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 grid gap-2 grid-cols-2 sm:grid-cols-3">
                            {msg.attachments.map((file, index) => (
                                <div key={index} className="bg-black/10 dark:bg-black/20 rounded-lg overflow-hidden">
                                    {file.mimeType?.startsWith('image/')
                                        ? <img src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} className="object-cover w-full h-24" />
                                        : <div className="p-2 text-xs text-white/80 flex flex-col items-center justify-center h-24">
                                            <FileTextIcon className="w-8 h-8 mb-1" />
                                            <span className="truncate text-center w-full">{file.name}</span>
                                        </div>
                                    }
                                </div>
                            ))}
                        </div>
                    )}
                    {msg.isLoading ? (
                        <div className="flex items-center space-x-3 animate-thinking-v2">
                            <HumanBrainIcon theme={theme} className="w-6 h-6" />
                            <span className="text-sm thinking-text animate-text-gradient-shine">{thinkingText}</span>
                        </div>
                    ) : (
                        <div className={`${theme === 'professional' ? 'text-gray-800' : 'text-gray-200'}`}>
                            <MarkdownRenderer text={msg.text} />
                             {msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                                    <h4 className={`text-sm font-bold mb-2 ${theme === 'professional' ? 'text-orange-600' : 'text-violet-400'}`}>Dive Deeper</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.followUpPrompts.map((prompt, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => onSuggestionClick(prompt)}
                                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${theme === 'professional' ? 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20' : 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20'}`}
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {msg.role === 'model' && !msg.isLoading && msg.text.length > 0 && (
                        <button 
                            onClick={() => onReadMessage(msg.text, msg.id)}
                            className={`absolute -bottom-2 -right-2 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-gray-800/80 border-white/10'}`}
                            aria-label={currentlyPlaying === msg.id ? "Stop reading" : "Read aloud"}
                        >
                            {currentlyPlaying === msg.id 
                                ? <StopCircleIcon className="w-5 h-5 text-red-500" /> 
                                : <Volume2Icon className={`w-5 h-5 ${theme === 'professional' ? 'text-gray-500' : 'text-gray-300'}`} />}
                        </button>
                    )}
                     {settings.enable2CMode && msg.role === 'model' && msg.personality && (
                        <div className={`absolute -top-2 -left-2 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-gray-800/80 border-white/10'}`}>
                            {msg.personality === 'creative' ? <LightbulbIcon className="w-4 h-4 text-yellow-500"/> : <BrainCircuitIcon className="w-4 h-4" />}
                        </div>
                    )}
                </div>
                {msg.role === 'user' && <div className={`p-2 rounded-full flex-shrink-0 ${theme === 'professional' ? 'bg-sky-500/10' : 'bg-blue-500/20'}`}><UserIcon className={`w-6 h-6 ${theme === 'professional' ? 'text-sky-600' : 'text-blue-400'}`} /></div>}
            </div>
            {settings.showSuggestions && msg.role === 'model' && !msg.isInitial && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-4 pl-14 animate-slide-in space-y-2">
                    <p className={`text-xs font-semibold ${theme === 'professional' ? 'text-gray-500' : 'text-gray-400'}`}>Next steps:</p>
                    <div className="flex flex-wrap gap-2 justify-start">
                        {msg.suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggestionClick(s)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition-all hover:scale-105 ${theme === 'professional' ? 'bg-white/60 hover:bg-white/90 backdrop-blur-sm border-white/20' : 'bg-black/20 hover:bg-black/40 backdrop-blur-sm border-white/20'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatMessage;