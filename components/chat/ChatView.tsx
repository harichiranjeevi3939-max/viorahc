import React, { useEffect, useRef } from 'react';
import type { ChatMessage, VioraPersonality, AppSettings, UploadedFile, QuizAttempt } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface ChatViewProps {
    messages: ChatMessage[];
    isLoading: boolean;
    currentPersonality: VioraPersonality;
    theme: Theme;
    settings: AppSettings;
    onSendMessage: (messageText?: string) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (fileName: string) => void;
    onSuggestionClick: (suggestion: string) => void;
    onReadMessage: (text: string, messageId: string) => void;
    currentlyPlaying: string | null;
    uploadedFiles: UploadedFile[];
    processingFiles: string[];
    fileInputRef: React.RefObject<HTMLInputElement>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    lastQuizAttempt: QuizAttempt | null;
    onRetryLastQuiz: () => void;
}

const ChatView: React.FC<ChatViewProps> = (props) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [props.messages]);

    return (
        <>
            <div className="flex-1 overflow-y-auto px-4 pt-4 flex flex-col min-h-0 w-full max-w-4xl mx-auto">
                <div className="flex-1 flex flex-col justify-end">
                    <MessageList
                        messages={props.messages}
                        theme={props.theme}
                        settings={props.settings}
                        onSuggestionClick={props.onSuggestionClick}
                        onReadMessage={props.onReadMessage}
                        currentlyPlaying={props.currentlyPlaying}
                    />
                    <div ref={chatEndRef} />
                </div>
            </div>
            <ChatInput
                isLoading={props.isLoading}
                theme={props.theme}
                settings={props.settings}
                onSendMessage={props.onSendMessage}
                onFileChange={props.onFileChange}
                onRemoveFile={props.onRemoveFile}
                uploadedFiles={props.uploadedFiles}
                processingFiles={props.processingFiles}
                fileInputRef={props.fileInputRef}
                input={props.input}
                setInput={props.setInput}
                textareaRef={props.textareaRef}
                lastQuizAttempt={props.lastQuizAttempt}
                onRetryLastQuiz={props.onRetryLastQuiz}
                currentPersonality={props.currentPersonality}
            />
        </>
    );
};

export default ChatView;