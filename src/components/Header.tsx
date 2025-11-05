import React, { RefObject } from 'react';
import { HumanBrainIcon, ProgressIcon, SunIcon, MoonIcon, SettingsIcon, UsersIcon } from './icons';
// Fix: Corrected the import path for the 'Theme' type.
import type { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  onShowProgress: () => void;
  onToggleTheme: () => void;
  onShowSettings: () => void;
  onShowGroupChat: () => void;
  progressButtonRef: RefObject<HTMLButtonElement>;
  settingsButtonRef: RefObject<HTMLButtonElement>;
  groupChatButtonRef: RefObject<HTMLButtonElement>;
}

const Header: React.FC<HeaderProps> = ({ theme, onShowProgress, onToggleTheme, onShowSettings, onShowGroupChat, progressButtonRef, settingsButtonRef, groupChatButtonRef }) => {
  return (
    <header className={`w-full backdrop-blur-lg z-50 border-b transition-colors duration-300 fixed top-0 left-0 right-0 ${theme === 'professional' ? 'bg-white/20 border-white/20' : 'bg-black/10 border-white/5 shadow-[0_8px_32px_0_rgba(192,132,252,0.1)]'}`}>
       <div className={`absolute bottom-0 left-0 right-0 h-px ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-violet-500/50 to-transparent' : 'bg-transparent'}`}></div>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <HumanBrainIcon className="w-10 h-10" theme={theme} />
          <h1 className={`text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme === 'professional' ? 'from-orange-500 to-sky-500' : 'from-violet-400 to-fuchsia-500'}`}>
            Tundra-Viora
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
           <p className={`text-xs hidden sm:block ${theme === 'professional' ? 'text-gray-500' : 'text-gray-400'}`}>Crafted by Hari chiranjeevi</p>
           <div className={`w-px h-6 hidden sm:block ${theme === 'professional' ? 'bg-gray-300' : 'bg-gray-600'}`}></div>
           <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${theme === 'professional' ? 'text-gray-600 bg-black/5 hover:bg-black/10' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
            aria-label="Toggle Theme"
           >
            {theme === 'professional' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
           </button>
           <button
            ref={progressButtonRef}
            onClick={onShowProgress}
            className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${theme === 'professional' ? 'text-gray-600 bg-black/5 hover:bg-black/10' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
            aria-label="Show Progress"
          >
            <ProgressIcon className="w-6 h-6" />
          </button>
          <button
            ref={groupChatButtonRef}
            onClick={onShowGroupChat}
            className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${theme === 'professional' ? 'text-gray-600 bg-black/5 hover:bg-black/10' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
            aria-label="Viora Group Chat"
          >
            <UsersIcon className="w-6 h-6" />
          </button>
           <button
            ref={settingsButtonRef}
            onClick={onShowSettings}
            className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${theme === 'professional' ? 'text-gray-600 bg-black/5 hover:bg-black/10' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
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