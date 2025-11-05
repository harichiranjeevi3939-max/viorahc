import React from 'react';
import type { UploadedFile, AppSettings, VioraPersonality, QuizAttempt } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import { SendIcon, UploadIcon, CloseIcon, FileTextIcon, BrainCircuitIcon, LightbulbIcon } from '../icons';

interface ChatInputProps {
    isLoading: boolean;
    theme: Theme;
    settings: AppSettings;
    onSendMessage: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (fileName: string) => void;
    uploadedFiles: UploadedFile[];
    processingFiles: string[];
    fileInputRef: React.RefObject<HTMLInputElement>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    lastQuizAttempt: QuizAttempt | null;
    onRetryLastQuiz: () => void;
    currentPersonality: VioraPersonality;
}

const PersonalityIndicator: React.FC<{ theme: Theme, personality: VioraPersonality }> = ({ theme, personality }) => {
    const personalityInfo: Record<VioraPersonality, { Icon: React.FC<any>; label: string; }> = {
        classic: { Icon: BrainCircuitIcon, label: 'Classic' },
        creative: { Icon: LightbulbIcon, label: 'Creative' },
    };

    const { Icon, label } = personalityInfo[personality];

    return (
        <div className={`absolute bottom-full left-2 mb-2 px-2 py-1 flex items-center gap-1.5 text-xs rounded-full border transition-all ${theme === 'professional' ? 'bg-white/60 backdrop-blur-sm border-gray-200' : 'bg-black/20 backdrop-blur-sm border-white/10'}`}>
            <Icon className={`w-3.5 h-3.5 ${personality === 'creative' ? 'text-yellow-500' : ''}`} theme={theme} />
            <span className={`font-medium ${theme === 'professional' ? 'text-gray-600' : 'text-gray-300'}`}>{label}</span>
        </div>
    )
};

const ChatInput: React.FC<ChatInputProps> = (props) => {
    const acceptedFileTypes = [
        "image/*", "application/pdf", "text/plain", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ].join(',');
    
    return (
        <div className="flex-shrink-0 w-full px-4 pt-2 pb-4">
            <div className="w-full max-w-3xl mx-auto">
                {props.lastQuizAttempt && props.settings.showRetryQuiz && (
                    <div className="flex justify-center mb-2 animate-slide-in">
                        <button 
                            onClick={props.onRetryLastQuiz}
                            disabled={props.isLoading}
                            className="px-4 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 dark:bg-green-500/10 dark:hover:bg-green-500/20 border border-green-500/20 text-green-700 dark:text-green-300 rounded-full disabled:opacity-50 transition-all hover:scale-105"
                        >
                            Retry Your Last Quiz
                        </button>
                    </div>
                )}
                {props.uploadedFiles.length > 0 && (
                    <div className={`mb-3 p-2 rounded-lg ${props.theme === 'professional' ? 'bg-black/5' : 'bg-black/20'}`}>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                            {props.uploadedFiles.map(file => (
                                <div key={file.name} className={`relative flex-shrink-0 w-28 h-20 rounded-lg shadow-md overflow-hidden flex flex-col ${props.theme === 'professional' ? 'bg-white/80' : 'bg-black/20'}`}>
                                    <div className="flex-grow w-full h-full relative">
                                        {file.mimeType?.startsWith('image/') ? (
                                            <img src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center p-1 ${props.theme === 'professional' ? 'text-gray-600' : 'text-white/70'}`}>
                                                <FileTextIcon className="w-10 h-10"/>
                                            </div>
                                        )}
                                    </div>
                                     <div className="text-xs text-center truncate w-full p-1 bg-black/20 text-white/90">{file.name}</div>
                                    <button onClick={() => props.onRemoveFile(file.name)} className="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {props.processingFiles.length > 0 && (
                    <div className={`mb-3 p-3 rounded-lg animate-pulse ${props.theme === 'professional' ? 'bg-black/5' : 'bg-black/20'}`}>
                        <p className={`text-sm text-center ${props.theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>
                            Viora is reading {props.processingFiles.length} file(s): {props.processingFiles.join(', ')}...
                        </p>
                    </div>
                )}
                <div className={`relative flex items-end gap-2 p-2 rounded-2xl shadow-lg transition-colors duration-300 border backdrop-blur-lg ${props.theme === 'professional' ? 'bg-white/20 border-white/20' : 'bg-black/10 border-white/5'} ${props.isLoading ? (props.theme === 'professional' ? 'pulsing-border-professional' : 'pulsing-border') : ''}`}>
                    <PersonalityIndicator theme={props.theme} personality={props.currentPersonality} />
                    <button onClick={() => props.fileInputRef.current?.click()} disabled={props.processingFiles.length > 0} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${props.theme === 'professional' ? 'text-gray-500 hover:text-gray-800' : 'text-gray-300 hover:text-white'}`} title="Upload File">
                        <UploadIcon className="w-6 h-6" />
                    </button>
                    <textarea
                        ref={props.textareaRef}
                        value={props.input}
                        onChange={(e) => {
                            props.setInput(e.target.value);
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); props.onSendMessage(); } }}
                        placeholder="Ask Viora anything, or type 'create a quiz'..."
                        className={`w-full p-1 bg-transparent placeholder-gray-500 dark:placeholder-gray-400 resize-none max-h-48 focus:outline-none disabled:opacity-50 ${props.theme === 'professional' ? 'text-gray-900' : 'text-white'}`}
                        rows={1}
                        disabled={props.isLoading || props.processingFiles.length > 0}
                    />
                    <input type="file" ref={props.fileInputRef} onChange={props.onFileChange} className="hidden" multiple accept={acceptedFileTypes} />
                    <button onClick={() => props.onSendMessage()} disabled={props.isLoading || (!props.input.trim() && props.uploadedFiles.length === 0) || props.processingFiles.length > 0} className={`p-3 text-white bg-gradient-to-br rounded-full disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-70 hover:opacity-90 transition-all ${props.theme === 'professional' ? 'from-orange-500 to-sky-500' : 'from-violet-500 to-fuchsia-500'}`} title="Send Message">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;