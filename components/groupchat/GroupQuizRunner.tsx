import React, { useState } from 'react';
import type { Theme, QuizPayload, UserAnswer } from '../../types';
import { MarkdownRenderer } from '../../utils/markdownUtils';

interface GroupQuizRunnerProps {
    quiz: QuizPayload;
    onClose: () => void;
    theme: Theme;
}

const GroupQuizRunner: React.FC<GroupQuizRunnerProps> = ({ quiz, onClose, theme }) => {
    const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
    const [results, setResults] = useState<UserAnswer[] | null>(null);

    const handleAnswerSelect = (question: string, answer: string) => {
        setUserAnswers(new Map(userAnswers.set(question, answer)));
    };

    const handleSubmit = () => {
        const quizResults = quiz.mcqs.map(mcq => {
            const selected = userAnswers.get(mcq.question) || "";
            return {
                question: mcq.question,
                selectedAnswer: selected,
                isCorrect: selected === mcq.correctAnswer,
                correctAnswer: mcq.correctAnswer
            };
        });
        setResults(quizResults);
    };
    
    const score = results ? results.filter(r => r.isCorrect).length : 0;

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-lg overflow-hidden border ${theme === 'professional' ? 'bg-gray-100/50 backdrop-blur-md border-gray-200' : 'bg-gray-900/50 backdrop-blur-md border-white/10'}`}>
                <div className={`p-4 border-b ${theme === 'professional' ? 'border-gray-200' : 'border-white/10'}`}>
                    <h3 className="font-bold text-lg">{results ? 'Quiz Results' : quiz.topic}</h3>
                    <p className="text-sm text-gray-500">{quiz.mcqs.length} Questions &bull; {quiz.difficulty}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {results ? (
                         <>
                            <p className="text-center text-xl mb-4 font-semibold">You scored {score} out of {results.length}!</p>
                            {results.map((result, index) => (
                                <div key={index} className={`p-3 rounded-lg ${result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <p className="font-semibold mb-2">{index + 1}. <MarkdownRenderer text={result.question}/></p>
                                    {!result.isCorrect && (
                                         <p className="text-sm">
                                            <span className="font-bold">Correct answer: </span>
                                            <span><MarkdownRenderer text={result.correctAnswer} /></span>
                                         </p>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        quiz.mcqs.map((mcq, index) => (
                             <div key={index}>
                                <p className="font-semibold mb-2">{index + 1}. <MarkdownRenderer text={mcq.question} /></p>
                                <div className="space-y-1">
                                    {mcq.options.map((option, i) => (
                                        <label key={i} className={`flex items-center p-2 rounded-lg cursor-pointer ${theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/20'}`}>
                                            <input type="radio" name={`q-${index}`} value={option} onChange={() => handleAnswerSelect(mcq.question, option)} className="mr-2" />
                                            <MarkdownRenderer text={option}/>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className={`p-4 border-t flex justify-end gap-4 ${theme === 'professional' ? 'border-gray-200' : 'border-white/10'}`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg ${theme === 'professional' ? 'bg-gray-200' : 'bg-white/10'}`}>Close</button>
                    {!results && <button onClick={handleSubmit} className={`px-4 py-2 rounded-lg text-white ${theme === 'professional' ? 'bg-orange-500' : 'bg-violet-600'}`}>Submit</button>}
                </div>
            </div>
        </div>
    );
};

export default GroupQuizRunner;