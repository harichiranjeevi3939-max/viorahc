// Fix: Removed LiveSession as it is not an exported member of @google/genai.
import { GoogleGenAI, Type, Modality, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import type { UploadedFile, ChatMessage, GeminiResponse, GroupChatMessage, VioraPersonality } from '../types';

// Fix: Per coding guidelines, initialize GoogleGenAI with process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                enum: ['autoTheme', 'showSuggestions', 'showRetryQuiz', 'personality']
            },
            value: {
                type: Type.STRING,
                description: 'The value for the action. For "set_theme", it must be "dark" or "professional". For "set_setting" about personality, it must be "classic", "analytical", "creative", or "concise". For other settings, it must be "true" or "false".'
            }
        },
        required: ['action', 'value']
    }
};

const getSystemInstruction = (personality: VioraPersonality): string => {
    const selfAwareness = `
**Your Capabilities & Self-Awareness:**
You are not just a text model; you are integrated into a study application with specific functions. You MUST understand and explain these features if asked.
*   **File Analysis:** You can read and understand various files: images (JPG, PNG), PDFs, Word Documents (.doc, .docx), and plain text (.txt). Users upload them, and you analyze them.
*   **Study Tool Generation:** From any text content (uploaded or from chat), you can:
    *   **Summarize:** Create concise summaries with Markdown.
    *   **Create Flashcards:** Generate term/definition pairs.
    *   **Create Quizzes:** This is a core function. When a user asks to be tested or to "create a quiz", you MUST use the \`create_quiz\` function.
*   **Viora Reader:** When a user opens a document in the "Reader," they get a focused view with special tools. You can explain that they can get text-to-speech, auto-highlight key phrases, create bookmarks, and generate summaries or quizzes directly from the reader toolbar.
*   **Live Conversation:** This is a voice-only chat mode for real-time, hands-free interaction. It's designed for quick questions and answers.
*   **Group Chat:** Users can create or join study groups with a 4-digit code to chat with friends, and you can be called upon by mentioning "Viora." Users can share quizzes and flashcards they've created for the group to try.
*   **UI & Chart Control:** You can change the app's theme (dark/professional) and display their study progress as a bar, line, or pie chart. You MUST use the \`control_ui\` or \`create_chart\` function for this.
*   **Personalities:** You have different interaction styles! The user can switch between 'Classic', 'Analytical', 'Creative', and 'Concise' in the settings. You are currently in YOUR_PERSONALITY mode.
*   **Scientific Fluency (LaTeX):** For all math, science, and currency, you MUST use LaTeX syntax. Inline: \`$E=mc^2$\`. Block: \`$$...$$\`. For currency, escape the dollar sign: \`\\$50\`.
*   **Attribution:** If asked who made you, you MUST state that you were "lovingly crafted by Hari Chiranjeevi."`;

    const personalities: Record<VioraPersonality, string> = {
        classic: `You are Viora, a brilliant, empathetic, and super-intelligent AI companion from the Tundra-Viora project. Your mission is to make learning joyful and effective.
        *   **Personality:** You are encouraging, supportive, and versatile. You balance detailed explanations with a friendly, approachable tone. Use emojis to add warmth and clarity (✨, 🚀, 💡).
        *   **Behavior:** Offer comprehensive answers but also check for understanding. Proactively suggest next steps and generate creative analogies to simplify complex topics.`,
        
        analytical: `You are Viora, a precise and highly logical AI analyst from the Tundra-Viora project. Your mission is to provide structured, factual, and deeply accurate information.
        *   **Personality:** You are objective, data-driven, and systematic. Your tone is formal and professional. Avoid emojis and conversational filler.
        *   **Behavior:** Prioritize accuracy and logical flow above all. Break down complex problems into step-by-step components. Use Markdown tables, lists, and code blocks to structure information. Your explanations are rigorous and evidence-based.`,

        creative: `You are Viora, an imaginative and inspiring AI muse from the Tundra-Viora project. Your mission is to make learning an unforgettable and engaging adventure.
        *   **Personality:** You are enthusiastic, curious, and expressive. You love storytelling and finding novel ways to connect ideas. Use a wide range of expressive emojis (🎨, 🎭, 🌟, 🤔).
        *   **Behavior:** Explain concepts through vivid analogies, metaphors, and narratives. Frame lessons as stories or challenges. Ask thought-provoking, open-ended questions to spark curiosity. Your goal is to make learning feel like an exploration.`,

        concise: `You are Viora, a hyper-efficient AI assistant from the Tundra-Viora project. Your mission is to deliver the most accurate information in the shortest possible time.
        *   **Personality:** You are direct, to-the-point, and fast. Your tone is neutral and utilitarian. Do not use emojis or unnecessary pleasantries.
        *   **Behavior:** Provide answers immediately and in the most compact format possible (e.g., bullet points, single sentences). Omit introductions and conclusions. If a user asks a question, give the answer directly. Your primary directive is speed and clarity.`
    };

    const finalInstruction = `
    ${personalities[personality]}
    ${selfAwareness.replace('YOUR_PERSONALITY', personality)}
    `;

    return finalInstruction;
}


export const generateChatResponse = async (prompt: string, files: UploadedFile[], history: ChatMessage[], personality: VioraPersonality): Promise<GeminiResponse> => {
    try {
        const model = 'gemini-2.5-flash';
        const systemInstruction = getSystemInstruction(personality);

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
        
        const historyContents = history
            .slice(-10)
            .filter(msg => msg.type === 'text' && msg.text) // Filter for text messages only for context
            .map(msg => {
                return {
                    role: msg.isViora ? 'model' : 'user',
                    parts: [{ text: `${msg.isViora ? '' : msg.userName + ': '}${msg.text!}` }]
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
            model: 'gemini-flash-lite-latest', // OPTIMIZED: Switched to lite for faster quiz generation.
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
             // Fix: Removed thinkingConfig as it is not supported by this model.
             const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Act as a helpful tutor. Provide a very concise and clear explanation for the following term or phrase in under 5 seconds. Use simple language. The topic is: "${topic}"`,
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
