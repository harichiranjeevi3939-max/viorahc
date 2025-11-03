import React, { forwardRef, RefObject, useState } from 'react';
import { HumanBrainIcon, ProgressIcon, SunIcon, MoonIcon, SettingsIcon, UsersIcon, UserIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import type { Theme } from '../App';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  theme: Theme;
  onShowProgress: () => void;
  onToggleTheme: () => void;
  onShowSettings: () => void;
  onShowGroupChat: () => void;
  onShowAuth: () => void;
  progressButtonRef: RefObject<HTMLButtonElement>;
  settingsButtonRef: RefObject<HTMLButtonElement>;
  groupChatButtonRef: RefObject<HTMLButtonElement>;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ theme, onShowProgress, onToggleTheme, onShowSettings, onShowGroupChat, onShowAuth, progressButtonRef, settingsButtonRef, groupChatButtonRef, user }) => {
  const { signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

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
           {user && (
             <>
               <button
                ref={progressButtonRef}
                onClick={onShowProgress}
                className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
                aria-label="Show Progress"
              >
                <ProgressIcon className="w-6 h-6" />
              </button>
              <button
                ref={groupChatButtonRef}
                onClick={onShowGroupChat}
                className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
                aria-label="Viora Group Chat"
              >
                <UsersIcon className="w-6 h-6" />
              </button>
             </>
           )}
           <button
            ref={settingsButtonRef}
            onClick={onShowSettings}
            className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
            aria-label="Show Settings"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
                aria-label="User Menu"
              >
                <UserIcon className="w-6 h-6" />
              </button>
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border overflow-hidden ${theme === 'professional' ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/10'}`}>
                  <div className={`px-4 py-3 border-b ${theme === 'professional' ? 'border-gray-200' : 'border-white/10'}`}>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${theme === 'professional' ? 'hover:bg-gray-100 text-red-600' : 'hover:bg-white/10 text-red-400'}`}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onShowAuth}
              className={`p-2 rounded-full transition-colors ${theme === 'professional' ? 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' : 'text-gray-700 dark:text-gray-300 bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20'}`}
              aria-label="Sign In"
            >
              <UserIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
