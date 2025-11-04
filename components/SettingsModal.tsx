import React, { useRef, useEffect } from 'react';
import type { AppSettings } from '../types';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../types';
import { CloseIcon } from './icons';

interface SettingsModalProps {
    onClose: () => void;
    theme: Theme;
    settings: AppSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
}

interface ToggleProps {
    id: keyof AppSettings;
    label: string;
    description: string;
    checked: boolean;
    onChange: (id: keyof AppSettings, value: boolean) => void;
    theme: Theme;
}

const ToggleSwitch: React.FC<ToggleProps> = ({ id, label, description, checked, onChange, theme }) => (
    <div className="flex justify-between items-center py-4">
        <div>
            <label htmlFor={id} className="font-semibold block cursor-pointer">{label}</label>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                id={id}
                className="sr-only peer" 
                checked={checked}
                onChange={(e) => onChange(id, e.target.checked)}
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${theme === 'professional' ? 'peer-focus:ring-orange-300 peer-checked:bg-orange-500' : 'peer-focus:ring-violet-800 peer-checked:bg-violet-600'}`}></div>
        </div>
    </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, theme, settings, onSettingsChange }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const modalNode = modalRef.current;
        if (!modalNode) return;

        const focusableElements = modalNode.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        firstElement?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift+Tab
                    if (document.activeElement === firstElement) {
                        lastElement?.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement?.focus();
                        e.preventDefault();
                    }
                }
            }
        };
        
        modalNode.addEventListener('keydown', handleKeyDown);

        return () => {
            modalNode.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);
    
    const handleSettingChange = (id: keyof AppSettings, value: boolean) => {
        onSettingsChange(prev => ({...prev, [id]: value}));
    };

    return (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} className={`rounded-xl shadow-2xl max-w-lg w-full relative flex flex-col animate-slide-in transition-colors duration-300 border ${theme === 'professional' ? 'bg-white/40 backdrop-blur-lg border-white/30 text-gray-800' : 'bg-gray-900/50 backdrop-blur-xl border-white/10 text-gray-200'}`} onClick={e => e.stopPropagation()}>
                <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${theme === 'professional' ? 'border-gray-200' : 'border-white/10'}`}>
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className={`p-1 rounded-full ${theme === 'professional' ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><CloseIcon/></button>
                </div>
                <div className="p-6 divide-y divide-gray-200 dark:divide-white/10">
                    <ToggleSwitch 
                        id="enable2CMode"
                        label="Enable Automatic 2C Mode"
                        description="Automatically switch between Classic (fast) and Creative (deep) modes."
                        checked={settings.enable2CMode}
                        onChange={handleSettingChange}
                        theme={theme}
                    />
                    <ToggleSwitch 
                        id="autoTheme"
                        label="Auto Theme Switching"
                        description="Automatically switch themes based on time of day."
                        checked={settings.autoTheme}
                        onChange={handleSettingChange}
                        theme={theme}
                    />
                    <ToggleSwitch 
                        id="showSuggestions"
                        label="AI Suggestions"
                        description="Show 'Next Step' suggestions after Viora's responses."
                        checked={settings.showSuggestions}
                        onChange={handleSettingChange}
                        theme={theme}
                    />
                    <ToggleSwitch 
                        id="showRetryQuiz"
                        label="Show 'Retry Last Quiz' Button"
                        description="Display a shortcut button to retry your most recent quiz."
                        checked={settings.showRetryQuiz}
                        onChange={handleSettingChange}
                        theme={theme}
                    />
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;