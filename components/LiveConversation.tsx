import React, { useState, useEffect, useRef } from 'react';
// Fix: Removed LiveSession as it is not an exported member of @google/genai.
import { LiveServerMessage } from '@google/genai';
import { connectToLiveSession } from '../services/geminiService';
// Fix: Imported the inferred LiveSession type from our geminiService.
import type { LiveSession } from '../services/geminiService';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { MicOffIcon } from './icons';

interface LiveConversationProps {
    onClose: () => void;
    theme: string;
}

type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

const LiveConversation: React.FC<LiveConversationProps> = ({ onClose, theme }) => {
    const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
    const [transcript, setTranscript] = useState<{ user: string, model: string }>({ user: '', model: '' });

    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    // Low-latency audio playback queue
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const connect = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const sessionPromise = connectToLiveSession({
                onopen: () => {
                    setStatus('CONNECTED');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);

                    microphoneSourceRef.current = source;
                    scriptProcessorRef.current = scriptProcessor;
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Update transcript
                    if (message.serverContent?.inputTranscription) {
                        setTranscript(prev => ({ ...prev, user: prev.user + message.serverContent!.inputTranscription!.text }));
                    }
                    if (message.serverContent?.outputTranscription) {
                        setTranscript(prev => ({ ...prev, model: prev.model + message.serverContent!.outputTranscription!.text }));
                    }
                    if (message.serverContent?.turnComplete) {
                        // Log the completed turn and reset for the next one
                        setTranscript({ user: '', model: '' });
                    }

                    // Handle audio playback
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        
                        const audioBytes = decode(base64Audio);
                        const audioBuffer = await decodeAudioData(audioBytes, outputAudioContextRef.current);
                        
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        
                        source.addEventListener('ended', () => {
                            outputSourcesRef.current.delete(source);
                        });
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        outputSourcesRef.current.add(source);
                    }
                    
                    if (message.serverContent?.interrupted) {
                        outputSourcesRef.current.forEach(source => source.stop());
                        outputSourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setStatus('ERROR');
                },
                onclose: (e: CloseEvent) => {
                    setStatus('DISCONNECTED');
                },
            });
            sessionRef.current = await sessionPromise;
        } catch (error) {
            console.error('Failed to start live conversation:', error);
            setStatus('ERROR');
        }
    };
    
    const disconnect = () => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (microphoneSourceRef.current) {
            microphoneSourceRef.current.disconnect();
            microphoneSourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            microphoneSourceRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        onClose();
    };

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, []);

    const statusInfo = {
        CONNECTING: { text: "Connecting...", color: "text-yellow-400" },
        CONNECTED: { text: "Listening...", color: "text-green-400" },
        DISCONNECTED: { text: "Disconnected.", color: "text-gray-400" },
        ERROR: { text: "Connection Error.", color: "text-red-400" },
    };

    return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-3xl z-50 flex flex-col items-center justify-center animate-slide-in">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${status === 'CONNECTED' ? 'bg-green-500/20 animate-pulse' : 'bg-gray-500/20'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${status === 'CONNECTED' ? 'bg-green-500/30' : 'bg-gray-500/30'}`}>
                    <div className="text-4xl text-white/80">🎙️</div>
                </div>
            </div>

            <p className={`text-xl font-semibold mb-8 ${statusInfo[status].color}`}>{statusInfo[status].text}</p>
            
            <div className="w-full max-w-2xl h-48 p-4 text-lg text-left bg-black/20 rounded-lg overflow-y-auto">
                {transcript.user && <p><span className="font-bold text-sky-300">You: </span>{transcript.user}</p>}
                {transcript.model && <p><span className="font-bold text-purple-300">Viora: </span>{transcript.model}</p>}
                {status === 'CONNECTING' && <p className="text-gray-400 italic">Please allow microphone access...</p>}
            </div>

            <button
                onClick={disconnect}
                className="mt-12 flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105"
            >
                <MicOffIcon className="w-6 h-6" />
                End Conversation
            </button>
        </div>
    );
};

export default LiveConversation;