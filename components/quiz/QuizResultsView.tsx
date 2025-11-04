import React from 'react';
import type { UserAnswer } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import { MarkdownRenderer } from '../../utils/markdownUtils';
import { CheckCircleIcon, XCircleIcon, ShareIcon } from '../icons';

interface QuizResultsViewProps {
    results: UserAnswer[];
    onRetry: () => void;
    onExit: () => void;
    onExplainRequest: (textToExplain: string, currentScroll: number) => void;
    theme: Theme;
}

const QuizResultsView: React.FC<QuizResultsViewProps> = ({ results, onRetry, onExit, onExplainRequest, theme }) => {
    const score = results.filter(r => r.isCorrect).length;
    // Note: Sharing to group functionality would be handled by a parent component
    // that has access to the group chat context. A prop `onShare` could be added.

    return (
        <div className="flex-1 overflow-y-auto p-6 w-full max-w-4xl mx-auto">
            <h2 className={`text-3xl font-bold mb-2 text-center ${theme === 'professional' ? 'text-orange-500' : 'text-violet-400'}`}>Quiz Results</h2>
            <p className="text-center text-xl mb-6 font-semibold">You scored {score} out of {results.length}!</p>
            <div className="space-y-4">
                {results.map((result, index) => (
                    <div
                        key={index}
                        onDoubleClick={() => onExplainRequest(result.question, 0)}
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
                 <button onClick={onExit} className={`px-6 py-2 rounded-lg transition-colors border ${theme === 'professional' ? 'bg-white/80 hover:bg-white border-gray-300' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}>Exit to Home</button>
                 <button onClick={onRetry} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-violet-600 hover:bg-violet-700'}`}>
                       Retry Quiz
                 </button>
            </div>
        </div>
    );
};

export default QuizResultsView;