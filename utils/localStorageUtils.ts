import type { QuizAttempt, ChatMessage, AppSettings } from '../types';

const PROGRESS_KEY = 'tundra-viora-progress';
const CHAT_HISTORY_KEY = 'tundra-viora-chat-history';
const SETTINGS_KEY = 'tundra-viora-settings';

// --- App Settings ---
const defaultSettings: AppSettings = {
    autoTheme: true,
    showSuggestions: true,
    showRetryQuiz: true,
    personality: 'classic',
};

export const getAppSettings = (): AppSettings => {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (!data) return defaultSettings;
        // Merge saved settings with defaults to handle new settings in future updates
        return { ...defaultSettings, ...JSON.parse(data) };
    } catch (error) {
        console.error("Error retrieving app settings from local storage:", error);
        return defaultSettings;
    }
};

export const saveAppSettings = (settings: AppSettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving app settings to local storage:", error);
    }
};


// --- Study Progress ---
export const getStudyProgress = (): QuizAttempt[] => {
    try {
        const data = localStorage.getItem(PROGRESS_KEY);
        if (!data) return [];
        const progress = JSON.parse(data) as QuizAttempt[];
        // Sort by date, newest first
        return progress.sort((a, b) => b.date - a.date);
    } catch (error) {
        console.error("Error retrieving study progress from local storage:", error);
        return [];
    }
};

export const saveQuizAttempt = (newAttempt: QuizAttempt): void => {
    try {
        const progress = getStudyProgress();
        // Keep a reasonable limit, e.g., last 50 quizzes
        const updatedProgress = [newAttempt, ...progress].slice(0, 50);
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(updatedProgress));
    } catch (error) {
        console.error("Error saving study progress to local storage:", error);
    }
};

// --- Chat History ---
export const getChatHistory = (): ChatMessage[] => {
    try {
        const data = localStorage.getItem(CHAT_HISTORY_KEY);
        if (!data) return [];
        return JSON.parse(data) as ChatMessage[];
    } catch (error) {
        console.error("Error retrieving chat history from local storage:", error);
        return [];
    }
};

export const saveChatHistory = (history: ChatMessage[]): void => {
    try {
        // Filter out any system messages or loading indicators before saving
        const historyToSave = history.filter(msg => msg.role !== 'system' && !msg.isLoading);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
    } catch (error) {
        console.error("Error saving chat history to local storage:", error);
    }
};