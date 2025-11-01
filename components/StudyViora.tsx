import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateChatResponse, generateTest, generateExplanation, generateFlashcards, generateSummary, generateSuggestions, generateSpeech, extractTextFromFile, generateTopicForContent } from '../services/geminiService';
import VioraReader from './VioraReader';
import LiveConversation from './LiveConversation';
import type { ChatMessage, MCQ, Flashcard, UploadedFile, UserAnswer, QuizAttempt, AppSettings, VioraPersonality } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { saveQuizAttempt, getStudyProgress, getChatHistory, saveChatHistory } from '../utils/localStorageUtils';
import { MarkdownRenderer } from '../utils/markdownUtils';
import { SendIcon, UploadIcon, CloseIcon, HumanBrainIcon, BrainCircuitIcon, CheckCircleIcon, XCircleIcon, FileTextIcon, UserIcon, SummarizeIcon, Volume2Icon, StopCircleIcon, MicrophoneIcon, LightbulbIcon, ConciseIcon } from './icons';
import type { Theme } from '../App';

declare const mammoth: any;

type Mode = 'chat' | 'test' | 'flashcards' | 'test_results' | 'reader';
type Difficulty = 'Basic' | 'Standard' | 'Hard';

interface StudyVioraProps {
    theme: Theme;
    settings: AppSettings;
    onSetTheme: React.Dispatch<React.SetStateAction<Theme>>;
    onSetSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    onShowProgress: (chartType: string | null) => void;
}

const motivationalStarts = [
    { type: 'quote', text: "The secret to getting ahead is getting started. ✨ Let's do this!" },
    { type: 'quote', text: "Believe you can and you're halfway there. 🚀 What are we learning today?" },
    { type: 'fact', text: "Did you know? The human brain contains about 86 billion neurons. Let's put some of yours to work! 🤔" },
    { type: 'fact', text: "Fun fact: Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible! What knowledge can we uncover today?" },
    { type: 'quote', text: "Success is not final, failure is not fatal: it is the courage to continue that counts. Ready to dive in?" },
];

const StudyViora: React.FC<StudyVioraProps> = ({ theme, settings, onSetTheme, onSetSettings, onShowProgress }) => {
    const [mode, setMode] = useState<Mode>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [processingFiles, setProcessingFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const acceptedFileTypes = [
        "image/*",
        "application/pdf",
        "text/plain",
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ].join(',');

    // Reader state
    const [fileForReader, setFileForReader] = useState<UploadedFile | null>(null);
    const [readerScrollPosition, setReaderScrollPosition] = useState<number | null>(null);
    const returnToReaderTimeout = useRef<number | null>(null);

    // Test state
    const [mcqs, setMcqs] = useState<MCQ[]>([]);
    const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
    const [testResults, setTestResults] = useState<UserAnswer[]>([]);
    const [currentQuizContext, setCurrentQuizContext] = useState<{ content: string; difficulty: Difficulty } | null>(null);
    const [lastQuizAttempt, setLastQuizAttempt] = useState<QuizAttempt | null>(null);
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
    
    // Flashcard state
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [flippedCard, setFlippedCard] = useState<string | null>(null);

    // Chat Audio State
    const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    // Live Conversation State
    const [isLiveConversationActive, setIsLiveConversationActive] = useState(false);

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
                isInitial: true
            }]);
        }
        
        const progress = getStudyProgress();
        if (progress.length > 0) {
            setLastQuizAttempt(progress[0]);
        }

        // Cleanup any pending timeouts on unmount
        return () => {
            if (returnToReaderTimeout.current) {
                clearTimeout(returnToReaderTimeout.current);
            }
        };
    }, []);

    useEffect(() => {
        if (mode === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, mode]);
    
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
                // Use Mammoth.js for .docx files for speed
                if (file.type === docxMimeType && typeof mammoth !== 'undefined') {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    return { name: file.name, type: 'text', content: result.value, mimeType: 'text/plain' };
                }
                
                // Use Gemini for .doc files and as a fallback for .docx
                if (file.type === docMimeType || file.type === docxMimeType) {
                     const tempFile: UploadedFile = { name: file.name, type: 'binary', content: await fileToBase64(file), mimeType: file.type };
                     const textContent = await extractTextFromFile(tempFile);
                     if (textContent.startsWith('Error:')) {
                         unsupportedFiles.push(`${file.name} (could not read content)`);
                         return null;
                     }
                     return { name: file.name, type: 'text', content: textContent, mimeType: 'text/plain' };
                }

                // Handle images and PDFs as binary
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    const base64 = await fileToBase64(file);
                    if (file.type === 'application/pdf') hasPdf = true;
                    return { name: file.name, type: 'binary', content: base64, mimeType: file.type };
                }
                
                // Handle plain text
                if (file.type.startsWith('text/plain')) {
                    const text = await file.text();
                    return { name: file.name, type: 'text', content: text, mimeType: file.type };
                }

                unsupportedFiles.push(file.name);
                return null;
// Fix: Replaced unsafe type assertion with a type guard to safely handle unknown error types.
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                console.error(`Error processing file ${file.name}:`, message);
                unsupportedFiles.push(`${file.name} (processing failed)`);
                return null;
            }
        };

        const processingPromises = filesToProcess.map(processFile);
        const results = await Promise.all(processingPromises);
        
        setProcessingFiles(prev => prev.filter(name => !filesToProcess.some(f => f.name === name)));
        
        newUploadedFiles.push(...results.filter((f): f is UploadedFile => f !== null));

        if (unsupportedFiles.length > 0) {
            alert(`Note: The following file(s) were not supported or could not be processed: ${unsupportedFiles.join(', ')}.\n\nTundra-Viora can analyze Images, PDFs, Word Docs, and plain TXT files.`);
        }

        if (newUploadedFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
            const suggestions: string[] = [];
            if (hasPdf || newUploadedFiles.some(f => f.mimeType === 'application/pdf')) {
                suggestions.push("Open in Reader");
            }
            suggestions.push("Summarize this for me", "Create a 10-question quiz from this");

            const systemMessage: ChatMessage = {
                id: self.crypto.randomUUID(),
                role: 'system',
                text: `${newUploadedFiles.length} file(s) ready! What's our next move?`,
                suggestions: suggestions
            };
            setMessages(prev => [...prev.filter(m => !m.isInitial && m.role !== 'system'), systemMessage]);
        }

        if (event.target) event.target.value = '';
    };

    const handleRemoveFile = (fileName: string) => {
        setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleGenerateTestFromContent = useCallback(async (content: string, questionCount: number = 10, difficulty: Difficulty = 'Standard') => {
        setIsLoading(true);
        setMessages(prev => [...prev.filter(m => m.id !== 'loading'), { id: self.crypto.randomUUID(), role: 'system', text: `Viora's ${settings.personality} persona is rapidly crafting your ${difficulty} quiz...` }]);
        setCurrentQuizContext({ content, difficulty });
        setQuizStartTime(Date.now());

        try {
            const generatedMcqs = await generateTest(content, questionCount, difficulty);
            setMcqs(generatedMcqs);
            setUserAnswers(new Map());
            setTestResults([]);
            setMode('test');
        } catch (error) {
            // Fix: Replaced unsafe type assertion with a type guard to safely handle unknown error types.
            const message = error instanceof Error ? error.message : String(error);
            setMode('chat');
            setMessages(prev => [...prev, { id: self.crypto.randomUUID(), role: 'system', text: `Error generating test: ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    }, [settings.personality]);
    
    const handleSendMessage = useCallback(async (messageText?: string) => {
        const textToSend = typeof messageText === 'string' ? messageText : input.trim();
        if (!textToSend && uploadedFiles.length === 0) return;
        
        if(returnToReaderTimeout.current) clearTimeout(returnToReaderTimeout.current);

        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            setCurrentlyPlaying(null);
        }

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        
        const historyBeforeSend = messages.filter(m => !m.isInitial);

        const userMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'user',
            text: textToSend,
            attachments: uploadedFiles,
        };

        const currentHistory = [...historyBeforeSend, userMessage];
        setMessages(currentHistory);
        setMessages(prev => [...prev, { id: 'loading', role: 'model', text: '', isLoading: true }]);
        setIsLoading(true);

        const currentFiles = uploadedFiles;
        const chatHistoryForAPI = historyBeforeSend;
        setInput('');
        setUploadedFiles([]);

        const response = await generateChatResponse(textToSend, currentFiles, chatHistoryForAPI, settings.personality);
        
        if (response.type === 'function_call') {
             if (response.name === 'create_quiz') {
                const contentForCommand = currentFiles.length > 0
                    ? currentFiles.map(f => f.type === 'text' ? f.content : `[Content from file: ${f.name}]`).join('\n\n')
                    : chatHistoryForAPI.filter(m => m.role !== 'system').slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
                
                if (contentForCommand) {
                    const questionCount = Math.min(response.args.questionCount || 10, 25);
                    const difficulty = response.args.difficulty || 'Standard';
                    handleGenerateTestFromContent(contentForCommand, questionCount, difficulty);
                } else {
                    setMessages(prev => [...prev.filter(m => m.id !== 'loading'), { id: self.crypto.randomUUID(), role: 'system', text: "I can create a quiz, but I need some material first! Please upload a file or start a conversation about a topic." }]);
                    setIsLoading(false);
                }
                return;
             }
             if (response.name === 'create_chart') {
                 onShowProgress(response.args.chartType);
                 setMessages(prev => [...prev.filter(m => m.id !== 'loading'), { id: self.crypto.randomUUID(), role: 'system', text: `Sure, here's your progress as a ${response.args.chartType} chart.` }]);
                 setIsLoading(false);
                 return;
             }
             if (response.name === 'control_ui') {
                const { action, value, settingName } = response.args;
                let confirmationText = "Okay, I've made that change for you.";

                if (action === 'set_theme' && (value === 'dark' || value === 'professional')) {
                    onSetTheme(value);
                    confirmationText = `Sure, I've switched to the ${value} theme.`;
                } else if (action === 'set_setting' && settingName) {
                    onSetSettings(prev => ({...prev, [settingName]: value === 'true' ? true : value === 'false' ? false : value}));
                    if (settingName === 'personality') {
                        confirmationText = `Okay, I've switched to my ${value} personality. How can I help you now?`;
                    } else {
                        confirmationText = `Okay, I've turned ${settingName.replace('show', '')} ${value === 'true' ? 'on' : 'off'}.`;
                    }
                }

                setMessages(prev => [...prev.filter(m => m.id !== 'loading'), { id: self.crypto.randomUUID(), role: 'system', text: confirmationText }]);
                setIsLoading(false);
                return;
             }
        }
        
        const modelMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'model',
            text: response.type === 'text' ? response.content : "An unexpected response was received.",
        };
        
        const tempMessages = [...currentHistory.filter(m => m.id !== 'loading'), modelMessage];
        setMessages(tempMessages.map(m => ({ ...m, suggestions: [] }))); // Clear old suggestions
        setIsLoading(false);
        
        if (settings.showSuggestions && settings.personality !== 'concise') { // No suggestions for concise personality
            const suggestions = await generateSuggestions(tempMessages);
            setMessages(prev => prev.map(m => m.id === modelMessage.id ? { ...m, suggestions: suggestions } : m));
        }

    }, [input, uploadedFiles, messages, handleGenerateTestFromContent, onSetTheme, onSetSettings, settings.showSuggestions, settings.personality, onShowProgress]);

    const handleSuggestionClick = (suggestion: string) => {
        if(suggestion === "Open in Reader" && uploadedFiles.length > 0) {
            const pdf = uploadedFiles.find(f => f.mimeType === 'application/pdf');
            if(pdf) {
                setFileForReader(pdf);
                setMode('reader');
                setUploadedFiles([]);
                return;
            }
        }
        handleSendMessage(suggestion);
    };

    const handleExplanationRequest = useCallback(async (textToExplain: string, currentScroll: number) => {
        setReaderScrollPosition(currentScroll);
        setMode('chat');
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update
        
        const existingMessages = messages.filter(m => !m.isInitial);
        const systemMessage: ChatMessage = { id: self.crypto.randomUUID(), role: 'system', text: `Preparing an explanation for you...` };
        setMessages([...existingMessages, systemMessage, { id: 'loading', role: 'model', text: '', isLoading: true }]);
        setIsLoading(true);

        const explanation = await generateExplanation(textToExplain);

        const modelMessage: ChatMessage = {
            id: self.crypto.randomUUID(),
            role: 'model',
            text: explanation,
        };
        
        const tempMessages = [...existingMessages, modelMessage];
        setMessages(tempMessages);
        setIsLoading(false);

        // Set timeout to return to reader
        returnToReaderTimeout.current = window.setTimeout(() => {
            setMode('reader');
            returnToReaderTimeout.current = null;
        }, 6000); // 6 seconds

    }, [messages]);


    const handleGenerateFlashcardsFromContent = useCallback(async (content: string) => {
        setIsLoading(true);
        try {
            const generatedFlashcards = await generateFlashcards(content);
            setFlashcards(generatedFlashcards);
            setFlippedCard(null);
            setMode('flashcards');
        } catch (error) {
            // Fix: The user reported multiple errors related to unsafe error handling. This catch block used an unsafe type assertion. It has been updated to safely handle errors of unknown type.
            const message = error instanceof Error ? error.message : String(error);
            setMode('chat');
            setMessages(prev => [...prev, { id: self.crypto.randomUUID(), role: 'system', text: `Error generating flashcards: ${message}` }]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRetryLastQuiz = () => {
        if (lastQuizAttempt) {
            handleGenerateTestFromContent(
                lastQuizAttempt.sourceContent,
                lastQuizAttempt.totalQuestions,
                lastQuizAttempt.difficulty
            );
        }
    };
    
    const handleReadChatMessage = async (text: string, messageId: string) => {
        if (currentlyPlaying === messageId) {
            audioSourceRef.current?.stop();
            setCurrentlyPlaying(null);
            return;
        }
        
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }

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
        } catch (error) {
            console.error("Failed to play audio:", error);
            setCurrentlyPlaying(null);
        }
    };

    const handleAnswerSelect = (question: string, answer: string) => {
        setUserAnswers(new Map(userAnswers.set(question, answer)));
    };

    const handleSubmitTest = async () => {
        const results = mcqs.map(mcq => {
            const selected = userAnswers.get(mcq.question) || "";
            return {
                question: mcq.question,
                selectedAnswer: selected,
                isCorrect: selected === mcq.correctAnswer,
                correctAnswer: mcq.correctAnswer
            };
        });
        setTestResults(results);
        setMode('test_results');
        
        // Save the attempt to local storage
        if (currentQuizContext) {
            const topic = await generateTopicForContent(currentQuizContext.content);
            const score = results.filter(r => r.isCorrect).length;
            const timeTaken = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
            const newAttempt: QuizAttempt = {
                id: self.crypto.randomUUID(),
                date: Date.now(),
                score,
                totalQuestions: results.length,
                difficulty: currentQuizContext.difficulty,
                results: results,
                sourceContent: currentQuizContext.content,
                timeTaken,
                topic,
            };
            saveQuizAttempt(newAttempt);
            const progress = getStudyProgress();
            if (progress.length > 0) setLastQuizAttempt(progress[0]);
            setQuizStartTime(null);
        }
    };

    const handleShuffleFlashcards = () => {
        setFlashcards(prev => [...prev].sort(() => Math.random() - 0.5));
    };
    
    const PersonalityIndicator: React.FC = () => {
        const personalityInfo: Record<VioraPersonality, { Icon: React.FC<any>; label: string; }> = {
            classic: { Icon: HumanBrainIcon, label: 'Classic' },
            analytical: { Icon: BrainCircuitIcon, label: 'Analytical' },
            creative: { Icon: LightbulbIcon, label: 'Creative' },
            concise: { Icon: ConciseIcon, label: 'Concise' },
        };

        const { Icon, label } = personalityInfo[settings.personality];

        return (
            <div className={`absolute bottom-full left-2 mb-2 px-2 py-1 flex items-center gap-1.5 text-xs rounded-full border transition-all ${theme === 'professional' ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <Icon className="w-3.5 h-3.5" theme={theme} />
                <span className={`font-medium ${theme === 'professional' ? 'text-gray-600' : 'text-gray-300'}`}>{label}</span>
            </div>
        )
    };


    const renderChat = () => (
        <>
            <div className="flex-1 overflow-y-auto px-4 pt-4 flex flex-col min-h-0 w-full max-w-4xl mx-auto">
                <div className="flex-1 flex flex-col justify-end">
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                {msg.role === 'system' ? (
                                    <div className="text-center my-2 animate-slide-in">
                                        <p className={`text-sm italic p-2 rounded-full inline-block px-4 ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10' : 'text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5'}`}>
                                            {msg.text}
                                        </p>
                                        {settings.showSuggestions && msg.suggestions && msg.suggestions.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                                {msg.suggestions.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleSuggestionClick(s)}
                                                        className={`px-3 py-1.5 text-sm rounded-full border transition-all hover:scale-105 ${theme === 'professional' ? 'bg-white/80 hover:bg-white border-gray-300' : 'bg-white/30 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/40 border-black/10 dark:border-white/20'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role !== 'user' ? 'animate-slide-in' : ''}`}>
                                        {msg.role === 'model' && <div className={`p-2 rounded-full flex-shrink-0 ${theme === 'professional' ? 'bg-orange-500/10' : 'bg-purple-500/10 dark:bg-purple-500/20'}`}><HumanBrainIcon className="w-6 h-6" theme={theme} /></div>}
                                        <div className={`max-w-xl p-3.5 rounded-2xl shadow-md group relative ${
                                            msg.role === 'user' 
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-lg' 
                                                : theme === 'professional' ? 'bg-white/90 rounded-tl-lg border border-gray-200' : 'bg-white/40 dark:bg-black/30 backdrop-blur-3xl rounded-tl-lg border border-black/10 dark:border-white/15'
                                        }`}>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mb-2 grid gap-2 grid-cols-2 sm:grid-cols-3">
                                                    {msg.attachments.map((file, index) => (
                                                        <div key={index} className="bg-black/10 dark:bg-black/20 rounded-lg overflow-hidden">
                                                            {file.mimeType?.startsWith('image/')
                                                                ? <img src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} className="object-cover w-full h-24" />
                                                                : <div className="p-2 text-xs text-gray-800 dark:text-white/80 flex flex-col items-center justify-center h-24">
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
                                                    <span className="text-sm thinking-text animate-text-gradient-shine">Viora is thinking...</span>
                                                </div>
                                            ) : (
                                                <div className={`${theme === 'professional' ? 'text-gray-700' : 'text-gray-800 dark:text-gray-200'}`}><MarkdownRenderer text={msg.text} /></div>
                                            )}
                                            
                                            {msg.role === 'model' && !msg.isLoading && msg.text.length > 0 && (
                                                <button 
                                                    onClick={() => handleReadChatMessage(msg.text, msg.id)}
                                                    className={`absolute -bottom-2 -right-2 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 ${theme === 'professional' ? 'bg-white' : 'bg-white dark:bg-gray-800'}`}
                                                    aria-label={currentlyPlaying === msg.id ? "Stop reading" : "Read aloud"}
                                                >
                                                    {currentlyPlaying === msg.id 
                                                        ? <StopCircleIcon className="w-5 h-5 text-red-500" /> 
                                                        : <Volume2Icon className={`w-5 h-5 ${theme === 'professional' ? 'text-gray-500' : 'text-gray-600 dark:text-gray-300'}`} />}
                                                </button>
                                            )}
                                        </div>
                                        {msg.role === 'user' && <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-full flex-shrink-0"><UserIcon className="w-6 h-6 text-blue-500" /></div>}
                                    </div>
                                )}
                                {settings.showSuggestions && msg.role === 'model' && !msg.isInitial && msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="mt-4 pl-14 animate-slide-in space-y-2">
                                        <p className={`text-xs font-semibold ${theme === 'professional' ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Next steps:</p>
                                        <div className="flex flex-wrap gap-2 justify-start">
                                            {msg.suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSuggestionClick(s)}
                                                    className={`px-3 py-1.5 text-sm rounded-full border transition-all hover:scale-105 ${theme === 'professional' ? 'bg-white/80 hover:bg-white border-gray-300' : 'bg-white/30 hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/40 border-black/10 dark:border-white/20'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 w-full px-4 pt-2 pb-4">
                <div className="w-full max-w-3xl mx-auto">
                    {lastQuizAttempt && mode === 'chat' && settings.showRetryQuiz && (
                        <div className="flex justify-center mb-2 animate-slide-in">
                            <button 
                                onClick={handleRetryLastQuiz}
                                disabled={isLoading}
                                className="px-4 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 dark:bg-green-500/10 dark:hover:bg-green-500/20 border border-green-500/20 rounded-full disabled:opacity-50 transition-all hover:scale-105"
                            >
                                Retry Your Last Quiz
                            </button>
                        </div>
                    )}
                    {uploadedFiles.length > 0 && (
                        <div className={`mb-3 p-2 rounded-lg ${theme === 'professional' ? 'bg-gray-200/60' : 'bg-black/10 dark:bg-black/20'}`}>
                            <div className="flex space-x-3 overflow-x-auto pb-2">
                                {uploadedFiles.map(file => (
                                    <div key={file.name} className={`relative flex-shrink-0 w-28 h-20 rounded-lg shadow-md overflow-hidden flex flex-col ${theme === 'professional' ? 'bg-white' : 'bg-white/10 dark:bg-black/20'}`}>
                                        <div className="flex-grow w-full h-full relative">
                                            {file.mimeType?.startsWith('image/') ? (
                                                <img src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex flex-col items-center justify-center p-1 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-800/70 dark:text-white/70'}`}>
                                                    <FileTextIcon className="w-10 h-10"/>
                                                </div>
                                            )}
                                        </div>
                                         <div className="text-xs text-center truncate w-full p-1 bg-black/20 text-white/90">{file.name}</div>
                                        <button onClick={() => handleRemoveFile(file.name)} className="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-red-500 rounded-full text-white transition-colors">
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {processingFiles.length > 0 && (
                        <div className={`mb-3 p-3 rounded-lg animate-pulse ${theme === 'professional' ? 'bg-gray-200/60' : 'bg-black/10 dark:bg-black/20'}`}>
                            <p className={`text-sm text-center ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                Viora is reading {processingFiles.length} file(s): {processingFiles.join(', ')}...
                            </p>
                        </div>
                    )}
                    <div className={`relative flex items-end gap-2 p-2 rounded-2xl shadow-lg transition-colors duration-300 ${theme === 'professional' ? 'bg-white/95 border border-gray-200' : 'bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/15'}`}>
                        <PersonalityIndicator />
                        <button onClick={() => fileInputRef.current?.click()} disabled={processingFiles.length > 0} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'professional' ? 'text-gray-500 hover:text-gray-800' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`} title="Upload File">
                            <UploadIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => setIsLiveConversationActive(true)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${theme === 'professional' ? 'text-gray-500 hover:text-gray-800' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'}`} title="Live Conversation">
                            <MicrophoneIcon className="w-6 h-6" />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="Ask Viora anything, or type 'create a quiz'..."
                            className={`w-full p-1 bg-transparent placeholder-gray-500 resize-none max-h-48 focus:outline-none disabled:opacity-50 ${theme === 'professional' ? 'text-gray-900' : 'text-gray-900 dark:text-white dark:placeholder-gray-400'}`}
                            rows={1}
                            disabled={isLoading || processingFiles.length > 0}
                        />
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept={acceptedFileTypes} />
                        <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && uploadedFiles.length === 0) || processingFiles.length > 0} className={`p-3 text-white bg-gradient-to-br rounded-full disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-70 hover:opacity-90 transition-all ${theme === 'professional' ? 'from-orange-500 to-sky-500' : 'from-purple-500 to-pink-500'}`} title="Send Message">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
    
    const renderTest = () => (
        <div className="flex-1 overflow-y-auto p-6 w-full max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-4 text-center ${theme === 'professional' ? 'text-orange-500' : 'text-purple-400'}`}>Viora Quiz ({currentQuizContext?.difficulty})</h2>
            {mcqs.map((mcq, index) => (
                <div key={index} className={`mb-6 p-4 rounded-lg shadow-md border ${theme === 'professional' ? 'bg-white/50 border-gray-200' : 'bg-white/20 dark:bg-black/20 backdrop-blur-md border-black/10 dark:border-white/10'}`}>
                    <p className="font-semibold mb-3">{index + 1}. <MarkdownRenderer text={mcq.question} /></p>
                    <div className="space-y-2">
                        {mcq.options.map((option, i) => (
                            <label key={i} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${theme === 'professional' ? 'hover:bg-gray-100' : 'hover:bg-white/20 dark:hover:bg-black/20'}`}>
                                <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={option}
                                    checked={userAnswers.get(mcq.question) === option}
                                    onChange={() => handleAnswerSelect(mcq.question, option)}
                                    className={`w-4 h-4 border-gray-300 dark:border-gray-600 ${theme === 'professional' ? 'text-orange-500 focus:ring-orange-500' : 'text-purple-500 focus:ring-purple-500'}`}
                                />
                                <span className={`ml-3 ${theme === 'professional' ? 'text-gray-800' : 'text-gray-800 dark:text-gray-200'}`}><MarkdownRenderer text={option}/></span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex justify-center space-x-4 mt-6">
                <button onClick={() => setMode('chat')} className={`px-6 py-2 rounded-lg transition-colors ${theme === 'professional' ? 'bg-white hover:bg-gray-100 border border-gray-300' : 'bg-white/10 hover:bg-white/20 border border-black/10 dark:border-white/20'}`}>Exit Quiz</button>
                <button onClick={handleSubmitTest} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>Submit Test</button>
            </div>
        </div>
    );

    const renderTestResults = () => {
        const score = testResults.filter(r => r.isCorrect).length;
        return (
            <div className="flex-1 overflow-y-auto p-6 w-full max-w-4xl mx-auto">
                <h2 className={`text-3xl font-bold mb-2 text-center ${theme === 'professional' ? 'text-orange-500' : 'text-purple-400'}`}>Quiz Results</h2>
                <p className="text-center text-xl mb-6 font-semibold">You scored {score} out of {testResults.length}!</p>
                <div className="space-y-4">
                    {testResults.map((result, index) => (
                        <div
                            key={index}
                            onDoubleClick={() => handleExplanationRequest(result.question, 0)}
                            className={`p-4 rounded-lg shadow-md border cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                                result.isCorrect
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                            }`}
                        >
                            <p className="font-semibold mb-3">{index + 1}. <MarkdownRenderer text={result.question} /></p>
                            <div className={`flex items-start p-2 rounded-md ${result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                {result.isCorrect ? (
                                    <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"/>
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"/>
                                )}
                                <div>
                                    <span className="font-bold">Your answer: </span>
                                    <span className={result.isCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300 line-through'}>
                                        <MarkdownRenderer text={result.selectedAnswer || "Not answered"} />
                                    </span>
                                </div>
                            </div>
                            {!result.isCorrect && (
                                <div className="flex items-start p-2 mt-2 rounded-md bg-gray-500/10">
                                     <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"/>
                                     <div>
                                        <span className="font-bold">Correct answer: </span>
                                        <span><MarkdownRenderer text={result.correctAnswer} /></span>
                                     </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-center text-xs text-gray-500 mt-6 italic">(Double-tap a question for a detailed explanation)</p>
                <div className="flex justify-center mt-6 space-x-4">
                     <button onClick={() => setMode('chat')} className={`px-6 py-2 rounded-lg transition-colors ${theme === 'professional' ? 'bg-white hover:bg-gray-100 border border-gray-300' : 'bg-white/10 hover:bg-white/20 border border-black/10 dark:border-white/20'}`}>Exit to Home</button>
                    {currentQuizContext && (
                        <button onClick={() => handleGenerateTestFromContent(currentQuizContext.content, mcqs.length, currentQuizContext.difficulty)} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                           Retry Quiz
                        </button>
                    )}
                </div>
            </div>
        )
    };
    
    const renderFlashcards = () => (
        <div className="flex-1 overflow-y-auto p-6 w-full max-w-6xl mx-auto">
            <h2 className={`text-2xl font-bold mb-4 text-center ${theme === 'professional' ? 'text-sky-500' : 'text-indigo-400'}`}>Viora Flashcards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashcards.map(card => (
                    <div key={card.id} className="[perspective:1000px] h-64 group" onClick={() => setFlippedCard(flippedCard === card.id ? null : card.id)}>
                        <div className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ${flippedCard === card.id ? '[transform:rotateY(180deg)]' : ''}`}>
                            <div className={`absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-white/20 backdrop-blur-md border-black/10 dark:border-white/20'}`}>
                                <p className="font-bold text-lg">{card.term}</p>
                            </div>
                            <div className={`absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-sky-500/20 border-sky-300' : 'bg-indigo-500/20 backdrop-blur-md border-black/10 dark:border-white/20'}`}>
                                <p>{card.definition}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center mt-8 space-x-4">
                <button onClick={handleShuffleFlashcards} className={`px-6 py-2 rounded-lg border transition-colors ${theme === 'professional' ? 'bg-white hover:bg-gray-100 border-gray-300' : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border-black/10 dark:border-white/20'}`}>Shuffle</button>
                <button onClick={() => setMode('chat')} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Exit to Home</button>
            </div>
        </div>
    );
    

    const renderContent = () => {
        switch (mode) {
            case 'reader':
                return fileForReader ? <VioraReader 
                    file={fileForReader}
                    theme={theme}
                    onExplain={handleExplanationRequest}
                    onClose={() => { setMode('chat'); setReaderScrollPosition(null); }} 
                    onGenerateTest={(content, difficulty) => {
                        const qCount = prompt("How many questions? (1-25)", "10");
                        if (qCount) handleGenerateTestFromContent(content, Math.min(25, parseInt(qCount, 10) || 10), difficulty);
                    }}
                    onGenerateFlashcards={handleGenerateFlashcardsFromContent}
                    initialScrollPosition={readerScrollPosition}
                /> : renderChat();
            case 'test': return renderTest();
            case 'test_results': return renderTestResults();
            case 'flashcards': return renderFlashcards();
            case 'chat':
            default:
                return renderChat();
        }
    };

    return (
        <div className="flex-grow w-full flex flex-col h-full">
            <div className="w-full h-full flex flex-col min-h-0 relative">
              {renderContent()}
            </div>
            {isLiveConversationActive && (
                <LiveConversation
                    onClose={() => setIsLiveConversationActive(false)}
                    theme={theme}
                />
            )}
        </div>
    );
};

export default StudyViora;