import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StudyViora from './components/StudyViora';
import VioraGroupChat from './components/VioraGroupChat';
import ProgressModal from './components/ProgressModal';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { getAppSettings, saveAppSettings } from './utils/localStorageUtils';
import type { AppSettings } from './types';

export type Theme = 'dark' | 'professional';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('theme') as Theme) || 'dark');
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [chartRequest, setChartRequest] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  const progressButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const groupChatButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);
  
  useEffect(() => {
    if (settings.autoTheme) {
        const hour = new Date().getHours();
        // Professional theme from 6 AM to 6 PM
        if (hour >= 6 && hour < 18) {
            setTheme('professional');
        } else {
            setTheme('dark');
        }
    }
  }, [settings.autoTheme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setSettings(prev => ({...prev, autoTheme: false })); // Manual toggle disables auto-theme
    setTheme(prev => (prev === 'dark' ? 'professional' : 'dark'));
  };
  
  const handleShowProgress = (chartType: string | null = null) => {
    setChartRequest(chartType);
    setIsProgressModalOpen(true);
  };
  
  const handleCloseProgressModal = () => {
    setIsProgressModalOpen(false);
    setChartRequest(null);
    progressButtonRef.current?.focus();
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
    settingsButtonRef.current?.focus();
  };
  
  const handleCloseGroupChat = () => {
    setIsGroupChatOpen(false);
    groupChatButtonRef.current?.focus();
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === 'professional' ? 'bg-white' : 'bg-gray-900'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 ${theme === 'professional' ? 'border-orange-500' : 'border-purple-500'}`}></div>
          <p className={theme === 'professional' ? 'text-gray-600' : 'text-gray-400'}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex flex-col h-screen font-sans overflow-hidden ${theme === 'professional' ? 'text-gray-800' : 'text-gray-900 dark:text-gray-100'}`}>
        <Header
          progressButtonRef={progressButtonRef}
          settingsButtonRef={settingsButtonRef}
          groupChatButtonRef={groupChatButtonRef}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onShowProgress={() => handleShowProgress()}
          onShowSettings={() => setIsSettingsModalOpen(true)}
          onShowGroupChat={() => setIsGroupChatOpen(true)}
          onShowAuth={() => setIsAuthModalOpen(true)}
          user={user}
        />
        <main className="flex-grow flex items-center justify-center relative overflow-hidden pt-[61px]">
          <div className="text-center max-w-md px-4">
            <h2 className={`text-3xl font-bold mb-4 ${theme === 'professional' ? 'text-gray-800' : 'text-gray-900 dark:text-gray-100'}`}>
              Welcome to Tundra-Viora
            </h2>
            <p className={`mb-6 ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
              Your Personal AI Study Assistant. Sign in to get started.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`px-6 py-3 font-bold text-white rounded-lg transition-opacity hover:opacity-90 ${
                theme === 'professional'
                  ? 'bg-gradient-to-br from-orange-500 to-sky-500'
                  : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}
            >
              Sign In / Sign Up
            </button>
          </div>
        </main>
        {isAuthModalOpen && <AuthModal onClose={handleCloseAuthModal} theme={theme} />}
        {isSettingsModalOpen && <SettingsModal onClose={handleCloseSettingsModal} theme={theme} settings={settings} onSettingsChange={setSettings} />}
      </div>
    );
  }


  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden ${theme === 'professional' ? 'text-gray-800' : 'text-gray-900 dark:text-gray-100'}`}>
      <Header
        progressButtonRef={progressButtonRef}
        settingsButtonRef={settingsButtonRef}
        groupChatButtonRef={groupChatButtonRef}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onShowProgress={() => handleShowProgress()}
        onShowSettings={() => setIsSettingsModalOpen(true)}
        onShowGroupChat={() => setIsGroupChatOpen(true)}
        onShowAuth={() => setIsAuthModalOpen(true)}
        user={user}
      />
      <main className="flex-grow flex flex-col relative overflow-hidden pt-[61px] -mt-[61px]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <h1 className={`text-shadow-3d text-[clamp(5rem,30vw,20rem)] font-black text-transparent bg-clip-text bg-gradient-to-br transform -rotate-[20deg] blur-xl animate-pulse ${theme === 'professional' ? 'from-gray-300/50 to-transparent' : 'from-black/15 to-transparent dark:from-white/35 dark:to-transparent'}`}>
                VIORA
            </h1>
        </div>
        <StudyViora 
          theme={theme}
          settings={settings}
          onSetTheme={setTheme}
          onSetSettings={setSettings}
          onShowProgress={handleShowProgress}
        />
      </main>
      {isProgressModalOpen && <ProgressModal onClose={handleCloseProgressModal} theme={theme} defaultChart={chartRequest} />}
      {isSettingsModalOpen && <SettingsModal onClose={handleCloseSettingsModal} theme={theme} settings={settings} onSettingsChange={setSettings} />}
      {isGroupChatOpen && <VioraGroupChat onClose={handleCloseGroupChat} theme={theme} />}
      {isAuthModalOpen && <AuthModal onClose={handleCloseAuthModal} theme={theme} />}
    </div>
  );
};

export default App;
