import type { QuizAttempt, ChatMessage, AppSettings } from '../types';
import { compressAndEncrypt, decompressAndDecrypt } from './dataManager';

const PROGRESS_KEY = 'viora-data-progress';
const CHAT_HISTORY_KEY = 'viora-data-chat-hot'; // Hot storage (last 30 days)
const CHAT_ARCHIVE_KEY = 'viora-data-chat-archive'; // Archived (30-90 days)
const SETTINGS_KEY = 'tundra-viora-settings';
const ACTIVE_GROUP_ID_KEY = 'viora-active-group-id';
const USER_ID_KEY = 'viora-user-id';

// --- App Settings ---
const defaultSettings: AppSettings = {
    autoTheme: true,
    showSuggestions: true,
    showRetryQuiz: true,
    vioraPersonality: 'classic',
};

export const getAppSettings = (): AppSettings => {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (!data) return defaultSettings;
        return { ...defaultSettings, ...JSON.parse(data) };
    } catch (error) {
        return defaultSettings;
    }
};

export const saveAppSettings = (settings: AppSettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving app settings:", error);
    }
};


// --- Generic Data Getters/Setters ---
const setItem = (key: string, value: any) => {
    try {
        const processedData = compressAndEncrypt(JSON.stringify(value));
        localStorage.setItem(key, processedData);
    } catch (error) {
        console.error(`Error setting item ${key}:`, error);
    }
};

const getItem = <T>(key: string): T | null => {
    try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        return JSON.parse(decompressAndDecrypt(data)) as T;
    } catch (error) {
        console.error(`Error getting item ${key}:`, error);
        localStorage.removeItem(key); // Clear corrupted data
        return null;
    }
};

// --- Study Progress ---
export const getStudyProgress = (): QuizAttempt[] => {
    const progress = getItem<QuizAttempt[]>(PROGRESS_KEY) || [];
    return progress.sort((a, b) => b.date - a.date);
};

export const saveQuizAttempt = (newAttempt: QuizAttempt): void => {
    const progress = getStudyProgress();
    const updatedProgress = [newAttempt, ...progress].slice(0, 50); // Keep last 50
    setItem(PROGRESS_KEY, updatedProgress);
};

// --- Chat History ---
export const getChatHistory = (): ChatMessage[] => {
    const hot = getItem<ChatMessage[]>(CHAT_HISTORY_KEY) || [];
    const archive = getItem<ChatMessage[]>(CHAT_ARCHIVE_KEY) || [];
    return [...hot, ...archive].sort((a,b) => a.timestamp - b.timestamp);
};

export const saveChatHistory = (history: ChatMessage[]): void => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const historyToSave = history.filter(msg => msg.role !== 'system' && !msg.isLoading);

    const hot = historyToSave.filter(m => m.timestamp >= thirtyDaysAgo);
    const archive = historyToSave.filter(m => m.timestamp < thirtyDaysAgo);

    setItem(CHAT_HISTORY_KEY, hot);
    setItem(CHAT_ARCHIVE_KEY, archive);
};


// --- Data Lifecycle Management ---
export const manageUserDataLifecycle = (): void => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    // Manage Chat History
    let hot = getItem<ChatMessage[]>(CHAT_HISTORY_KEY) || [];
    let archive = getItem<ChatMessage[]>(CHAT_ARCHIVE_KEY) || [];

    const toArchive = hot.filter(m => m.timestamp < thirtyDaysAgo);
    hot = hot.filter(m => m.timestamp >= thirtyDaysAgo);

    archive = [...archive, ...toArchive];
    archive = archive.filter(m => m.timestamp >= ninetyDaysAgo);

    setItem(CHAT_HISTORY_KEY, hot);
    setItem(CHAT_ARCHIVE_KEY, archive);

    // Manage Quiz History (prune older than 90 days)
    let progress = getItem<QuizAttempt[]>(PROGRESS_KEY) || [];
    progress = progress.filter(p => p.date >= ninetyDaysAgo);
    setItem(PROGRESS_KEY, progress);
    
    console.log("User data lifecycle managed.");
};


// --- Active Group & User ID ---
export const getActiveGroupId = (): string | null => {
    return localStorage.getItem(ACTIVE_GROUP_ID_KEY);
};

export const setActiveGroupId = (groupId: string): void => {
    localStorage.setItem(ACTIVE_GROUP_ID_KEY, groupId);
};

export const clearActiveGroupId = (): void => {
    localStorage.removeItem(ACTIVE_GROUP_ID_KEY);
};

export const getOrSetUserId = (): string => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
        id = self.crypto.randomUUID();
        localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
};