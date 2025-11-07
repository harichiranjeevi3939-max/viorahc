// Fix: Import React to make the React namespace available for types.
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateChatResponseStream, generateSuggestions, extractTextFromFile, generateUserProfileSummary } from '../services/geminiService';
import type { ChatMessage, UploadedFile, AppSettings, VioraPersonality, QuizAttempt, Theme } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { getChatHistory, saveChatHistory, getStudyProgress } from '../utils/localStorageUtils';
import { generateSpeech } from '../services/geminiService';

declare const mammoth: any;

const motivationalStarts = [
    { type: 'quote', text: "The secret to getting ahead is getting started. ✨ Let's do this!" },
    { type: 'quote', text: "Believe you can and you're halfway there. 🚀 What are we learning today?" },
    { type: 'fact', text: "Did you know? The human brain contains about 86 billion neurons. Let's put some of yours to work! 🤔" },
];

interface UseChatManagerProps {
    settings: AppSettings;
    onSetTheme: React.Dispatch<React.SetStateAction<Theme>>;
    onSetSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    onShowProgress: (chartType: string | null) => void;
    generateTestFromContent: (content: string, questionCount: number, difficulty: 'Basic' | 'Standard' | 'Hard') => Promise<void>;
    // Fix: Accept shared state from parent to break circular dependency
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useChatManager = ({ 
    settings, 
    onSetTheme, 
    onSetSettings, 
    onShowProgress, 
    generateTestFromContent,
    // Fix: Use state from props
    messages,
    setMessages,
    isLoading,
    setIsLoading
}: UseChatManagerProps) => {
    const [input, setInput] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [processingFiles, setProcessingFiles] = useState<string[]>([]);
    const [currentPersonality, setCurrentPersonality] = useState<VioraPersonality>('classic');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Chat Audio State
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    useEffect(() => {
        const savedHistory = getChatHistory();
        if (savedHistory.length > 0) {
            setMessages(savedHistory);
        } else {
            const start = motivationalStarts[Math.floor(Math.random() * motivationalStarts.length)];
            setMessages([{ 
                id: 'intro', 
                role: 'model', 
                text: `${start.text}\n\nI'm Viora, your study companion. Upload a file or ask me anything to begin!`,
                isInitial: true,
                personality: 'classic',
                timestamp: Date.now(),
            }]);
        }
    }, []);

    useEffect(() => {
        const historyToSave = messages.filter(m => !m.isInitial);
        if (historyToSave.length > 0) {
            saveChatHistory(historyToSave);
        }
    }, [messages]);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        return () => {
            audioSourceRef.current?.stop();
            audioContextRef.current?.close();
        };
    }, []);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newUploadedFiles: UploadedFile[] = [];
        const unsupportedFiles: string[] = [];
        let hasPdf = false;

        const docxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const docMimeType = 'application/msword';

        const filesToProcess = Array.from(files).filter((file: File) => 
            !uploadedFiles.some(f => f.name === file.name) && !processingFiles.includes(file.name)
        );
        
        if (filesToProcess.length === 0) return;

        setProcessingFiles(prev => [...prev, ...filesToProcess.map(f => f.name)]);

        const processFile = async (file: File): Promise<UploadedFile | null> => {
            try {
                if (file.type === docxMimeType && typeof mammoth !== 'undefined') {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    return { name: file.name, type: 'text', content: result.value, mimeType: file.type };
                }
                
                if (file.type === docMimeType || file.type === docxMimeType) {
                     const tempFile: UploadedFile = { name: file.name, type: 'binary', content: await fileToBase64(file), mimeType: file.type };
                     const textContent = await extractTextFromFile(tempFile);
                     if (textContent.startsWith('Error:')) {
                         unsupportedFiles.push(`${file.name} (could not read content)`);
                         return null;
                     }
                     return { name: file.name, type: 'text', content: textContent, mimeType: file.type };
                }

                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    const base64 = await fileToBase64(file);
                    if (file.type === 'application/pdf') hasPdf = true;
                    return { name: file.name, type: 'binary', content: base64, mimeType: file.type };
                }
                
                if (file.type.startsWith('text/plain')) {
                    const text = await file.text();
                    return { name: file.name, type: 'text', content: text, mimeType: file.type };
                }

                unsupportedFiles.push(file.name);
                return null;
// Fix: Explicitly type the caught error to 'any' to avoid issues with 'unknown' type in strict mode.
            } catch (e: any) {
                console.error(`Error processing file ${file.name}:`, e);
                unsupportedFiles.push(`${file.name} (processing failed)`);
                return null;
            }
        };

        const processingPromises = filesToProcess.map(processFile);
        const results = await Promise.all(processingPromises);
        
        setProcessingFiles(prev => prev.filter(name => !filesToProcess.some(f => f.name === name)));
        
        newUploadedFiles.push(...results.filter((f): f is UploadedFile => f !== null));

        if (unsupportedFiles.length > 0) {
            alert(`Note: The following file(s) were not supported or could not be processed: ${unsupportedFiles.join(', ')}.`);
        }

        if (newUploadedFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
            const suggestions: string[] = [];
            if (hasPdf || newUploadedFiles.some(f => f.mimeType?.includes('word') || f.mimeType?.includes('pdf'))) {
                suggestions.push("Open in Reader");
            }
            suggestions.push("Summarize this for me", "Create a 10-question quiz from this");

            const systemMessage: ChatMessage = {
                id: self.crypto.randomUUID(),
                role: 'system',
                text: `${newUploadedFiles.length} file(s) ready! What's our next move?`,
                suggestions: suggestions,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev.filter(m => !m.isInitial && m.role !== 'system'), systemMessage]);
        }

        if (event.target) event.target.value = '';
    };

    const handleRemoveFile = (fileName: string, silent: boolean = false) => {
        setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
        if (!silent && uploadedFiles.length === 1) {
            setMessages(prev => prev.filter(m => m.role !== 'system'));
        }
    };
    
    const handleSendMessage = useCallback(async (messageText?: string) => {
        const textToSend = typeof messageText === 'string' ? messageText : input.trim();
        if (!textToSend && uploadedFiles.length === 0) return;

        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            setCurrentlyPlaying(null);
        }

        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        
        const historyBeforeSend = messages.filter(m => !m.isInitial);

        const userMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'user',
            text: textToSend,
            attachments: uploadedFiles,
            timestamp: Date.now(),
        };
        
        const loadingMessageId = `loading-${self.crypto.randomUUID()}`;
        const modelMessagePlaceholder: ChatMessage = { 
            id: loadingMessageId, 
            role: 'model', 
            text: '', 
            isLoading: true, 
            timestamp: Date.now() 
        };

        setMessages(prev => [...prev, userMessage, modelMessagePlaceholder]);
        setIsLoading(true);

        const currentFiles = uploadedFiles;
        setInput('');
        setUploadedFiles([]);

        const personality = settings.vioraPersonality;
        setCurrentPersonality(personality);
        
        const userProfileSummary = await generateUserProfileSummary(historyBeforeSend, getStudyProgress());
        
        generateChatResponseStream(textToSend, currentFiles, historyBeforeSend, personality, userProfileSummary, {
            onChunk: (textChunk) => {
                setMessages(prev => prev.map(m => 
                    m.id === loadingMessageId 
                    ? { ...m, text: m.text + textChunk, personality: personality } 
                    : m
                ));
            },
            onComplete: async (fullResponse) => {
                 if (fullResponse.functionCalls && fullResponse.functionCalls.length > 0) {
                    const fc = fullResponse.functionCalls[0];
                     if (fc.name === 'create_quiz') {
                        const contentForCommand = currentFiles.length > 0
                            ? currentFiles.map(f => f.type === 'text' ? f.content : `[Content from file: ${f.name}]`).join('\n\n')
                            : historyBeforeSend.filter(m => m.role !== 'system').slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
                        
                        if (contentForCommand) {
                            // Fix: Safely handle and type arguments from the function call.
                            const questionCount = Math.min(Number(fc.args.questionCount) || 10, 25);
                            // Fix: Safely handle 'unknown' type from function call arguments by casting to string.
                            const difficultyArg = String(fc.args.difficulty);
                            const difficulty = (['Basic', 'Standard', 'Hard'].includes(difficultyArg) ? difficultyArg : 'Standard') as 'Basic' | 'Standard' | 'Hard';
                            // Remove the loading placeholder before switching mode
                            setMessages(prev => prev.filter(m => m.id !== loadingMessageId));
                            await generateTestFromContent(contentForCommand, questionCount, difficulty);
                        } else {
                            // Fix: Explicitly type system message object to conform to ChatMessage type.
                            const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: "I need material to create a quiz!", timestamp: Date.now() };
                            setMessages(prev => [...prev.filter(m => m.id !== loadingMessageId), systemMessage]);
                            setIsLoading(false);
                        }
                        return; // Stop further processing
                     }
                     if (fc.name === 'create_chart') {
                         // Fix: Safely handle and type arguments from the function call.
                         onShowProgress(String(fc.args.chartType));
                         const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: `Sure, here's your progress.`, timestamp: Date.now() };
                         setMessages(prev => [...prev.filter(m => m.id !== loadingMessageId), systemMessage]);
                         setIsLoading(false);
                         return;
                     }
                     if (fc.name === 'control_ui') {
                        // Fix: Add type validation for arguments from function call.
                        // Fix: Safely handle 'unknown' type from function call arguments by casting to string.
                        const { action } = fc.args;
                        const value = String(fc.args.value);
                        const settingName = String(fc.args.settingName);
                        let confirmationText = "Okay, I've made that change.";

                        if (action === 'set_theme') {
                           if (value === 'dark' || value === 'professional') {
                                onSetTheme(value as Theme);
                           } else {
                                confirmationText = `Sorry, I can't set the theme to "${value}".`;
                           }
                        }
                        else if (action === 'set_setting') {
                            const validSettings: (keyof AppSettings)[] = ['autoTheme', 'showSuggestions', 'showRetryQuiz', 'vioraPersonality'];
                            const settingNameStr = settingName as keyof AppSettings;

                            if (validSettings.includes(settingNameStr)) {
                                if (settingNameStr === 'vioraPersonality') {
                                    if (value === 'classic' || value === 'creative') {
                                        onSetSettings(prev => ({...prev, vioraPersonality: value}));
                                    } else {
                                        confirmationText = `Sorry, I can't set personality to "${value}".`;
                                    }
                                } else {
                                    onSetSettings(prev => ({...prev, [settingNameStr]: value === 'true'}));
                                }
                            } else {
                                confirmationText = `Sorry, I can't find a setting called "${settingNameStr}".`;
                            }
                        }
                        const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: confirmationText, timestamp: Date.now() };
                        setMessages(prev => [...prev.filter(m => m.id !== loadingMessageId), systemMessage]);
                        setIsLoading(false);
                        return;
                     }
                 }
                
                const finalMessageId = self.crypto.randomUUID();
                setMessages(prev => prev.map(m => 
                    m.id === loadingMessageId 
                    ? { ...m, id: finalMessageId, isLoading: false } 
                    : m
                ));
                setIsLoading(false);
                
                if (settings.showSuggestions) {
                    // Fix: Explicitly type the new message object to ensure 'role' is not inferred as a generic string.
                    const finalModelMessageForHistory: ChatMessage = { id: finalMessageId, role: 'model', text: fullResponse.text, timestamp: Date.now() };
                    const updatedHistory = [...historyBeforeSend, userMessage, finalModelMessageForHistory];
                    const suggestions = await generateSuggestions(updatedHistory);
                    setMessages(prev => prev.map(m => m.id === finalMessageId ? { ...m, suggestions: suggestions } : m));
                }
            },
            // Fix: Explicitly type the error parameter as 'Error' to ensure access to 'error.message' is type-safe.
            onError: (error: Error) => {
                // Fix: Explicitly type the error message object.
                const errorMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: `Sorry, an error occurred: ${error.message}`, timestamp: Date.now() };
                setMessages(prev => prev.filter(m => m.id !== loadingMessageId).concat(errorMessage));
                setIsLoading(false);
            }
        });

    }, [input, uploadedFiles, messages, settings, onSetTheme, onSetSettings, onShowProgress, generateTestFromContent, setMessages, setIsLoading]);

    const handleSuggestionClick = (suggestion: string) => {
        handleSendMessage(suggestion);
    };

    const handleReadChatMessage = async (text: string, messageId: string) => {
        if (currentlyPlaying === messageId) {
            audioSourceRef.current?.stop();
            setCurrentlyPlaying(null);
            return;
        }
        
        if (audioSourceRef.current) audioSourceRef.current.stop();
        setCurrentlyPlaying(messageId);

        try {
            const base64Audio = await generateSpeech(text);
            if (base64Audio && audioContextRef.current) {
                const audioBytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => {
                    setCurrentlyPlaying(prev => (prev === messageId ? null : prev));
                    audioSourceRef.current = null;
                };
                source.start();
                audioSourceRef.current = source;
            } else {
                 setCurrentlyPlaying(null);
            }
// Fix: Explicitly type the caught error to 'any' to avoid issues with 'unknown' type in strict mode.
        } catch (error: any) {
            console.error("Failed to play audio:", error);
            setCurrentlyPlaying(null);
        }
    };

    return {
        input,
        setInput,
        uploadedFiles,
        setUploadedFiles,
        processingFiles,
        currentPersonality,
        fileInputRef,
        textareaRef,
        currentlyPlaying,
        handleSendMessage,
        handleFileChange,
        handleRemoveFile,
        handleSuggestionClick,
        handleReadChatMessage
    };
};