import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StudyViora from './components/StudyViora';
import VioraGroupChat from './components/VioraGroupChat';
import ProgressModal from './components/ProgressModal';
import SettingsModal from './components/SettingsModal';
import { getAppSettings, saveAppSettings, manageUserDataLifecycle } from './utils/localStorageUtils';
// Fix: Import Theme from the centralized types file.
import type { AppSettings, Theme } from './types';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('theme') as Theme) || 'dark');
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false);
  const [chartRequest, setChartRequest] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());
  
  const progressButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const groupChatButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Run data lifecycle management on app startup
    manageUserDataLifecycle();
  }, []);

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


  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-500 bg-transparent ${theme === 'professional' ? 'text-gray-800' : 'text-gray-100'}`}>
      <Header 
        progressButtonRef={progressButtonRef}
        settingsButtonRef={settingsButtonRef}
        groupChatButtonRef={groupChatButtonRef}
        theme={theme} 
        onToggleTheme={handleToggleTheme}
        onShowProgress={() => handleShowProgress()}
        onShowSettings={() => setIsSettingsModalOpen(true)}
        onShowGroupChat={() => setIsGroupChatOpen(true)}
      />
      <main className="flex-grow flex flex-col relative overflow-hidden pt-[61px] -mt-[61px]">
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
    </div>
  );
};

export default App;
