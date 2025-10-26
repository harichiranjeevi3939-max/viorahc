import React, { forwardRef, RefObject } from 'react';
import { HumanBrainIcon, ProgressIcon, SunIcon, MoonIcon, SettingsIcon } from './icons';
import type { Theme } from '../App';

interface HeaderProps {
  theme: Theme;
  onShowProgress: () => void;
  onToggleTheme: () => void;
  onShowSettings: () => void;
  progressButtonRef: RefObject<HTMLButtonElement>;
  settingsButtonRef: RefObject<HTMLButtonElement>;
}

const Header: React.FC<HeaderProps> = ({ theme, onShowProgress, onToggleTheme, onShowSettings, progressButtonRef, settingsButtonRef }) => {
  return (
    <header className={`w-full backdrop-blur-xl shadow-lg z-50 border-b transition-colors duration-300 fixed top-0 left-0 right-0 ${theme === 'professional' ? 'bg-white/80 border-gray-200' : 'bg-white/20 dark:bg-black/20 border-black/15 dark:border-white/15'}`}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <HumanBrainIcon className="w-10 h-10" theme={theme} />
          <h1 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme === 'professional' ? 'from-orange-500 to-sky-500' : 'from-purple-400 to-pink-500'}`}>
            Tundra-Viora
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
           <p className={`text-xs hidden sm:block ${theme === 'professional' ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>Crafted by Hari chiranjeevi</p>
           <div className={`w-px h-6 hidden sm:block ${theme === 'professional' ? 'bg-gray-300' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
           <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
            aria-label="Toggle Theme"
           >
            {theme === 'professional' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
           </button>
           <button
            ref={progressButtonRef}
            onClick={onShowProgress}
            className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
            aria-label="Show Progress"
          >
            <ProgressIcon className="w-6 h-6" />
          </button>
           <button
            ref={settingsButtonRef}
            onClick={onShowSettings}
            className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
            aria-label="Show Settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;