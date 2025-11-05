// Fix: Added Theme type to be shared across the application.
export type Theme = 'dark' | 'professional';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number; // Added for data lifecycle management
  attachments?: UploadedFile[];
  isLoading?: boolean;
  studyTip?: string;
  suggestions?: string[];
  followUpPrompts?: string[]; // For "Dive Deeper" interactive explanations
  isInitial?: boolean;
  personality?: VioraPersonality;
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

export type VioraPersonality = 'classic' | 'creative';

export interface AppSettings {
  autoTheme: boolean;
  showSuggestions: boolean;
  showRetryQuiz: boolean;
  vioraPersonality: VioraPersonality;
}

// Viora Group Chat Types
export interface QuizPayload {
  topic: string;
  mcqs: MCQ[];
  difficulty: 'Basic' | 'Standard' | 'Hard';
}

export interface FlashcardPayload {
  topic: string;
  flashcards: Flashcard[];
}

export interface ImagePayload {
    src: string; // base64 data URL
    fileName: string;
}

export interface GroupChatMessage {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  isViora?: boolean;
  type: 'text' | 'system' | 'quiz' | 'flashcards' | 'image' | 'canvas';
  text?: string; // Optional for image/interactive messages
  payload?: QuizPayload | FlashcardPayload | ImagePayload | CanvasPayload;
}

export interface CanvasContribution {
    userId: string;
    userName: string;
    text: string;
}

export interface CanvasPayload {
    problem: string;
    contributions: CanvasContribution[];
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