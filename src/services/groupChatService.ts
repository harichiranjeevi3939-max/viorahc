import type { GroupChatSession, GroupChatMessage } from '../types';

const GROUP_CHAT_KEY_PREFIX = 'viora-group-chat-';
const SAVED_GROUPS_KEY = 'viora-saved-groups';

export const generateGroupId = (): string => {
    return String(Math.floor(1000 + Math.random() * 9000));
};

export const getGroupSession = (groupId: string): GroupChatSession | null => {
    try {
        const data = localStorage.getItem(`${GROUP_CHAT_KEY_PREFIX}${groupId}`);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

export const saveGroupSession = (session: GroupChatSession) => {
    try {
        localStorage.setItem(`${GROUP_CHAT_KEY_PREFIX}${session.id}`, JSON.stringify(session));
        window.dispatchEvent(new StorageEvent('storage', {
            key: `${GROUP_CHAT_KEY_PREFIX}${session.id}`,
            newValue: JSON.stringify(session),
        }));
    } catch (e) {
        console.error("Failed to save group session", e);
    }
};

export const addMessageToGroup = (groupId: string, message: GroupChatMessage) => {
    const session = getGroupSession(groupId);
    if (session) {
        session.messages.push(message);
        saveGroupSession(session);
    }
};

export const deleteGroupSession = (groupId: string) => {
     try {
        localStorage.removeItem(`${GROUP_CHAT_KEY_PREFIX}${groupId}`);
        window.dispatchEvent(new StorageEvent('storage', { key: `${GROUP_CHAT_KEY_PREFIX}${groupId}`, newValue: null }));
    } catch (e) {
        console.error("Failed to delete group session", e);
    }
}

export const getSavedGroups = (): string[] => {
    try {
        const data = localStorage.getItem(SAVED_GROUPS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const addSavedGroup = (groupId: string) => {
    try {
        let saved = getSavedGroups();
        saved = saved.filter(id => id !== groupId);
        saved.unshift(groupId);
        saved = saved.slice(0, 5);
        localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error("Failed to add saved group", e);
    }
};

export const removeSavedGroup = (groupId: string) => {
     try {
        let saved = getSavedGroups();
        saved = saved.filter(id => id !== groupId);
        localStorage.setItem(SAVED_GROUPS_KEY, JSON.stringify(saved));
    } catch (e) {
        console.error("Failed to remove saved group", e);
    }
}