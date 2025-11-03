import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CloseIcon, UserIcon } from './icons';
import type { Theme } from '../App';

interface AuthModalProps {
  onClose: () => void;
  theme: Theme;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, theme }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`rounded-xl shadow-2xl max-w-md w-full relative flex flex-col animate-slide-in transition-colors duration-300 ${
          theme === 'professional'
            ? 'bg-white/95 text-gray-800'
            : 'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${
            theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'
          }`}
        >
          <h2 className="text-xl font-bold">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${
              theme === 'professional' ? 'hover:bg-gray-500/10' : 'hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-6">
            <UserIcon className="w-16 h-16 text-gray-400" />
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
              Account created successfully! You can now sign in.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                  theme === 'professional'
                    ? 'bg-white border-gray-300 focus:ring-orange-400'
                    : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-black/20 focus:ring-purple-500'
                }`}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                  theme === 'professional'
                    ? 'bg-white border-gray-300 focus:ring-orange-400'
                    : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-black/20 focus:ring-purple-500'
                }`}
                disabled={loading}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                    theme === 'professional'
                      ? 'bg-white border-gray-300 focus:ring-orange-400'
                      : 'bg-white/5 dark:bg-black/20 border-white/10 dark:border-black/20 focus:ring-purple-500'
                  }`}
                  disabled={loading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full p-3 font-bold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 ${
                theme === 'professional'
                  ? 'bg-gradient-to-br from-orange-500 to-sky-500'
                  : 'bg-gradient-to-br from-purple-600 to-pink-600'
              }`}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setSuccess(false);
              }}
              className={`text-sm ${
                theme === 'professional' ? 'text-orange-600 hover:text-orange-700' : 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
              }`}
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
