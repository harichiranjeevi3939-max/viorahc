import React, { useRef, useEffect } from 'react';
import type { AppSettings, VioraPersonality } from '../types';
import type { Theme } from '../App';
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
}

const ToggleSwitch: React.FC<ToggleProps> = ({ id, label, description, checked, onChange }) => (
    <div className="flex justify-between items-center py-4">
        <div>
            <label htmlFor={id} className="font-semibold block cursor-pointer">{label}</label>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                id={id}
                className="sr-only peer" 
                checked={checked}
                onChange={(e) => onChange(id, e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </div>
    </div>
);

const PersonalitySelector: React.FC<{
    theme: Theme;
    current: VioraPersonality;
    onChange: (personality: VioraPersonality) => void;
}> = ({ theme, current, onChange }) => {
    const personalities: { id: VioraPersonality; label: string; description: string; }[] = [
        { id: 'classic', label: 'Viora Classic', description: 'The default balanced and encouraging tutor.' },
        { id: 'analytical', label: 'Analytical', description: 'Precise, logical, and data-driven.' },
        { id: 'creative', label: 'Creative', description: 'Imaginative, using analogies and stories.' },
        { id: 'concise', label: 'Concise', description: 'Fast, direct, and straight to the point.' },
    ];
    return (
        <div className="py-4">
            <h3 className="font-semibold block">AI Personality</h3>
            <p className="text-sm text-gray-500 mb-2">Choose how Viora interacts with you.</p>
            <div className="space-y-2">
                {personalities.map(p => (
                    <label key={p.id} className={`flex items-center p-3 rounded-lg cursor-pointer border transition-colors ${current === p.id ? (theme === 'professional' ? 'bg-orange-500/10 border-orange-500' : 'bg-purple-500/10 border-purple-500') : (theme === 'professional' ? 'bg-gray-100 border-gray-200 hover:bg-gray-200' : 'bg-white/5 dark:bg-black/20 border-transparent hover:bg-white/10 dark:hover:bg-black/30')}`}>
                        <input
                            type="radio"
                            name="personality"
                            value={p.id}
                            checked={current === p.id}
                            onChange={() => onChange(p.id)}
                            className={`w-4 h-4 mr-3 ${theme === 'professional' ? 'text-orange-600 focus:ring-orange-500' : 'text-purple-600 focus:ring-purple-500'}`}
                        />
                        <div>
                            <span className="font-medium">{p.label}</span>
                            <p className={`text-xs ${theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}`}>{p.description}</p>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    )
};


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
    
    const handleSettingChange = (id: keyof AppSettings, value: boolean | VioraPersonality) => {
        onSettingsChange(prev => ({...prev, [id]: value}));
    };

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} className={`rounded-xl shadow-2xl max-w-lg w-full relative flex flex-col animate-slide-in transition-colors duration-300 ${theme === 'professional' ? 'bg-white/95 text-gray-800' : 'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl'}`} onClick={e => e.stopPropagation()}>
                <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'}`}>
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className={`p-1 rounded-full ${theme === 'professional' ? 'hover:bg-gray-500/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}><CloseIcon/></button>
                </div>
                <div className="p-6 divide-y divide-gray-200 dark:divide-white/10">
                    <PersonalitySelector 
                        theme={theme}
                        current={settings.personality}
                        onChange={(p) => handleSettingChange('personality', p)}
                    />
                    <ToggleSwitch 
                        id="autoTheme"
                        label="Auto Theme Switching"
                        description="Automatically switch between light/dark themes based on time of day."
                        checked={settings.autoTheme}
                        onChange={handleSettingChange as (id: keyof AppSettings, value: boolean) => void}
                    />
                    <ToggleSwitch 
                        id="showSuggestions"
                        label="AI Suggestions"
                        description="Show 'Next Step' suggestions after Viora's responses."
                        checked={settings.showSuggestions}
                        onChange={handleSettingChange as (id: keyof AppSettings, value: boolean) => void}
                    />
                    <ToggleSwitch 
                        id="showRetryQuiz"
                        label="Show 'Retry Last Quiz' Button"
                        description="Display a shortcut button to retry your most recent quiz."
                        checked={settings.showRetryQuiz}
                        onChange={handleSettingChange as (id: keyof AppSettings, value: boolean) => void}
                    />
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;