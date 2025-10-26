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
}

export interface AppSettings {
  autoTheme: boolean;
  showSuggestions: boolean;
  showRetryQuiz: boolean;
}