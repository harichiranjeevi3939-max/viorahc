// Fix: Import React to make the React namespace available for types.
import React, { useState, useCallback, useEffect } from 'react';
import type { MCQ, UserAnswer, QuizAttempt, ChatMessage } from '../types';
import { generateTest, generateTopicForContent } from '../services/geminiService';
import { saveQuizAttempt, getStudyProgress } from '../utils/localStorageUtils';

type Mode = 'chat' | 'test' | 'flashcards' | 'test_results' | 'reader';
type Difficulty = 'Basic' | 'Standard' | 'Hard';

interface UseQuizManagerProps {
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setMode: React.Dispatch<React.SetStateAction<Mode>>;
}

export const useQuizManager = ({ setIsLoading, setMessages, setMode }: UseQuizManagerProps) => {
    const [mcqs, setMcqs] = useState<MCQ[]>([]);
    const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map());
    const [testResults, setTestResults] = useState<UserAnswer[]>([]);
    const [currentQuizContext, setCurrentQuizContext] = useState<{ content: string; difficulty: Difficulty } | null>(null);
    const [lastQuizAttempt, setLastQuizAttempt] = useState<QuizAttempt | null>(null);
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

    useEffect(() => {
        const progress = getStudyProgress();
        if (progress.length > 0) {
            setLastQuizAttempt(progress[0]);
        }
    }, []);

    const generateTestFromContent = useCallback(async (content: string, questionCount: number = 10, difficulty: Difficulty = 'Standard') => {
        setIsLoading(true);
        setMessages(prev => [...prev.filter(m => m.id !== 'loading'), { id: self.crypto.randomUUID(), role: 'system', text: `Viora's Creative mode is crafting your ${difficulty} quiz...`, timestamp: Date.now() }]);
        setCurrentQuizContext({ content, difficulty });
        setQuizStartTime(Date.now());

        try {
            const generatedMcqs = await generateTest(content, questionCount, difficulty);
            setMcqs(generatedMcqs);
            setUserAnswers(new Map());
            setTestResults([]);
            setMode('test');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setMode('chat');
            setMessages(prev => [...prev, { id: self.crypto.randomUUID(), role: 'system', text: `Error generating test: ${message}`, timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    }, [setMessages, setIsLoading, setMode]);

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

    const handleRetryLastQuiz = () => {
        if (lastQuizAttempt) {
            generateTestFromContent(
                lastQuizAttempt.sourceContent,
                lastQuizAttempt.totalQuestions,
                lastQuizAttempt.difficulty
            );
        }
    };

    return {
        mcqs,
        userAnswers,
        testResults,
        currentQuizContext,
        lastQuizAttempt,
        quizStartTime,
        generateTestFromContent,
        handleAnswerSelect,
        handleSubmitTest,
        handleRetryLastQuiz,
    };
};