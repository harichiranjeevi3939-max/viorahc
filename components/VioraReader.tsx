import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UploadedFile } from '../types';
import { extractTextFromFile, generateSpeech, findKeyPhrases, findAndHighlightAnswers, generateSummary } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { MarkdownRenderer } from '../utils/markdownUtils';
import { PlayIcon, PauseIcon, HighlightIcon, DownloadIcon, CloseIcon, BrainCircuitIcon, ClipboardListIcon, LayersIcon, BookmarkIcon, SummarizeIcon } from './icons';
import type { Theme } from '../App';

type Difficulty = 'Basic' | 'Standard' | 'Hard';
interface VioraReaderProps {
    file: UploadedFile;
    theme: Theme;
    onClose: () => void;
    onExplain: (text: string, currentScroll: number) => void;
    onGenerateTest: (content: string, difficulty: Difficulty) => void;
    onGenerateFlashcards: (content: string) => void;
    initialScrollPosition: number | null;
}

interface SelectionPopup {
    top: number;
    left: number;
    text: string;
}

const ReaderSkeleton: React.FC = () => (
    <div className="p-8 space-y-6">
        <div className="space-y-3">
            <div className="h-4 w-3/4 skeleton-loader rounded"></div>
            <div className="h-4 w-full skeleton-loader rounded"></div>
            <div className="h-4 w-5/6 skeleton-loader rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 w-full skeleton-loader rounded"></div>
            <div className="h-4 w-1/2 skeleton-loader rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 w-full skeleton-loader rounded"></div>
            <div className="h-4 w-full skeleton-loader rounded"></div>
            <div className="h-4 w-3/4 skeleton-loader rounded"></div>
            <div className="h-4 w-5/6 skeleton-loader rounded"></div>
        </div>
    </div>
);


const VioraReader: React.FC<VioraReaderProps> = ({ file, theme, onClose, onExplain, onGenerateTest, onGenerateFlashcards, initialScrollPosition }) => {
    const [text, setText] = useState<string>('');
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [highlights, setHighlights] = useState<string[]>([]);
    const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Bookmarking State
    const [bookmarks, setBookmarks] = useState<Map<number, string>>(new Map()); // Map<paragraphIndex, paragraphText>
    const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);

    // Summary State
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // TTS State
    const [isReading, setIsReading] = useState(false);
    const [sentences, setSentences] = useState<string[]>([]);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const stopReadingRef = useRef<() => void>(() => {});

    useEffect(() => {
        const loadText = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const extractedText = await extractTextFromFile(file);
                setText(extractedText);
                setParagraphs(extractedText.split('\n\n').filter(p => p.trim() !== ''));
                setSentences(extractedText.match(/[^.!?]+[.!?]*/g) || []);
            } catch (e) {
                setError('Failed to extract text from the document.');
            } finally {
                setIsLoading(false);
            }
        };
        loadText();
    }, [file]);
    
    useEffect(() => {
        if (initialScrollPosition && contentRef.current) {
            contentRef.current.scrollTop = initialScrollPosition;
        }
    }, [initialScrollPosition]);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        return () => {
            stopReadingRef.current();
            audioContextRef.current?.close();
        };
    }, []);

    const playNextInQueue = useCallback(() => {
        if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
            isPlayingRef.current = false;
            setIsReading(false);
            setCurrentSentenceIndex(-1);
            return;
        }

        isPlayingRef.current = true;
        const audioBuffer = audioQueueRef.current.shift();
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer!;
        source.connect(audioContextRef.current.destination);
        source.onended = playNextInQueue;
        source.start();
        
        setCurrentSentenceIndex(prev => prev + 1);
    }, []);

    const processAndPlayAudio = useCallback(async (textToRead: string) => {
        if (!audioContextRef.current || !textToRead) return;

        const base64Audio = await generateSpeech(textToRead);
        if (base64Audio) {
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
            audioQueueRef.current.push(audioBuffer);
            if (!isPlayingRef.current) {
                playNextInQueue();
            }
        }
    }, [playNextInQueue]);

    const handleReadAloud = async () => {
        if (isReading) {
            stopReadingRef.current();
            return;
        }
        
        setIsReading(true);
        setCurrentSentenceIndex(0);
        audioQueueRef.current = [];

        let stopped = false;
        stopReadingRef.current = () => {
            stopped = true;
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsReading(false);
            setCurrentSentenceIndex(-1);
        };
        
        for (const sentence of sentences) {
            if (stopped) break;
            await processAndPlayAudio(sentence);
        }
    };

    const toggleBookmark = useCallback((index: number, text: string) => {
        setBookmarks(prev => {
            const newBookmarks = new Map(prev);
            if (newBookmarks.has(index)) {
                newBookmarks.delete(index);
            } else {
                newBookmarks.set(index, text);
            }
            return newBookmarks;
        });
    }, []);

    const handleJumpToBookmark = (index: number) => {
        const element = document.getElementById(`reader-paragraph-${index}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowBookmarksPanel(false);
    };
    
    const handleAutoHighlight = async () => {
        setIsLoading(true);
        const phrases = await findKeyPhrases(text);
        setHighlights(phrases);
        setIsLoading(false);
    };
    
    const handleFindAnswers = async () => {
        setIsLoading(true);
        const answers = await findAndHighlightAnswers(text);
        setHighlights(answers);
        setIsLoading(false);
    };
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `data:${file.mimeType};base64,${file.content}`;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 5) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectionPopup({
                top: rect.bottom + window.scrollY - 60, // Adjust for header height
                left: rect.left + window.scrollX + rect.width / 2,
                text: selection.toString().trim(),
            });
        } else {
            setSelectionPopup(null);
        }
    };
    
    const handleSummarizeDocument = async () => {
        setIsSummaryLoading(true);
        setSummary(null);
        try {
            const generatedSummary = await generateSummary(text);
            setSummary(generatedSummary);
        } catch (e) {
            setSummary("Sorry, I was unable to generate a summary for this document.");
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const getQuizOptionsAndGenerate = (content: string) => {
        const difficultyInput = prompt("Select difficulty: Basic, Standard, or Hard", "Standard")?.toLowerCase();
        let difficulty: Difficulty = 'Standard';
        if (difficultyInput === 'basic') difficulty = 'Basic';
        else if (difficultyInput === 'hard') difficulty = 'Hard';

        onGenerateTest(content, difficulty);
    };


    const renderContent = () => {
        if (isReading) {
             return sentences.map((sentence, index) => (
                <span key={index} className={`transition-colors duration-300 ${index === currentSentenceIndex ? 'bg-purple-500/30' : ''}`}>
                    {sentence}
                </span>
            ));
        }

        return paragraphs.map((paragraph, index) => {
            let paragraphHtml = paragraph;
             if (highlights.length > 0) {
                const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
                sortedHighlights.forEach(phrase => {
                    const regex = new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    paragraphHtml = paragraphHtml.replace(regex, `<mark class="reader-highlight ${theme === 'professional' ? '!bg-orange-400/30' : ''}">$1</mark>`);
                });
            }

            return (
                 <div key={index} id={`reader-paragraph-${index}`} className="group relative pr-4 mb-4">
                    <p className="text-justify" onDoubleClick={() => onExplain(paragraph, contentRef.current?.scrollTop || 0)} dangerouslySetInnerHTML={{ __html: paragraphHtml }} />
                    <button 
                        onClick={() => toggleBookmark(index, paragraph)} 
                        className={`absolute -left-10 top-1 p-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity ${theme === 'professional' ? 'text-orange-400 hover:text-orange-600' : 'text-purple-400 hover:text-purple-600'}`}
                        title={bookmarks.has(index) ? "Remove bookmark" : "Add bookmark"}
                    >
                        <BookmarkIcon filled={bookmarks.has(index)} className="w-5 h-5" />
                    </button>
                </div>
            )
        })
    };

    const BookmarksPanel = () => (
        <div className={`absolute top-0 right-0 h-full w-full max-w-sm shadow-2xl transition-transform duration-300 z-40 ${showBookmarksPanel ? 'translate-x-0' : 'translate-x-full'} ${theme === 'professional' ? 'bg-gray-100/90' : 'bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-xl'}`}>
             <div className={`flex justify-between items-center p-4 border-b ${theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'}`}>
                <h3 className="text-xl font-bold">Bookmarks</h3>
                <button onClick={() => setShowBookmarksPanel(false)} title="Close Panel" className={`p-1 rounded-full ${theme === 'professional' ? 'hover:bg-gray-500/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}><CloseIcon className="w-6 h-6" /></button>
             </div>
             <div className="overflow-y-auto h-[calc(100%-60px)] p-4">
                {bookmarks.size === 0 ? (
                    <p className="text-gray-500 text-center mt-4">No bookmarks yet. Click the bookmark icon next to a paragraph to save it here.</p>
                ) : (
                    <ul className="space-y-3">
                        {Array.from(bookmarks.entries()).sort((a, b) => a[0] - b[0]).map(([index, text]) => (
                            <li key={index} onClick={() => handleJumpToBookmark(index)} className={`p-3 rounded-lg cursor-pointer border transition-colors ${theme === 'professional' ? 'bg-white/80 hover:bg-orange-500/10 border-gray-200' : 'bg-white/50 dark:bg-black/30 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 border-black/10 dark:border-white/15'}`}>
                                <p className="line-clamp-2 text-sm italic">"{text}"</p>
                                <span className={`text-xs font-semibold mt-1 block ${theme === 'professional' ? 'text-orange-600' : 'text-purple-600 dark:text-purple-400'}`}>Paragraph {index + 1}</span>
                            </li>
                        ))}
                    </ul>
                )}
             </div>
        </div>
    );

    const SummaryModal = () => (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSummary(null)}>
            <div className={`rounded-xl shadow-2xl max-w-2xl w-full relative max-h-[80vh] flex flex-col ${theme === 'professional' ? 'bg-white' : 'bg-gray-50 dark:bg-gray-900'}`} onClick={e => e.stopPropagation()}>
                <div className={`p-4 border-b flex justify-between items-center ${theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'}`}>
                    <h2 className="text-xl font-bold">Document Summary</h2>
                    <button onClick={() => setSummary(null)} className={`p-1 rounded-full ${theme === 'professional' ? 'hover:bg-gray-500/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}><CloseIcon/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isSummaryLoading 
                        ? <div className="flex items-center justify-center h-32"><BrainCircuitIcon className="w-8 h-8 animate-spin" /></div>
                        : <MarkdownRenderer text={summary || ''} />
                    }
                </div>
            </div>
        </div>
    );

    return (
        <div className={`w-full h-full flex flex-col relative overflow-hidden animate-slide-in ${theme === 'professional' ? 'bg-gray-50 text-gray-800' : 'bg-gray-50 dark:bg-gray-900/80 text-gray-800 dark:text-gray-200'}`}>
            {/* Header / Toolbar */}
            <div className={`flex-shrink-0 flex items-center justify-between p-2 pl-4 border-b shadow-sm z-20 ${theme === 'professional' ? 'bg-white/90 border-gray-200' : 'bg-white/50 dark:bg-black/50 backdrop-blur-md border-black/10 dark:border-white/10'}`}>
                <div className="flex items-center space-x-2">
                     <div className={`flex items-center space-x-2 p-1.5 rounded-full border ${theme === 'professional' ? 'bg-gray-100 border-gray-200' : 'bg-white/20 dark:bg-black/20 border-black/10 dark:border-white/15'}`}>
                        <button onClick={handleReadAloud} title={isReading ? "Stop Reading" : "Read Aloud"} className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            {isReading ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={handleSummarizeDocument} title="Summarize Document" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <SummarizeIcon className="w-5 h-5" />
                        </button>
                        <div className={`w-px h-6 ${theme === 'professional' ? 'bg-gray-200' : 'bg-black/20 dark:bg-white/20'}`}></div>
                        <button onClick={handleAutoHighlight} title="Auto-Highlight Key Points" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <HighlightIcon className="w-5 h-5 text-yellow-500" />
                        </button>
                        <button onClick={handleFindAnswers} title="Find & Highlight Answers" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <HighlightIcon className="w-5 h-5 text-green-500" />
                        </button>
                        <div className={`w-px h-6 ${theme === 'professional' ? 'bg-gray-200' : 'bg-black/20 dark:bg-white/20'}`}></div>
                        <button onClick={() => setShowBookmarksPanel(true)} title="Show Bookmarks" className={`p-2 rounded-full relative transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <BookmarkIcon className="w-5 h-5" />
                            {bookmarks.size > 0 && <span className={`absolute top-0 right-0 block h-4 w-4 rounded-full text-white text-[10px] ring-2 ${theme === 'professional' ? 'bg-orange-500 ring-white' : 'bg-purple-600 ring-white/50 dark:ring-black/50'}`}>{bookmarks.size}</span>}
                        </button>
                         <button onClick={() => getQuizOptionsAndGenerate(text)} title="Generate Test" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <ClipboardListIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onGenerateFlashcards(text)} title="Create Flashcards" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                            <LayersIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                 <h2 className="text-sm font-bold truncate hidden md:block" title={file.name}>{file.name}</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={handleDownload} title="Download Original File" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} title="Exit Reader" className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}>
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Content */}
            <div ref={contentRef} onMouseUp={handleMouseUp} className={`flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 pl-12 md:pl-16 lg:pl-20 text-lg leading-relaxed ${theme === 'professional' ? 'selection:bg-orange-200' : 'selection:bg-purple-300 dark:selection:bg-purple-700'}`}>
                {isLoading ? <ReaderSkeleton /> : error ? <div className="text-red-500 text-center">{error}</div> : renderContent()}
            </div>
            
            {/* Selection Popup */}
            {selectionPopup && (
                <div 
                    className={`absolute z-30 flex items-center shadow-2xl rounded-lg overflow-hidden border ${theme === 'professional' ? 'bg-white border-gray-200' : 'bg-white dark:bg-gray-800 border-black/10 dark:border-white/15'}`}
                    style={{ top: `${selectionPopup.top + 5}px`, left: `${selectionPopup.left}px`, transform: 'translateX(-50%)' }}
                >
                    <button 
                        onClick={() => { onExplain(selectionPopup.text, contentRef.current?.scrollTop || 0); setSelectionPopup(null); }}
                        className={`px-3 py-2 text-sm transition-colors ${theme === 'professional' ? 'hover:bg-orange-500/10' : 'hover:bg-purple-500/10'}`}
                    >
                        Explain
                    </button>
                    <div className={`w-px h-4 ${theme === 'professional' ? 'bg-gray-200' : 'bg-black/10 dark:bg-white/15'}`}></div>
                    <button 
                        onClick={() => { getQuizOptionsAndGenerate(selectionPopup.text); setSelectionPopup(null); }}
                        className={`px-3 py-2 text-sm transition-colors ${theme === 'professional' ? 'hover:bg-orange-500/10' : 'hover:bg-purple-500/10'}`}
                    >
                        Test on Selection
                    </button>
                </div>
            )}
            
            {/* Bookmarks Panel */}
            <BookmarksPanel />

            {/* Summary Modal */}
            {(summary || isSummaryLoading) && <SummaryModal />}
        </div>
    );
};

export default VioraReader;