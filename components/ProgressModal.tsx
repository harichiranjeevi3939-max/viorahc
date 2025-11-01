import React, { useState, useEffect, useRef } from 'react';
import { getStudyProgress } from '../utils/localStorageUtils';
import type { QuizAttempt } from '../types';
import { CloseIcon, BrainCircuitIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { MarkdownRenderer } from '../utils/markdownUtils';
import type { Theme } from '../App';

interface ProgressModalProps {
    onClose: () => void;
    theme: Theme;
    defaultChart: string | null;
}

const formatTime = (seconds: number): string => {
    if (seconds === null || seconds < 0) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m > 0 ? `${m} min ` : ''}${s} sec`;
};

// Theme-aware color schemes
const darkThemeColors = {
    score: { high: '#14b8a6', medium: '#38bdf8', low: '#fb923c' },
    difficulty: { Basic: '#14b8a6', Standard: '#38bdf8', Hard: '#f472b6' },
    line: '#c084fc',
};

const professionalThemeColors = {
    score: { high: '#16a34a', medium: '#0ea5e9', low: '#f97316' },
    difficulty: { Basic: '#16a34a', Standard: '#0ea5e9', Hard: '#f97316' },
    line: '#f97316',
};

type ChartType = 'pie' | 'bar' | 'line';
type SortField = 'date' | 'score' | 'topic';
type SortOrder = 'asc' | 'desc';

const ProgressModal: React.FC<ProgressModalProps> = ({ onClose, theme, defaultChart }) => {
    const [progress, setProgress] = useState<QuizAttempt[]>([]);
    const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [hoveredDifficulty, setHoveredDifficulty] = useState<string | null>(null);
    const [chartType, setChartType] = useState<ChartType>( (defaultChart as ChartType) || 'bar');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const colors = theme === 'professional' ? professionalThemeColors : darkThemeColors;

    const getScoreBarColor = (score: number, total: number) => {
        const percentage = total > 0 ? (score / total) * 100 : 0;
        if (percentage >= 80) return colors.score.high;
        if (percentage >= 50) return colors.score.medium;
        return colors.score.low;
    };

    useEffect(() => {
        setProgress(getStudyProgress());
    }, []);
    
    const sortedProgress = [...progress].sort((a, b) => {
        if (sortField === 'date') {
            return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
        }
        if (sortField === 'score') {
            const scoreA = a.totalQuestions > 0 ? a.score / a.totalQuestions : 0;
            const scoreB = b.totalQuestions > 0 ? b.score / b.totalQuestions : 0;
            return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
        if (sortField === 'topic') {
            if (a.topic && !b.topic) return -1;
            if (!a.topic && b.topic) return 1;
            if (!a.topic && !b.topic) return 0;
            
            const comparison = a.topic!.localeCompare(b.topic!);
            return sortOrder === 'asc' ? comparison : -comparison;
        }
        return 0;
    });

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
                if (e.shiftKey) { // Shift+Tab
                    if (document.activeElement === firstElement) {
                        lastElement?.focus();
                        e.preventDefault();
                    }
                } else { // Tab
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

    const totalQuizzes = progress.length;
    const averageScore = totalQuizzes > 0 
        ? (progress.reduce((acc, p) => acc + (p.totalQuestions > 0 ? p.score / p.totalQuestions : 0), 0) / totalQuizzes) * 100
        : 0;

    // Chart Data
    const difficultyCounts = progress.reduce((acc, p) => {
        acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
        return acc;
    }, {} as Record<'Basic' | 'Standard' | 'Hard', number>);
    
    // Fix: Refactored to avoid side effects in .map() for better code clarity and to resolve potential linter issues.
    const difficultyData = (() => {
        let cumulativePercent = 0;
        return Object.entries(difficultyCounts).map(([key, value]) => {
            const percent = totalQuizzes > 0 ? (value / totalQuizzes) * 100 : 0;
            const color = colors.difficulty[key as keyof typeof colors.difficulty];
            const result = {
                key,
                value,
                percent,
                color,
                startAngle: (cumulativePercent / 100) * 360,
                endAngle: ((cumulativePercent + percent) / 100) * 360,
            };
            cumulativePercent += percent;
            return result;
        });
    })();
    
    const recentScores = progress.slice(0, 7).reverse();

    const renderCharts = () => {
        if (chartType === 'pie') {
            return (
                <div className="flex justify-center items-center gap-6">
                    <div className="relative w-28 h-28">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                            {difficultyData.map(d => (
                                <circle
                                    key={d.key}
                                    cx="18"
                                    cy="18"
                                    r="15.9"
                                    fill="transparent"
                                    stroke={d.color}
                                    strokeWidth="4"
                                    strokeDasharray={`${d.percent} 100`}
                                    strokeDashoffset={-(d.startAngle * 100 / 360)}
                                    className={`transition-all duration-300 ${hoveredDifficulty === d.key ? 'opacity-100' : 'opacity-70'}`}
                                />
                            ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{totalQuizzes}</span>
                            <span className="text-xs text-gray-500">Total</span>
                            {hoveredDifficulty && (
                                <div className="absolute bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10">
                                    {difficultyCounts[hoveredDifficulty as keyof typeof difficultyCounts]} quizzes ({((difficultyCounts[hoveredDifficulty as keyof typeof difficultyCounts] / totalQuizzes) * 100).toFixed(0)}%)
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <ul className="space-y-1 text-sm">
                        {difficultyData.length > 0 ? difficultyData.map(d => (
                            <li key={d.key} className="flex items-center cursor-pointer" onMouseEnter={() => setHoveredDifficulty(d.key)} onMouseLeave={() => setHoveredDifficulty(null)}>
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: d.color }}></span>
                                <span>{d.key}: <strong>{d.value}</strong></span>
                            </li>
                        )) : <li className="text-gray-500">No data</li>}
                    </ul>
                </div>
            )
        }
        if (chartType === 'line') {
             const svgHeight = 100 / 3;
             return (
                 <div className="h-40 w-full pr-4">
                     <svg width="100%" height="100%" viewBox={`0 0 100 ${svgHeight}`}>
                        {/* Y Axis */}
                        <text x="0" y="3" fontSize="3" fill={theme === 'professional' ? '#6b7280' : '#9ca3af'}>100%</text>
                        <text x="0" y={`${svgHeight / 2 + 1.5}`} fontSize="3" fill={theme === 'professional' ? '#6b7280' : '#9ca3af'}>50%</text>
                        <text x="0" y={`${svgHeight}`} fontSize="3" fill={theme === 'professional' ? '#6b7280' : '#9ca3af'}>0%</text>
                        <line x1="8" y1="0" x2="8" y2={`${svgHeight}`} stroke={theme === 'professional' ? '#e5e7eb' : '#374151'} strokeWidth="0.2"/>
                        <line x1="8" y1={`${svgHeight}`} x2="100" y2={`${svgHeight}`} stroke={theme === 'professional' ? '#e5e7eb' : '#374151'} strokeWidth="0.2"/>
                        
                        {/* Line and Points */}
                        {recentScores.length > 1 && (
                            <polyline
                                fill="none"
                                stroke={colors.line}
                                strokeWidth="0.5"
                                points={recentScores.map((attempt, i) => {
                                    const x = 8 + (92 / (recentScores.length - 1)) * i;
                                    const percentage = attempt.totalQuestions > 0 ? (attempt.score / attempt.totalQuestions * 100) : 0;
                                    const y = (100 - percentage) * svgHeight / 100;
                                    return `${x},${y}`;
                                }).join(' ')}
                            />
                        )}
                        {recentScores.map((attempt, i) => {
                            const x = 8 + (recentScores.length > 1 ? (92 / (recentScores.length - 1)) * i : 46);
                            const percentage = attempt.totalQuestions > 0 ? (attempt.score / attempt.totalQuestions * 100) : 0;
                            const y = (100 - percentage) * svgHeight / 100;
                            return (
                                <g key={attempt.id} className="group">
                                    <circle cx={x} cy={y} r="1" fill={colors.line} className="cursor-pointer" />
                                     <text x={x} y={y - 2} fontSize="3" fill={theme === 'professional' ? '#374151' : '#f3f4f6'} textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {`${percentage.toFixed(0)}%`}
                                    </text>
                                </g>
                            )
                        })}
                     </svg>
                 </div>
             )
        }
        // Default to bar chart
        return (
            <div className={`h-32 flex items-end justify-around gap-2 px-2 border-b border-l relative pl-10 ${theme === 'professional' ? 'border-gray-300' : 'border-gray-500/20'}`}>
                <span className="absolute -left-1 top-[-8px] text-xs text-gray-500 w-8 text-right pr-2">100%</span>
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-xs text-gray-500 w-8 text-right pr-2">50%</span>
                <span className="absolute -left-1 bottom-[-8px] text-xs text-gray-500 w-8 text-right pr-2">0%</span>
                
                {recentScores.length > 0 ? recentScores.map((attempt, index) => {
                    const percentage = attempt.totalQuestions > 0 ? (attempt.score / attempt.totalQuestions) * 100 : 0;
                    return (
                        <div key={attempt.id} className="group flex-1 flex flex-col items-center justify-end h-full">
                            <div className="relative w-full h-full flex items-end justify-center">
                                <div 
                                    className={`w-full rounded-t-sm transition-all duration-300`}
                                    style={{ height: `${percentage}%`, backgroundColor: getScoreBarColor(attempt.score, attempt.totalQuestions) }}
                                ></div>
                                <div className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10">
                                    {attempt.score}/{attempt.totalQuestions} ({percentage.toFixed(0)}%)
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{index + 1}</div>
                        </div>
                    );
                }) : <div className="absolute inset-0 flex items-center justify-center text-gray-500">No recent scores</div>}
            </div>
        )
    }

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div ref={modalRef} className={`rounded-xl shadow-2xl max-w-3xl w-full relative max-h-[90vh] flex flex-col animate-slide-in transition-colors duration-300 ${theme === 'professional' ? 'bg-white/95 text-gray-800' : 'bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl'}`} onClick={e => e.stopPropagation()}>
                <div className={`p-4 border-b flex justify-between items-center flex-shrink-0 ${theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'}`}>
                    <h2 className="text-xl font-bold">Your Study Progress</h2>
                    <button onClick={onClose} className={`p-1 rounded-full ${theme === 'professional' ? 'hover:bg-gray-500/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}><CloseIcon/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {totalQuizzes === 0 ? (
                        <div className="text-center py-10">
                            <BrainCircuitIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold">No Progress Yet</h3>
                            <p className="text-gray-500">Complete your first quiz to see your progress here!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
                                <div className={`p-4 rounded-lg ${theme === 'professional' ? 'bg-gray-100' : 'bg-black/5 dark:bg-white/5'}`}>
                                    <p className="text-3xl font-bold">{totalQuizzes}</p>
                                    <p className={`text-sm ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>Quizzes Taken</p>
                                </div>
                                <div className={`p-4 rounded-lg ${theme === 'professional' ? 'bg-gray-100' : 'bg-black/5 dark:bg-white/5'}`}>
                                    <p className="text-3xl font-bold">{averageScore.toFixed(0)}%</p>
                                    <p className={`text-sm ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>Average Score</p>
                                </div>
                                 <div className={`p-4 rounded-lg ${theme === 'professional' ? 'bg-gray-100' : 'bg-black/5 dark:bg-white/5'}`}>
                                    <p className="text-3xl font-bold">{formatTime(progress.reduce((acc, p) => acc + p.timeTaken, 0))}</p>
                                    <p className={`text-sm ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>Total Study Time</p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg mb-8 ${theme === 'professional' ? 'bg-gray-100' : 'bg-black/5 dark:bg-white/5'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-center">Data Visualization</h3>
                                    <div className="flex items-center text-sm border rounded-full p-0.5">
                                        {(['bar', 'line', 'pie'] as ChartType[]).map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setChartType(type)}
                                                className={`px-3 py-0.5 rounded-full capitalize transition-colors ${chartType === type ? (theme === 'professional' ? 'bg-orange-500 text-white' : 'bg-purple-600 text-white') : (theme === 'professional' ? 'hover:bg-gray-200' : 'hover:bg-black/10 dark:hover:bg-white/10')}`}
                                            >{type}</button>
                                        ))}
                                    </div>
                                </div>
                                {renderCharts()}
                                <p className="text-xs text-center text-gray-500 mt-1">
                                    {chartType === 'pie' ? "Quiz Breakdown by Difficulty" : "Last 7 Quizzes"}
                                </p>
                            </div>

                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold">All Attempts</h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <label htmlFor="sort-field" className="sr-only">Sort by</label>
                                    <select
                                        id="sort-field"
                                        value={sortField}
                                        onChange={e => setSortField(e.target.value as SortField)}
                                        className={`rounded-md border-0 py-1 pl-2 pr-7 ring-1 ring-inset focus:ring-2 transition-colors ${theme === 'professional' ? 'bg-gray-100 text-gray-700 ring-gray-300 focus:ring-orange-500' : 'bg-white/10 dark:bg-black/20 text-gray-700 dark:text-gray-300 ring-white/10 dark:ring-black/20 focus:ring-purple-500'}`}
                                    >
                                        <option value="date">Date</option>
                                        <option value="score">Score</option>
                                        <option value="topic">Topic</option>
                                    </select>
                                    <label htmlFor="sort-order" className="sr-only">Sort order</label>
                                    <select
                                        id="sort-order"
                                        value={sortOrder}
                                        onChange={e => setSortOrder(e.target.value as SortOrder)}
                                        className={`rounded-md border-0 py-1 pl-2 pr-7 ring-1 ring-inset focus:ring-2 transition-colors ${theme === 'professional' ? 'bg-gray-100 text-gray-700 ring-gray-300 focus:ring-orange-500' : 'bg-white/10 dark:bg-black/20 text-gray-700 dark:text-gray-300 ring-white/10 dark:ring-black/20 focus:ring-purple-500'}`}
                                    >
                                        <option value="desc">Descending</option>
                                        <option value="asc">Ascending</option>
                                    </select>
                                </div>
                            </div>
                            <ul className="space-y-3">
                                {sortedProgress.map(attempt => (
                                    <li key={attempt.id} className={`rounded-lg border transition-shadow hover:shadow-md ${theme === 'professional' ? 'bg-white border-gray-200' : 'bg-white/50 dark:bg-black/30 border-black/10 dark:border-white/15'}`}>
                                        <button 
                                            className="p-3 w-full flex justify-between items-center cursor-pointer text-left"
                                            onClick={() => setExpandedAttemptId(expandedAttemptId === attempt.id ? null : attempt.id)}
                                            aria-expanded={expandedAttemptId === attempt.id}
                                            aria-controls={`attempt-${attempt.id}`}
                                        >
                                            <div>
                                                <p className="font-semibold">{attempt.topic || 'General Quiz'}</p>
                                                <p className={`text-sm ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>{new Date(attempt.date).toLocaleString()} &bull; {attempt.difficulty} &bull; {formatTime(attempt.timeTaken)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{attempt.score} / {attempt.totalQuestions}</p>
                                                <p className={`text-sm ${theme === 'professional' ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>{((attempt.totalQuestions > 0 ? attempt.score / attempt.totalQuestions : 0) * 100).toFixed(0)}%</p>
                                            </div>
                                        </button>
                                        {expandedAttemptId === attempt.id && (
                                            <div id={`attempt-${attempt.id}`} className={`p-4 border-t space-y-4 ${theme === 'professional' ? 'border-gray-200' : 'border-black/10 dark:border-white/10'}`}>
                                                <h4 className="font-bold">Quiz Review</h4>
                                                {attempt.results.map((result, index) => (
                                                    <div key={index} className={`p-3 rounded-lg ${result.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                                        <p className="font-semibold mb-2">{index + 1}. <MarkdownRenderer text={result.question}/></p>
                                                        <div className="flex items-start text-sm">
                                                            {result.isCorrect ? (
                                                                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"/>
                                                            ) : (
                                                                <XCircleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"/>
                                                            )}
                                                            <p>
                                                                <span className="font-bold">Your answer: </span>
                                                                <span className={result.isCorrect ? (theme === 'professional' ? 'text-green-700' : 'text-green-800 dark:text-green-300') : (theme === 'professional' ? 'text-red-700 line-through' : 'text-red-800 dark:text-red-300 line-through')}>
                                                                    <MarkdownRenderer text={result.selectedAnswer || "Not answered"} />
                                                                </span>
                                                            </p>
                                                        </div>
                                                        {!result.isCorrect && (
                                                            <div className="flex items-start mt-2 text-sm">
                                                                 <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"/>
                                                                 <p>
                                                                    <span className="font-bold">Correct answer: </span>
                                                                    <span><MarkdownRenderer text={result.correctAnswer} /></span>
                                                                 </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressModal;