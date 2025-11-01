export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  attachments?: UploadedFile[];
  isLoading?: boolean;
  studyTip?: string;
  suggestions?: string[];
  isInitial?: boolean;
}

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface UserAnswer {
  question: string;
  selectedAnswer: string;
  isCorrect: boolean;
  correctAnswer: string; // Added to show the correct answer in results
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
}

export interface UploadedFile {
    name: string;
    type: 'binary' | 'text';
    content: string; // base64 for binary, text content for text
    mimeType?: string;
}

export type GeminiResponse = 
    | { type: 'text', content: string }
    | { type: 'function_call', name: string, args: any };

export interface QuizAttempt {
  id: string;
  date: number;
  score: number;
  totalQuestions: number;
  difficulty: 'Basic' | 'Standard' | 'Hard';
  results: UserAnswer[];
  sourceContent: string; // Used for "Continue Quiz" feature
  timeTaken: number; // in seconds
  topic?: string;
}

export type VioraPersonality = 'classic' | 'analytical' | 'creative' | 'concise';

export interface AppSettings {
  autoTheme: boolean;
  showSuggestions: boolean;
  showRetryQuiz: boolean;
  personality: VioraPersonality;
}

// Viora Group Chat Types
export interface GroupChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isViora?: boolean;
}

export interface GroupChatMember {
    userId: string;
    userName:string;
}

export interface GroupChatSession {
  id: string; // The join code
  hostId: string;
  members: GroupChatMember[];
  messages: GroupChatMessage[];
  groupIcon: string; // A string to generate a unique SVG pattern
}