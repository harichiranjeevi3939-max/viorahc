import React from 'react';
import type { Theme } from '../App';

export const HumanBrainIcon = (props: React.SVGProps<SVGSVGElement> & { theme?: Theme }) => {
    const { theme = 'dark', ...rest } = props;
    return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...rest}>
        <defs>
            <linearGradient id="brain-gradient-dark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="brain-gradient-professional" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#glow)" fill={theme === 'dark' ? "url(#brain-gradient-dark)" : "url(#brain-gradient-professional)"}>
            <path d="M45.6,23.2c-2.3-3-5.2-4.2-8.8-4.3c-2,0-3.9,0.2-5.7,0.7c-2.9-2.3-6.4-3.5-10.1-3.5c-4.2,0-8,1.6-10.8,4.2 C7.9,22.8,6.4,25.6,6,28.8c-2.2,2-3.5,4.7-3.5,7.6c0,5.8,4.7,10.5,10.5,10.5h0c2.4,0,4.6-0.8,6.4-2.2c1.4,3.1,3.8,5.4,6.7,6.7 c2.4,1,5,1.6,7.7,1.6c6.2,0,11.7-3.2,14.6-8.1c2-1.3,3.7-3,4.9-5.1c2.3-0.1,4.4-1,6-2.5c2.4-2.3,3.8-5.5,3.8-8.9 c0-3.3-1.3-6.4-3.5-8.6C52.2,24.1,49.2,22.8,45.6,23.2z M45.2,42.4c-2.2,3.5-6.3,5.7-10.9,5.7c-2.1,0-4.1-0.5-5.9-1.3 c-2.9-1.3-5.3-3.6-6.6-6.5c-0.6,0.1-1.1,0.2-1.7,0.2c-4.7,0-8.5-3.8-8.5-8.5s3.8-8.5,8.5-8.5c1.6,0,3.1,0.4,4.4,1.2 c2.3-2.9,5.7-4.7,9.6-4.7c3.9,0,7.4,1.8,9.7,4.6c-0.1,0.4-0.1,0.8-0.1,1.2c0,4.7,3.8,8.5,8.5,8.5c0.2,0,0.5,0,0.7-0.1 c-0.5,2.7-1.8,5.2-3.8,6.9C46.5,41.4,45.9,41.9,45.2,42.4z"/>
            <path d="M28.4,22.9c-0.5,1.1-0.8,2.3-0.8,3.6c0,0.9,0.1,1.8,0.4,2.7c-1-0.9-2.2-1.4-3.6-1.4c-3,0-5.5,2.5-5.5,5.5 c0,3,2.5,5.5,5.5,5.5c1.7,0,3.3-0.8,4.3-2.1c0.8,2.2,2,4.2,3.5,5.8c0.8,0.9,1.7,1.6,2.7,2.2c-0.5,1.3-0.8,2.7-0.8,4.1 c0,2.5,1,4.8,2.6,6.5c0,0,0,0,0,0c0.1-1.3,0.4-2.5,0.8-3.7c1.4-3.4,3.7-6.2,6.5-8.2c1.2,1.3,2.8,2.1,4.6,2.1c3,0,5.5-2.5,5.5-5.5 c0-3-2.5-5.5-5.5-5.5c-1.3,0-2.5,0.4-3.4,1.2c-1.8-3.1-4.3-5.6-7.3-7.1c-1.2-0.6-2.5-1-3.8-1.2C30.6,23.3,29.5,23.2,28.4,22.9z"/>
        </g>
    </svg>
)};

export const CosmicBrainIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <defs>
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15A2.5 2.5 0 0 1 9.5 22" stroke="url(#brainGradient)" />
        <path d="M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 2.5 2.5" stroke="url(#brainGradient)" />
        <path d="M12 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="url(#brainGradient)" />
        <path d="M12 17.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" stroke="url(#brainGradient)" />
        <path d="M12 12.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="url(#brainGradient)" />
        <path d="M12 12.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" stroke="url(#brainGradient)" />
        <path d="M12 7.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" stroke="url(#brainGradient)" />
        <path d="M12 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" stroke="url(#brainGradient)" />
    </svg>
);

export const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);

export const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);

export const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
);

export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export const BrainCircuitIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2a4.5 4.5 0 0 0-4.5 4.5v.142a3.5 3.5 0 0 0-3.352 3.351.85.85 0 0 0 .151.642A3.5 3.5 0 0 0 5 14a3.5 3.5 0 0 0 3.5 3.5h.142a4.5 4.5 0 1 0 6.716 0h.142A3.5 3.5 0 0 0 19 14a3.5 3.5 0 0 0-.649-3.358.85.85 0 0 0 .15-.642A3.5 3.5 0 0 0 15.143 6.643V6.5A4.5 4.5 0 0 0 12 2Z"></path><path d="M12 12.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path><path d="M12 12.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z"></path><path d="M15 16a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path><path d="M18 13a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path><path d="M18 9a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path><path d="M15 6a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"></path><path d="M9 16a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Z"></path><path d="M6 13a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Z"></path><path d="M6 9a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Z"></path><path d="M9 6a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1Z"></path></svg>
);

export const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

export const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
);

export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

export const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

export const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

export const SummarizeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"></path><path d="M16 12H8"></path><path d="M16 8H8"></path><path d="M12 16H8"></path></svg>
);

// Viora Reader Icons
export const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);

export const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);

export const HighlightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m18 13-2.5 2.5a3 3 0 1 1-4.2-4.2L13 10"></path><path d="m9 13 2.5-2.5a3 3 0 1 1 4.2 4.2L13 17"></path><path d="M3 21h18"></path><path d="M12.5 3.5c-2 0-3.5 1.5-3.5 3.5 0 2.5 2 4.5 3.5 4.5s3.5-2 3.5-4.5c0-2-1.5-3.5-3.5-3.5z"></path></svg>
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);

export const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

export const ClipboardListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <path d="M12 11h4"></path>
        <path d="M12 16h4"></path>
        <path d="M8 11h.01"></path>
        <path d="M8 16h.01"></path>
    </svg>
);

export const LayersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
);

export const BookmarkIcon = (props: React.SVGProps<SVGSVGElement> & { filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={props.filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
);

export const Volume2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
);

export const StopCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><rect x="9" y="9" width="6" height="6"></rect></svg>
);

export const ProgressIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"></path><path d="M18.7 8a5 5 0 0 1-6.4 0L4 18"></path><path d="M12.5 12.5a2.5 2.5 0 0 1 0-5 .5.5 0 0 1 0 5z"></path></svg>
);

export const MicrophoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
);

export const MicOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
);
