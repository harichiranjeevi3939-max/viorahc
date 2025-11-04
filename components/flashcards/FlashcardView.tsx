import React, { useState } from 'react';
import type { Flashcard } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import { ShareIcon } from '../icons';

interface FlashcardViewProps {
    flashcards: Flashcard[];
    setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
    onExit: () => void;
    theme: Theme;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ flashcards, setFlashcards, onExit, theme }) => {
    const [flippedCard, setFlippedCard] = useState<string | null>(null);

    const handleShuffleFlashcards = () => {
        setFlashcards(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 w-full max-w-6xl mx-auto">
            <h2 className={`text-2xl font-bold mb-4 text-center ${theme === 'professional' ? 'text-sky-500' : 'text-indigo-400'}`}>Viora Flashcards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashcards.map(card => (
                    <div key={card.id} className="[perspective:1000px] h-64 group" onClick={() => setFlippedCard(flippedCard === card.id ? null : card.id)}>
                        <div className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ${flippedCard === card.id ? '[transform:rotateY(180deg)]' : ''}`}>
                            <div className={`absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-white/30 backdrop-blur-md border-white/20' : 'bg-black/10 backdrop-blur-md border-white/5'}`}>
                                <p className="font-bold text-lg">{card.term}</p>
                            </div>
                            <div className={`absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-sky-500/10 backdrop-blur-sm border-sky-300/50' : 'bg-indigo-500/10 backdrop-blur-md border-white/10'}`}>
                                <p>{card.definition}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-center mt-8 space-x-4">
                <button onClick={handleShuffleFlashcards} className={`px-6 py-2 rounded-lg border transition-colors ${theme === 'professional' ? 'bg-white/80 hover:bg-white border-gray-300' : 'bg-black/20 hover:bg-black/30 border-white/20'}`}>Shuffle</button>
                <button onClick={onExit} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Exit to Home</button>
                 {/* 
                    Note: Share to Group functionality would require access to group chat context.
                    A prop `onShare` could be passed from the parent component.
                    <button onClick={onShare} className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-opacity hover:opacity-90 ${theme === 'professional' ? 'bg-orange-500' : 'bg-violet-500'}`}>
                       <ShareIcon className="w-5 h-5" /> Share to Group
                    </button>
                */}
            </div>
        </div>
    );
};

export default FlashcardView;