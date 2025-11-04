import React, { useState } from 'react';
import type { Theme, FlashcardPayload } from '../../types';

interface GroupFlashcardViewerProps {
    flashcards: FlashcardPayload;
    onClose: () => void;
    theme: Theme;
}

const GroupFlashcardViewer: React.FC<GroupFlashcardViewerProps> = ({ flashcards, onClose, theme }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex(prev => (prev + 1) % flashcards.flashcards.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex(prev => (prev - 1 + flashcards.flashcards.length) % flashcards.flashcards.length);
    };

    const card = flashcards.flashcards[currentIndex];

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-lg">
                <h3 className="font-bold text-lg text-white text-center mb-2">{flashcards.topic}</h3>
                <div className="[perspective:1000px] h-64 w-full" onClick={() => setIsFlipped(!isFlipped)}>
                    <div className={`relative w-full h-full [transform-style:preserve-3d] transition-transform duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                        <div className={`absolute w-full h-full [backface-visibility:hidden] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-white/50 backdrop-blur-md border-gray-200' : 'bg-gray-800/50 backdrop-blur-md border-white/20'}`}>
                            <p className="font-bold text-xl">{card.term}</p>
                        </div>
                        <div className={`absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center p-4 text-center rounded-xl shadow-lg border ${theme === 'professional' ? 'bg-sky-100/50 backdrop-blur-md border-sky-300' : 'bg-indigo-900/50 backdrop-blur-md border-white/20'}`}>
                            <p>{card.definition}</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-4 text-white">
                    <button onClick={handlePrev} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">Prev</button>
                    <span>{currentIndex + 1} / {flashcards.flashcards.length}</span>
                    <button onClick={handleNext} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">Next</button>
                </div>
             </div>
             <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg bg-red-500/50 hover:bg-red-500/80 text-white">Close</button>
        </div>
    );
};

export default GroupFlashcardViewer;