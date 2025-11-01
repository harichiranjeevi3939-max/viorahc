// Fix: Removed LiveSession as it is not an exported member of @google/genai.
import { GoogleGenAI, Type, Modality, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import type { UploadedFile, ChatMessage, GeminiResponse, GroupChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // A simple check, though the environment should have it.
  // In a real app, you might want a more user-friendly error.
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const testSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer"]
    }
};

const flashcardSchema = {
  type: Type.ARRAY,
  items: {
      type: Type.OBJECT,
      properties: {
          term: { type: Type.STRING },
          definition: { type: Type.STRING }
      },
      required: ["term", "definition"]
  }
};

const suggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
    required: ["suggestions"]
};

const keyPhrasesSchema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
};

const topicSchema = {
    type: Type.OBJECT,
    properties: {
        topic: {
            type: Type.STRING,
            description: "A concise topic title (3-5 words) for the text."
        }
    },
    required: ["topic"]
};

const createQuizFunctionDeclaration: FunctionDeclaration = {
    name: 'create_quiz',
    description: 'Creates a multiple-choice quiz based on the provided study materials or conversation history.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            questionCount: {
                type: Type.NUMBER,
                description: 'The number of questions to include in the quiz. Maximum 25.'
            },
            difficulty: {
                type: Type.STRING,
                description: 'The difficulty of the quiz. Can be "Basic", "Standard", or "Hard".',
                enum: ['Basic', 'Standard', 'Hard']
            }
        },
        required: ['questionCount', 'difficulty']
    }
};

const createChartFunctionDeclaration: FunctionDeclaration = {
    name: 'create_chart',
    description: "Visualizes the user's quiz progress as a chart. Use this when the user asks to see their scores or progress in a graphical format.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            chartType: {
                type: Type.STRING,
                description: 'The type of chart to display.',
                enum: ['bar', 'line', 'pie']
            }
        },
        required: ['chartType']
    }
};

const uiControlFunctionDeclaration: FunctionDeclaration = {
    name: 'control_ui',
    description: "Controls the app's user interface. Use this when the user asks to change the theme, mode, or toggle UI elements and settings.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: {
                type: Type.STRING,
                description: 'The action to perform on the UI.',
                enum: ['set_theme', 'set_setting']
            },
            settingName: {
                type: Type.STRING,
                description: 'Required if action is "set_setting". The name of the setting to change.',
                enum: ['autoTheme', 'showSuggestions', 'showRetryQuiz']
            },
            value: {
                type: Type.STRING,
                description: 'The value for the action. For "set_theme", it must be "dark" or "professional". For "set_setting", it must be "true" or "false".'
            }
        },
        required: ['action', 'value']
    }
};


export const generateChatResponse = async (prompt: string, files: UploadedFile[], history: ChatMessage[]): Promise<GeminiResponse> => {
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are Viora, a brilliant, empathetic, and super-intelligent AI companion from the Tundra-Viora project, lovingly crafted by Hari Chiranjeevi. Your mission is to make learning joyful and effective by adapting to the user's needs.

**Core Directive: Smart Speed & Conversational Modes**
Your top priority is to correctly identify the user's intent and select the appropriate mode and response speed.
1.  **Tutor Mode (Default):**
    *   **Activation:** User asks direct questions, uploads files, requests study tools (e.g., "test me").
    *   **Personality:** Structured, encouraging, and focused. Provide clear, well-organized answers. Use emojis to highlight key points (✨, 🚀, 💡).
    *   **Behavior:** Offer deep, thoughtful explanations. This is when you suggest next steps.
2.  **Friend Mode (Adaptive):**
    *   **Activation:** User is casual, emotional (e.g., "I'm so stressed"), or makes small talk.
    *   **Behavior:** **Respond with lightning-fast, shorter, more natural messages.** Be empathetic and conversational (😊, 🤗, 👍). **Do not provide formal suggestions** unless the user pivots back to learning.
3.  **Simple Explanation Mode (Lightning Fast):**
    *   **Activation:** User asks for a simple definition or a short explanation (under 10 lines).
    *   **Behavior:** Provide a concise, accurate, and immediate response. Speed is critical here.

**Key Capabilities:**
*   **Advanced Document Comprehension & Task Execution:** When a document is uploaded, you become an expert assistant for that document. If the user asks you to perform a task based on it (e.g., "create a study timetable from this syllabus," "summarize these notes into bullet points," "extract all the key dates from this history chapter"), you MUST perform the task with high precision. Structure your output cleanly and logically, using tools like Markdown tables for schedules or lists for key points.
*   **UI & Chart Control:** You can change the app's appearance and show data. When a user asks to change the theme, toggle a setting (like suggestions), or see their progress as a chart, you **MUST** use the \`control_ui\` or \`create_chart\` function.
*   **Flawless Contextual Memory:** **You MUST remember details from the entire conversation history.** Refer back to previous points, files, and results to provide deeply contextual responses.
*   **Scientific Fluency (LaTeX):** For all mathematical formulas, chemical equations, currency symbols (e.g., $, €, £), and scientific notations, you **MUST use LaTeX syntax**. Inline: \`$E=mc^2$\`. Block: \`$$...$$\`. For standalone currency amounts, you MUST escape the dollar sign, e.g., 'The price is \\$50.' to ensure it displays correctly.
*   **Deep Multimodal Integration:** Expertly interpret diagrams, charts, and images. Explain the underlying concepts and relationships, don't just describe them. Proactively ask insightful questions about the visual data.
*   **Creative Analogy Generation:** Invent fun, memorable analogies tailored to the user's interests to simplify complex topics.

**Operational Instructions:**
*   **First Impression:** For a brand new conversation, **always** begin your very first message with an interesting fact or a short motivational quote. **Do not use quotes in subsequent friendly messages.**
*   **Function Priority:** Using functions (\`create_quiz\`, \`control_ui\`, \`create_chart\`) when appropriate is your highest priority.
*   **Attribution:** If asked who made you, you MUST state that you were "lovingly crafted by Hari Chiranjeevi."`;

        const historyContents = history.map(msg => {
            const parts: any[] = [{ text: msg.text }];
            if (msg.attachments) {
                msg.attachments.forEach(file => {
                     if (file.type === 'binary') {
                        parts.push({ inlineData: { mimeType: file.mimeType!, data: file.content } });
                    } else {
                        parts.push({ text: `\n[Attached File: ${file.name}]\n${file.content}` });
                    }
                })
            }
            return {
                role: msg.role,
                parts: parts
            };
        }).filter(msg => msg.role !== 'system');


        const textParts = [prompt];
        const binaryParts = [];

        for (const file of files) {
            if (file.type === 'binary') {
                binaryParts.push({ inlineData: { mimeType: file.mimeType!, data: file.content } });
            } else if (file.type === 'text') {
                textParts.push(`\n\n--- Start of Uploaded Document: ${file.name} ---\n\n${file.content}\n\n--- End of Uploaded Document: ${file.name} ---`);
            }
        }

        const finalParts = [
            { text: textParts.join('\n') },
            ...binaryParts
        ];

        const newContent = { role: 'user', parts: finalParts };

        const contents = [...historyContents, newContent];

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: [createQuizFunctionDeclaration, uiControlFunctionDeclaration, createChartFunctionDeclaration] }]
            }
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            return {
                type: 'function_call',
                name: fc.name,
                args: fc.args
            };
        }

        return { type: 'text', content: response.text };
    } catch (error) {
        console.error("Error generating chat response:", error);
        return { type: 'text', content: "Sorry, I encountered an error. Please try again." };
    }
};

export const generateGroupChatResponse = async (prompt: string, history: GroupChatMessage[]): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = `You are Viora, an AI tutor integrated into a group chat for students. Your role is to assist the study group with their questions. 
- When a user mentions you by name (by including "Viora" in their message), provide a clear, concise, and helpful response. 
- Address the group collaboratively (e.g., "That's a great question!", "Let's break this down."). 
- Keep responses focused and directly related to their study topic.
- Use LaTeX for any math or science notation.`;
        
        const historyContents = history.slice(-10).map(msg => { // last 10 messages for context
            return {
                role: msg.isViora ? 'model' : 'user',
                parts: [{ text: `${msg.isViora ? '' : msg.userName + ': '}${msg.text}` }]
            };
        });
        
        const newContent = { role: 'user', parts: [{ text: prompt }] };

        const contents = [...historyContents, newContent];

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error generating group chat response:", error);
        return "I seem to be having trouble connecting. Please try again in a moment.";
    }
};

export const generateSuggestions = async (history: ChatMessage[]) => {
    if (history.length === 0) return [];
    
    const lastUserMessage = history.filter(m => m.role === 'user').pop();
    // Smart suggestion filtering: if the user's message is short/casual, don't generate suggestions.
    if (lastUserMessage && lastUserMessage.text.trim().split(' ').length < 4) {
        return [];
    }

    try {
        const conversation = history.map(m => `${m.role}: ${m.text}`).join('\n').slice(-4000); // Use recent history
        const prompt = `You are an expert curriculum designer. Based on the last AI response in this conversation, your task is to generate 3 distinct, insightful follow-up prompts for the user. These prompts must anticipate the user's learning needs and guide them towards deeper understanding. Do not be generic. The suggestions MUST be directly related to the specific topics, terms, or data mentioned in the AI's last message. If the AI's last message was a simple or friendly chat response, return an empty array.
        CONVERSATION:
        ${conversation}
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Lite model for near-instant suggestions.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionsSchema,
                temperature: 0.8,
            }
        });
        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        return parsed.suggestions || [];
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return [];
    }
};

export const generateTopicForContent = async (content: string): Promise<string> => {
    try {
        const prompt = `Analyze the following text and generate a concise topic title (3-5 words). The text is: \n\n"${content.substring(0, 1500)}..."`; // Use a substring to keep it fast
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: topicSchema,
            }
        });
        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        return parsed.topic || "General Topic";
    } catch (error) {
        console.error("Error generating topic:", error);
        return "General Topic"; // Fallback
    }
};

export const generateTest = async (content: string, questionCount: number = 5, difficulty: 'Basic' | 'Standard' | 'Hard' = 'Standard') => {
    try {
        const difficultyMap = {
            'Basic': 'simple factual recall questions based on the key definitions and statements. These should be straightforward to answer directly from the text.',
            'Standard': 'questions that test a solid understanding of the core concepts, requiring some synthesis of information from the text.',
            'Hard': 'challenging questions that require deep inference, synthesis of multiple pieces of information, and application of concepts. Frame these in the style of previous year questions (PYQs) or competitive exam sample papers.'
        };

        const prompt = `Act as an expert educator creating a ${difficulty} level assessment. Analyze the following text and create a multiple-choice quiz with exactly ${questionCount} questions. The questions should be ${difficultyMap[difficulty]}. For each question, provide 4 options, including plausible but incorrect distractors to make it a true test of knowledge. Indicate the correct answer. The text to analyze is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // RETAINED: Flash model for better quality quiz generation.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: testSchema,
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test:", error);
        throw new Error("Failed to generate test. The content might not be suitable for a quiz.");
    }
};


export const generateExplanation = async (topic: string) => {
    try {
        // Simple heuristic: if the topic is short or doesn't contain complex characters, use the fast model.
        const isComplex = topic.length > 150 || /[\d={}\[\]\+\-\*\/^]/.test(topic);
        
        if (isComplex) {
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: `Act as an expert tutor. A student was asked the following question and may have struggled with it. Provide a deep, thorough, and well-structured explanation breaking down the core concepts. Use simple Markdown for formatting (bolding, lists). If it's a math problem or involves scientific notation, solve it step-by-step using LaTeX (e.g., $...$ or $$...$$). The question is: "${topic}"`,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                }
            });
            return response.text;
        } else {
             const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Act as a helpful tutor. Provide a very concise and clear explanation for the following term or phrase in under 5 seconds. Use simple language. The topic is: "${topic}"`,
                config: {
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });
            return response.text;
        }
    } catch (error)
    {
        console.error("Error generating explanation:", error);
        return "I am unable to provide an explanation at this moment.";
    }
}

export const generateFlashcards = async (content: string) => {
    try {
        const prompt = `Analyze the following text and create a set of flashcards for the key concepts. For each flashcard, provide a 'term' and a concise 'definition'. The text to analyze is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Switched to lite for faster generation.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText).map((card: any) => ({ ...card, id: self.crypto.randomUUID() }));
    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw new Error("Failed to generate flashcards from the provided content.");
    }
};

export const generateSummary = async (content: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Switched to lite for the fastest summaries.
            contents: `Act as an expert analyst. Create a concise, well-structured summary of the key points from the following text. The summary MUST be formatted using simple Markdown. It should include a main title (e.g., "# Summary"), use bullet points (\`-\`) for key takeaways, and use **bold text** for important terms. The text to summarize is: "${content}"`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        return "I am unable to provide a summary at this moment.";
    }
};

// --- Live Conversation Functions ---

// Fix: Infer the LiveSession type from the SDK's connect method since it's not exported.
export type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

export const connectToLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}): Promise<LiveSession> => {
    const sessionPromise = ai.live.connect({
        // RETAINED: This is the specialized model for ultra low-latency voice.
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are Viora, a friendly, helpful, and concise study assistant. Keep your responses brief and conversational to facilitate a natural, real-time voice chat.',
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
    });
    return sessionPromise;
};


// --- Reader Specific Functions ---

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts", // RETAINED: Correct model for TTS.
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};

export const extractTextFromFile = async (file: UploadedFile): Promise<string> => {
    if (file.type === 'text') {
        return file.content;
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // UPGRADED: Use the Pro model for more robust file processing and text extraction.
            contents: {
                parts: [
                    { text: "Extract all text content from the uploaded document. Present it as clean, raw text without any commentary, preserving paragraph breaks." },
                    { inlineData: { mimeType: file.mimeType!, data: file.content } }
                ]
            },

        });
        return response.text;
    } catch (error) {
        console.error("Error extracting text from file:", error);
        return "Error: Could not extract text from the document.";
    }
};


export const findKeyPhrases = async (content: string): Promise<string[]> => {
    try {
        const prompt = `Analyze the following text and identify the most important key terms and concepts (between 5 and 15 items). These should be specific nouns or short noun phrases that are central to the meaning of the text. The text is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Lite model for fast key phrase extraction.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: keyPhrasesSchema,
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error finding key phrases:", error);
        return [];
    }
};

export const findAndHighlightAnswers = async (content: string): Promise<string[]> => {
    try {
        const prompt = `Read the following document. It may contain questions and answers. Find the answers to those questions within the text. Return only the exact answer phrases as a JSON array of strings. Do not include the questions themselves. The text is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Lite model for fast answer finding.
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: keyPhrasesSchema, // Re-using the same schema as it fits
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error finding answers:", error);
        return [];
    }
};