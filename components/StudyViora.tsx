import React, { useState, useCallback, useEffect, useRef } from 'react';
// Fix: Import ChatMessage type to resolve type errors.
import type { AppSettings, Theme, UploadedFile, Flashcard, ChatMessage } from '../types';
import { generateExplanation, generateFlashcards, generateSummary, generateSimpleExplanation } from '../services/geminiService';
import { useChatManager } from '../hooks/useChatManager';
import { useQuizManager } from '../hooks/useQuizManager';
import ChatView from './chat/ChatView';
import QuizView from './quiz/QuizView';
import QuizResultsView from './quiz/QuizResultsView';
import FlashcardView from './flashcards/FlashcardView';
import VioraReader from './VioraReader';

type Mode = 'chat' | 'test' | 'flashcards' | 'test_results' | 'reader';

interface StudyVioraProps {
    theme: Theme;
    settings: AppSettings;
    onSetTheme: React.Dispatch<React.SetStateAction<Theme>>;
    onSetSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    onShowProgress: (chartType: string | null) => void;
}

const StudyViora: React.FC<StudyVioraProps> = ({ theme, settings, onSetTheme, onSetSettings, onShowProgress }) => {
    const [mode, setMode] = useState<Mode>('chat');
    
    // Fix: Use a ref to break the circular dependency between the two custom hooks.
    const generateTestFromContentRef = useRef<((content: string, questionCount: number, difficulty: 'Basic' | 'Standard' | 'Hard') => Promise<void>) | null>(null);
    
    // Fix: Correctly order hook initializations and destructure setIsLoading.
    const {
        messages,
        setMessages,
        isLoading,
        setIsLoading, // Fix: Destructure setIsLoading to make it available in the component.
        currentPersonality,
        handleSendMessage,
        handleFileChange,
        handleRemoveFile,
        handleSuggestionClick,
        handleReadChatMessage,
        currentlyPlaying,
        uploadedFiles,
        processingFiles,
        fileInputRef,
        input,
        setInput,
        textareaRef
    } = useChatManager({ settings, onSetTheme, onSetSettings, onShowProgress, generateTestFromContent: (...args) => generateTestFromContentRef.current!(...args) });

    const {
        mcqs,
        testResults,
        currentQuizContext,
        lastQuizAttempt,
        handleAnswerSelect,
        handleSubmitTest,
        handleRetryLastQuiz,
        generateTestFromContent,
        userAnswers,
    } = useQuizManager({ setIsLoading, setMessages, setMode });

    // Fix: This effect updates the ref with the function from useQuizManager once it's created.
    useEffect(() => {
        generateTestFromContentRef.current = generateTestFromContent;
    }, [generateTestFromContent]);

    // State managed by the main controller
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [fileForReader, setFileForReader] = useState<UploadedFile | null>(null);
    const [readerScrollPosition, setReaderScrollPosition] = useState<number | null>(null);
    
    const handleGenerateFlashcardsFromContent = useCallback(async (content: string) => {
        setIsLoading(true);
        try {
            const generatedFlashcards = await generateFlashcards(content);
            setFlashcards(generatedFlashcards);
            setMode('flashcards');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setMode('chat');
            setMessages(prev => [...prev, { id: self.crypto.randomUUID(), role: 'system', text: `Error generating flashcards: ${message}`, timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    }, [setMessages, setIsLoading]);

    const handleExplanationRequest = useCallback(async (textToExplain: string, currentScroll: number) => {
        setReaderScrollPosition(currentScroll);
        setMode('chat');
        
        // Wait for UI to switch back to chat view
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const existingMessages = messages.filter(m => !m.isInitial);
        const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: `Viora's Creative mode is preparing an explanation for you...`, timestamp: Date.now() };
        setMessages([...existingMessages, systemMessage, { id: 'loading', role: 'model', text: '', isLoading: true, timestamp: Date.now() }]);
        setIsLoading(true);

        const result = await generateExplanation(textToExplain);

        const modelMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'model',
            text: result.explanation,
            followUpPrompts: result.followUpPrompts,
            personality: 'creative',
            timestamp: Date.now(),
        };
        
        const finalSystemMessage: ChatMessage = {
             id: self.crypto.randomUUID(),
             role: 'system',
             text: `You can return to the Viora Reader at any time.`,
             timestamp: Date.now(),
        };

        setMessages([...existingMessages, modelMessage, finalSystemMessage]);
        setIsLoading(false);

    }, [messages, setMessages, setIsLoading]);

    const handleSimpleExplanationRequest = useCallback(async (textToExplain: string, currentScroll: number) => {
        setReaderScrollPosition(currentScroll);
        setMode('chat');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const existingMessages = messages.filter(m => !m.isInitial);
        const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: `Viora's Creative mode is preparing a simplified explanation...`, timestamp: Date.now() };
        setMessages([...existingMessages, systemMessage, { id: 'loading', role: 'model', text: '', isLoading: true, timestamp: Date.now() }]);
        setIsLoading(true);

        const explanationText = await generateSimpleExplanation(textToExplain);

        const modelMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'model',
            text: explanationText,
            personality: 'creative',
            timestamp: Date.now(),
        };
        
        const finalSystemMessage: ChatMessage = {
             id: self.crypto.randomUUID(),
             role: 'system',
             text: `You can return to the Viora Reader at any time.`,
             timestamp: Date.now(),
        };

        setMessages([...existingMessages, modelMessage, finalSystemMessage]);
        setIsLoading(false);

    }, [messages, setMessages, setIsLoading]);

    // Override suggestion click for reader
    const handleSuggestionClickWithReader = (suggestion: string) => {
        if(suggestion === "Open in Reader" && uploadedFiles.length > 0) {
            // Prioritize PDF/DOC, then text for the reader
            const docFile = uploadedFiles.find(f => f.mimeType === 'application/pdf' || f.mimeType?.includes('word'));
            const textFile = uploadedFiles.find(f => f.mimeType === 'text/plain');

            const fileToOpen = docFile || textFile || uploadedFiles[0];
            if(fileToOpen) {
                setFileForReader(fileToOpen);
                setMode('reader');
                handleRemoveFile(fileToOpen.name, true); // Silently remove file from chat input
                return;
            }
        }
        handleSuggestionClick(suggestion);
    };

    const renderContent = () => {
        // Fix: Moved chatViewProps declaration outside the switch statement to fix scope issue.
        const chatViewProps = {
            messages,
            isLoading,
            currentPersonality,
            theme,
            settings,
            onSendMessage: handleSendMessage,
            onFileChange: handleFileChange,
            onRemoveFile: handleRemoveFile,
            onSuggestionClick: handleSuggestionClickWithReader,
            onReadMessage: handleReadChatMessage,
            currentlyPlaying,
            uploadedFiles,
            processingFiles,
            fileInputRef,
            input,
            setInput,
            textareaRef,
            lastQuizAttempt: lastQuizAttempt,
            onRetryLastQuiz: handleRetryLastQuiz,
        };
        switch (mode) {
            case 'reader':
                return fileForReader ? <VioraReader 
                    file={fileForReader}
                    theme={theme}
                    onExplain={handleExplanationRequest}
                    onSimpleExplain={handleSimpleExplanationRequest}
                    onClose={() => { setMode('chat'); setReaderScrollPosition(null); }} 
                    onGenerateTest={(content, difficulty) => {
                        const qCount = prompt("How many questions? (1-25)", "10");
                        if (qCount) generateTestFromContent(content, Math.min(25, parseInt(qCount, 10) || 10), difficulty);
                    }}
                    onGenerateFlashcards={handleGenerateFlashcardsFromContent}
                    initialScrollPosition={readerScrollPosition}
                /> : <ChatView {...chatViewProps} />;
            case 'test': 
                return <QuizView mcqs={mcqs} userAnswers={userAnswers} onAnswerSelect={handleAnswerSelect} onSubmit={handleSubmitTest} onExit={() => setMode('chat')} theme={theme} currentQuizContext={currentQuizContext} />;
            case 'test_results': 
                return <QuizResultsView results={testResults} onRetry={() => generateTestFromContent(currentQuizContext!.content, mcqs.length, currentQuizContext!.difficulty)} onExit={() => setMode('chat')} onExplainRequest={handleExplanationRequest} theme={theme} />;
            case 'flashcards': 
                return <FlashcardView flashcards={flashcards} setFlashcards={setFlashcards} onExit={() => setMode('chat')} theme={theme} />;
            case 'chat':
            default:
                return <ChatView {...chatViewProps} />;
        }
    };

    return (
        <div className="flex-grow w-full flex flex-col h-full">
            <div className="w-full h-full flex flex-col min-h-0 relative">
              {renderContent()}
            </div>
        </div>
    );
};

export default StudyViora;