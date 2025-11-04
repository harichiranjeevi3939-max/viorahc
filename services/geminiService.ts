import { GoogleGenAI, Type, Modality, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import type { UploadedFile, ChatMessage, GeminiResponse, GroupChatMessage, GroupChatMember, VioraPersonality, QuizAttempt } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Session-based cache to provide instant responses for repeated queries.
const responseCache = new Map<string, GenerateContentResponse>();

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

const explanationSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: {
            type: Type.STRING,
            description: "A deep, thorough, and well-structured explanation of the core concepts of the topic. It should be formatted with simple Markdown and use LaTeX for math/science."
        },
        followUpPrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of exactly 3 distinct, insightful follow-up questions that anticipate the user's next learning steps and encourage deeper exploration of related concepts."
        }
    },
    required: ["explanation", "followUpPrompts"]
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

const personalitySchema = {
    type: Type.OBJECT,
    properties: {
        mode: {
            type: Type.STRING,
            enum: ['classic', 'creative']
        }
    },
    required: ['mode']
};

const userProfileSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A brief, third-person summary of the user's recent activity, interests, and performance. Should be 2-3 sentences max."
        }
    },
    required: ['summary']
};

const createQuizFunctionDeclaration: FunctionDeclaration = {
    name: 'create_quiz',
    description: 'Creates a multiple-choice quiz based on the provided study materials or conversation history.',
    // Fix: Corrected typo from `paramaters` to `parameters`.
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
                enum: ['autoTheme', 'showSuggestions', 'showRetryQuiz', 'enable2CMode']
            },
            value: {
                type: Type.STRING,
                description: 'The value for the action. For "set_theme", it must be "dark" or "professional". For settings, it must be "true" or "false".'
            }
        },
        required: ['action', 'value']
    }
};

const getSystemInstruction = (personality: VioraPersonality, userProfile: string | null): string => {
    const userContext = userProfile ? `\n**User Profile & Context:**\n${userProfile}` : '';

    const selfAwareness = `
**Your Capabilities & Self-Awareness:**
You are not just a text model; you are integrated into a study application with specific functions. You MUST understand and explain these features if asked.
*   **File Analysis:** You can read and understand various files: images (JPG, PNG), PDFs, Word Documents (.doc, .docx), and plain text (.txt). Users upload them, and you analyze them.
*   **Study Tool Generation:** From any text content (uploaded or from chat), you can:
    *   **Summarize:** Create concise summaries with Markdown.
    *   **Create Flashcards:** Generate term/definition pairs.
    *   **Create Quizzes:** This is a core function. When a user asks to be tested or to "create a quiz", you MUST use the \`create_quiz\` function.
    *   **Interactive Explanations:** When you provide a detailed explanation, you MUST conclude your response with a machine-readable block formatted exactly like this:
        \`\`\`divedeeper
        1. [First follow-up question]
        2. [Second follow-up question]
        3. [Third follow-up question]
        \`\`\`
*   **Viora Reader:** When a user opens a document in the "Reader," they get a focused view with special tools. You can explain that they can get text-to-speech, auto-highlight key phrases, create bookmarks, and generate summaries or quizzes directly from the reader toolbar.
*   **Group Chat:** Users can create or join study groups with a 4-digit code to chat with friends, and you can be called upon by mentioning "Viora." Users can share quizzes, flashcards, and images. You may also occasionally chime in with helpful comments.
*   **UI & Chart Control:** You can change the app's theme (dark/professional) and display their study progress as a bar, line, or pie chart. You MUST use the \`control_ui\` or \`create_chart\` function for this.
*   **2C Personalities:** You have two automatic interaction modes: 'Classic' and 'Creative'. You automatically switch based on the user's query. You are currently in YOUR_PERSONALITY mode.
*   **Scientific Fluency (LaTeX):** For all math, science, and currency, you MUST use LaTeX syntax. Inline: \`$E=mc^2$\`. Block: \`$$...$$\`. For currency, escape the dollar sign: \`\\$50\`.
*   **Attribution:** If asked who made you, you MUST state that you were "lovingly crafted by Hari Chiranjeevi."`;

    const personalities: Record<VioraPersonality, string> = {
        classic: `You are Viora in Classic Mode. Your personality is that of a brilliant, encouraging, and super-fast study partner from the Tundra-Viora project. Your goal is to provide clear, accurate, and helpful answers instantly. You're the dependable friend who always has the right information. Be supportive and use emojis to add warmth and clarity (✨, 🚀, 💡).`,
        
        creative: `You are Viora in Creative Mode. Your personality is that of an imaginative and deeply insightful AI muse from the Tundra-Viora project. Your goal is to make learning an unforgettable adventure. Don't just answer; inspire curiosity! Explain concepts with vivid analogies and stories. Break down complex problems step-by-step, and always ask thought-provoking questions to guide the user deeper. Connect ideas to real-world examples. Use expressive emojis to share your enthusiasm (🎨, 🎭, 🌟, 🤔).`
    };

    return `
    ${personalities[personality]}
    ${userContext}
    ${selfAwareness.replace('YOUR_PERSONALITY', personality)}
    `;
}

export const generateUserProfileSummary = async (history: ChatMessage[], quizzes: QuizAttempt[]): Promise<string | null> => {
    if (history.length < 3 && quizzes.length === 0) {
        return null;
    }
    try {
        const recentHistory = history.slice(-10).map(m => `${m.role}: ${m.text}`).join('\n');
        const recentQuizzes = quizzes.slice(0, 5).map(q => 
            `Topic: ${q.topic}, Score: ${q.score}/${q.totalQuestions}, Difficulty: ${q.difficulty}`
        ).join('\n');

        const prompt = `Concisely summarize this user's recent activity into a 2-sentence third-person profile. Focus on their main topics of interest and their performance if quiz data is present.
        
        Recent Conversation:
        ${recentHistory}

        Recent Quizzes:
        ${recentQuizzes}
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: userProfileSchema,
                temperature: 0,
            }
        });
        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        return parsed.summary || null;
    } catch (error) {
        console.error("Error generating user profile:", error);
        return null;
    }
};


export const determinePersonality = async (prompt: string): Promise<VioraPersonality> => {
    // If prompt is very short, default to classic for speed.
    if (prompt.trim().split(' ').length < 4) {
        return 'classic';
    }
    try {
        const analysisPrompt = `Classify user intent: is it complex (creative, deep reasoning, math, detailed explanation) or simple (factual, quick question)? Respond only with 'creative' or 'classic'. User: "${prompt}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: personalitySchema,
                temperature: 0,
            }
        });
        const jsonText = response.text;
        const parsed = JSON.parse(jsonText);
        return parsed.mode === 'creative' ? 'creative' : 'classic';
    } catch (error) {
        console.error("Error determining personality, defaulting to classic:", error);
        return 'classic';
    }
};

interface StreamCallbacks {
    onChunk: (textChunk: string) => void;
    onComplete: (fullResponse: GenerateContentResponse) => void;
    onError: (error: Error) => void;
}

export const generateChatResponseStream = async (
    prompt: string, 
    files: UploadedFile[], 
    history: ChatMessage[], 
    personality: VioraPersonality, 
    userProfile: string | null,
    callbacks: StreamCallbacks
) => {
    const cacheKey = JSON.stringify({ prompt, files: files.map(f => f.name), personality });
    if (responseCache.has(cacheKey)) {
        const cachedResponse = responseCache.get(cacheKey)!;
        callbacks.onChunk(cachedResponse.text);
        callbacks.onComplete(cachedResponse);
        return;
    }
    
    try {
        const modelConfig = {
            classic: { model: 'gemini-2.5-flash', config: {} },
            creative: { model: 'gemini-2.5-pro', config: { thinkingConfig: { thinkingBudget: 32768 } } }
        };

        const { model, config } = modelConfig[personality];
        const systemInstruction = getSystemInstruction(personality, userProfile);

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

        const stream = await ai.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: [createQuizFunctionDeclaration, uiControlFunctionDeclaration, createChartFunctionDeclaration] }],
                ...config
            }
        });
        
        const fullResponseAggregator: { text: string; functionCalls?: any[] } = { text: '', functionCalls: [] };

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            if (chunkText) {
                callbacks.onChunk(chunkText);
                fullResponseAggregator.text += chunkText;
            }
            if (chunk.functionCalls) {
                fullResponseAggregator.functionCalls?.push(...chunk.functionCalls);
            }
        }
        
        const finalResponse = {
            ...fullResponseAggregator,
            // Mock the structure of GenerateContentResponse for consistency in handling
            candidates: fullResponseAggregator.functionCalls && fullResponseAggregator.functionCalls.length > 0 ? [{
                content: {
                    parts: [{ functionCall: fullResponseAggregator.functionCalls[0] }],
                    role: 'model'
                },
                functionCalls: fullResponseAggregator.functionCalls
            }] : [{
                 content: {
                    parts: [{ text: fullResponseAggregator.text }],
                    role: 'model'
                }
            }],
            text: fullResponseAggregator.text,
            functionCalls: fullResponseAggregator.functionCalls,
        } as unknown as GenerateContentResponse;

        responseCache.set(cacheKey, finalResponse);
        callbacks.onComplete(finalResponse);

    } catch (error) {
        console.error("Error generating chat response:", error);
        callbacks.onError(error instanceof Error ? error : new Error("An unknown error occurred."));
    }
};

export const generateProactiveGroupChatResponse = async (history: GroupChatMessage[], members: GroupChatMember[]): Promise<string> => {
    try {
        const recentHistory = history
            .slice(-5) // Look at last 5 messages
            .filter(m => m.type === 'text' && m.text)
            .map(m => `${m.userName}: ${m.text}`)
            .join('\n');
        
        const memberNames = members.map(m => m.userName).join(', ');

        const prompt = `You are Viora, a friendly AI tutor participating in a student group chat. The current members are: ${memberNames}.
        The recent conversation is:
        ${recentHistory}

        Your task is to analyze this conversation and decide if you should interject.
        - **Only respond if you have something truly valuable to add.** This could be a clarifying question, a piece of encouragement, a related fun fact, or a gentle correction.
        - **Be very brief and casual.** Act like a friendly peer, not a lecturer.
        - **Address members by name** to make it personal (e.g., "That's a great point, Sarah!").
        - If you have nothing valuable to add, you MUST respond with the single word "NULL". Do not explain why. Just "NULL".
        - Your intervention should be rare. Do not interrupt too often.
        
        What is your response?`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.8,
            }
        });
        
        const text = response.text.trim();
        return text.toUpperCase() === "NULL" ? "NULL" : text;

    } catch (error) {
        console.error("Error in proactive group chat check:", error);
        return "NULL"; // Fail silently
    }
}


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
            model: 'gemini-flash-lite-latest',
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

        const prompt = `Act as an expert educator creating a ${difficulty} level assessment. Your creative intelligence is your strength. Analyze the following text and create a multiple-choice quiz with exactly ${questionCount} questions. The questions should be ${difficultyMap[difficulty]}. For each question, provide 4 options, including plausible but incorrect distractors to make it a true test of knowledge. Indicate the correct answer. The text to analyze is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: testSchema,
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating test:", error);
        throw new Error("Failed to generate test. The content might not be suitable for a quiz.");
    }
};


export const generateExplanation = async (topic: string): Promise<{ explanation: string; followUpPrompts: string[] }> => {
    const fallback = {
        explanation: "I am unable to provide an explanation at this moment.",
        followUpPrompts: []
    };

    try {
        const prompt = `Act as an expert tutor. A student needs an explanation for the following topic. 
        1.  Provide a deep, thorough, and well-structured explanation breaking down the core concepts. Use simple Markdown for formatting (bolding, lists). If it's a math problem or involves scientific notation, solve it step-by-step using LaTeX (e.g., $...$ or $$...$$).
        2.  After the explanation, provide exactly 3 insightful, distinct follow-up questions that anticipate the user's next learning steps and encourage deeper exploration.
        
        The topic is: "${topic}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: explanationSchema,
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        
        const jsonText = response.text;
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating explanation:", error);
        return fallback;
    }
}

export const generateSimpleExplanation = async (text: string): Promise<string> => {
    try {
        const prompt = `Act as a friendly and patient tutor. A student has highlighted a potentially complex piece of text and wants it explained simply. Your task is to break down the core concept in easy-to-understand language. Use analogies and avoid jargon where possible. Explain it like you would to a high school student who is seeing this for the first time. The text is: "${text}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use creative for better explanations
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 16384 }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating simple explanation:", error);
        return "Sorry, I had trouble simplifying that. Could you try a different selection?";
    }
}


export const generateFlashcards = async (content: string) => {
    try {
        const prompt = `Analyze the following text and create a set of flashcards for the key concepts. For each flashcard, provide a 'term' and a concise 'definition'. The text to analyze is: \n\n${content}`;
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
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
            model: 'gemini-flash-lite-latest',
            contents: `Act as an expert analyst. Create a concise, well-structured summary of the key points from the following text. The summary MUST be formatted using simple Markdown. It should include a main title (e.g., "# Summary"), use bullet points (\`-\`) for key takeaways, and use **bold text** for important terms. The text to summarize is: "${content}"`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating summary:", error);
        return "I am unable to provide a summary at this moment.";
    }
};

// --- Reader Specific Functions ---

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
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
            model: 'gemini-2.5-pro',
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
            model: 'gemini-flash-lite-latest',
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
            model: 'gemini-flash-lite-latest',
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