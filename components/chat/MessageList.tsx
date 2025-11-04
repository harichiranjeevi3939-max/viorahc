import React from 'react';
import type { ChatMessage as ChatMessageType, AppSettings } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import ChatMessage from './ChatMessage';

interface MessageListProps {
    messages: ChatMessageType[];
    theme: Theme;
    settings: AppSettings;
    onSuggestionClick: (suggestion: string) => void;
    onReadMessage: (text: string, messageId: string) => void;
    currentlyPlaying: string | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, theme, settings, onSuggestionClick, onReadMessage, currentlyPlaying }) => {
    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <ChatMessage
                    key={msg.id}
                    message={msg}
                    theme={theme}
                    settings={settings}
                    onSuggestionClick={onSuggestionClick}
                    onReadMessage={onReadMessage}
                    currentlyPlaying={currentlyPlaying}
                />
            ))}
        </div>
    );
};

export default MessageList;