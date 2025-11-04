import React from 'react';
import type { MCQ, UserAnswer } from '../../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../../types';
import { MarkdownRenderer } from '../../utils/markdownUtils';

interface QuizViewProps {
    mcqs: MCQ[];
    userAnswers: Map<string, string>;
    onAnswerSelect: (question: string, answer: string) => void;
    onSubmit: () => void;
    onExit: () => void;
    theme: Theme;
    currentQuizContext: { content: string; difficulty: 'Basic' | 'Standard' | 'Hard' } | null;
}

const QuizView: React.FC<QuizViewProps> = ({ mcqs, userAnswers, onAnswerSelect, onSubmit, onExit, theme, currentQuizContext }) => {
    return (
        <div className="flex-1 overflow-y-auto p-6 w-full max-w-4xl mx-auto">
            <h2 className={`text-2xl font-bold mb-4 text-center ${theme === 'professional' ? 'text-orange-500' : 'text-violet-400'}`}>Viora Quiz ({currentQuizContext?.difficulty})</h2>
            {mcqs.map((mcq, index) => (
                <div key={index} className={`mb-6 p-4 rounded-lg shadow-lg border ${theme === 'professional' ? 'bg-white/20 backdrop-blur-md border-white/20' : 'bg-black/10 backdrop-blur-md border-white/5'}`}>
                    <p className="font-semibold mb-3">{index + 1}. <MarkdownRenderer text={mcq.question} /></p>
                    <div className="space-y-2">
                        {mcq.options.map((option, i) => (
                            <label key={i} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${theme === 'professional' ? 'hover:bg-black/5' : 'hover:bg-black/20'}`}>
                                <input
                                    type="radio"
                                    name={`question-${index}`}
                                    value={option}
                                    checked={userAnswers.get(mcq.question) === option}
                                    onChange={() => onAnswerSelect(mcq.question, option)}
                                    className={`w-4 h-4 border-gray-300 dark:border-gray-600 ${theme === 'professional' ? 'text-orange-500 focus:ring-orange-500' : 'text-violet-500 focus:ring-violet-500'}`}
                                />
                                <span className={`ml-3 ${theme === 'professional' ? 'text-gray-800' : 'text-gray-200'}`}><MarkdownRenderer text={option}/></span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex justify-center space-x-4 mt-6">
                <button onClick={onExit} className={`px-6 py-2 rounded-lg transition-colors border ${theme === 'professional' ? 'bg-white/80 hover:bg-white border-gray-300' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}>Exit Quiz</button>
                <button onClick={onSubmit} className={`px-6 py-2 text-white rounded-lg ${theme === 'professional' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-violet-600 hover:bg-violet-700'}`}>Submit Test</button>
            </div>
        </div>
    );
};

export default QuizView;