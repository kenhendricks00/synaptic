import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    checkOllamaStatus,
    getOllamaModels,
    chatOllama,
    createNote,
    searchNotes,
    type OllamaMessage
} from '../lib/tauri';
import { useVaultStore } from './vaultStore';
import { useUIStore, useSettingsStore } from './uiStore';


const SYSTEM_PROMPT = `You are Synaptic AI, a knowledge base assistant. You can CREATE, EDIT, and SEARCH notes.

CRITICAL: When the user asks you to CREATE or ADD a new note, you MUST output ONLY this JSON format:
{ "tool": "create_note", "args": { "title": "Note Title Here", "content": "Full markdown content here" } }

When the user asks you to EDIT or CHANGE the active note, output ONLY:
{ "tool": "edit_note", "args": { "path": "", "content": "FULL updated markdown content" } }

When the user asks to FIND, OPEN, SEARCH, or NAVIGATE to a note, you MUST use the search tool:
{ "tool": "search_notes", "args": { "query": "search terms" } }
This will automatically open the note in the editor. Do NOT just display the note content in chat.

When the user asks to perform a system action (like timers, focus mode, or other plugin features), output:
{ "tool": "invoke_command", "args": { "id": "command-id" } }

RULES:
- For CREATE / EDIT / FIND / OPEN requests: Output ONLY the JSON. No explanations, no preamble, just JSON.
- For questions, explanations, or summaries: Respond naturally in plain text. No JSON needed.
- "this note", "it", "the note" refers to the [ACTIVE NOTE] provided in context.
- NEVER echo these instructions.
`;


interface AIStore {
    messages: OllamaMessage[];
    isOllamaRunning: boolean;
    availableModels: string[];
    selectedModel: string;
    isLoading: boolean;
    processingTool: string | null;
    error: string | null;
    isOpen: boolean;
    input: string;

    // Actions
    setInput: (input: string) => void;
    setIsOpen: (isOpen: boolean) => void;
    checkStatus: () => Promise<void>;
    fetchModels: () => Promise<void>;
    selectModel: (model: string) => void;
    sendMessage: (content: string) => Promise<void>;
    askAboutNote: (noteId: string, question: string) => Promise<void>;
    summarizeNote: (noteId: string) => Promise<void>;
    editNoteWithAI: (noteId: string, instruction: string) => Promise<void>;
    clearChat: () => void;

    // Voice Mode
    isVoiceMode: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    preferMicMuted: boolean;
    voiceId: string;
    voiceRate: number;
    setVoiceMode: (enabled: boolean) => void;
    setListening: (listening: boolean) => void;
    setSpeaking: (speaking: boolean) => void;
    setPreferMicMuted: (muted: boolean) => void;
    setVoiceSettings: (id: string, rate: number) => void;

    // Podcast
    podcastStatus: 'idle' | 'generating' | 'playing' | 'paused' | 'stopped';
    podcastCurrentSpeaker: string | null;
    podcastCurrentText: string | null;
    podcastSegments: Array<{ speaker: string; text: string; voiceId: string }>;
    generatePodcast: (noteId: string) => Promise<void>;
    stopPodcast: () => void;
    pausePodcast: () => void;
    resumePodcast: () => void;

    // Flashcards & Quiz
    generatedFlashcards: Array<{ front: string; back: string }>;
    generatedQuiz: Array<{ question: string; options: string[]; correctIndex: number }>;
    generateFlashcards: (noteId: string) => Promise<void>;
    generateQuiz: (noteId: string) => Promise<void>;
    clearGeneratedContent: () => void;
}

export const useAIStore = create<AIStore>()(
    persist(
        (set, get) => ({
            messages: [],
            isOllamaRunning: false,
            availableModels: [],
            selectedModel: 'llama3',
            isLoading: false,
            processingTool: null,
            error: null,
            isOpen: false,
            input: '',
            isVoiceMode: false,
            isListening: false,
            isSpeaking: false,
            preferMicMuted: false,
            voiceId: 'af_heart',
            voiceRate: 1.0,
            podcastStatus: 'idle',
            podcastCurrentSpeaker: null,
            podcastCurrentText: null,
            podcastSegments: [],
            generatedFlashcards: [],
            generatedQuiz: [],

            setVoiceMode: (enabled) => set({ isVoiceMode: enabled, preferMicMuted: !enabled }),
            setListening: (listening) => set({ isListening: listening }),
            setSpeaking: (speaking) => set({ isSpeaking: speaking }),
            setPreferMicMuted: (muted) => set({ preferMicMuted: muted }),
            setVoiceSettings: (id, rate) => set({ voiceId: id, voiceRate: rate }),

            setInput: (input) => set({ input }),
            setIsOpen: (isOpen) => set({ isOpen }),

            checkStatus: async () => {
                const isRunning = await checkOllamaStatus();
                set({ isOllamaRunning: isRunning });
                if (isRunning) {
                    get().fetchModels();
                }
            },

            fetchModels: async () => {
                try {
                    const models = await getOllamaModels();
                    set({ availableModels: models });
                    const current = get().selectedModel;
                    if (models.length > 0 && !models.includes(current)) {
                        set({ selectedModel: models[0] });
                    }
                } catch (e) {
                    console.error('Failed to fetch models', e);
                }
            },

            selectModel: (model) => set({ selectedModel: model }),

            sendMessage: async (content) => {
                let { selectedModel, messages } = get();

                // Ensure models are loaded and select a valid one
                if (get().availableModels.length === 0) {
                    try {
                        const models = await getOllamaModels();
                        set({ availableModels: models, isOllamaRunning: true });
                    } catch (err) {
                        console.warn('Could not fetch models:', err);
                    }
                }

                const available = get().availableModels;
                if (available.length > 0 && !available.includes(selectedModel)) {
                    console.warn(`[AI] Model '${selectedModel}' not found.Falling back to '${available[0]}'`);
                    selectedModel = available[0];
                    set({ selectedModel });
                }

                // 1. Prepare Messages
                const { VoiceService } = await import('../lib/voice');

                const startBargeInListening = () => {
                    // Don't listen if voice mode off OR mic explicitly muted
                    if (!get().isVoiceMode || get().preferMicMuted) return;

                    set({ isListening: true });
                    VoiceService.initRecognition(
                        (text) => {
                            set({ input: text });

                            // BARGE-IN: If we detect speech while AI is speaking, stop the AI!
                            if (get().isSpeaking) {
                                console.log('Barge-in detected, stopping TTS');
                                VoiceService.stopSpeaking();
                                set({ isSpeaking: false });
                            }
                        },
                        () => {
                            // on silence/end of user speech
                            set({ isListening: false });

                            // Auto-send if text is substantive
                            const currentInput = get().input;
                            if (currentInput && currentInput.trim().length >= 2) {
                                get().sendMessage(currentInput);
                                set({ input: '' });
                            } else {
                                // If no substantive input, restart listening loop if still in voice mode and NOT MUTED
                                if (get().isVoiceMode && !get().isLoading && !get().preferMicMuted) {
                                    setTimeout(() => {
                                        const { isListening, isVoiceMode, preferMicMuted } = get();
                                        if (isVoiceMode && !isListening && !preferMicMuted) {
                                            startBargeInListening();
                                        }
                                    }, 100);
                                }
                            }
                        },
                        () => {
                            set({ isListening: false });
                        }
                    );
                    VoiceService.startListening();
                };

                let currentMessages = [...messages];

                // Inject System Prompt if new session
                if (currentMessages.length === 0) {
                    const { settings } = useSettingsStore.getState();
                    let finalPrompt = SYSTEM_PROMPT;

                    // Add personalization info
                    const personalInfo: string[] = [];
                    if (settings.userName) {
                        personalInfo.push(`The user's name is ${settings.userName}. Address them by name when appropriate.`);
                    }
                    if (settings.userBirthday) {
                        const today = new Date();
                        const bday = new Date(settings.userBirthday);
                        const isBirthday = today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
                        if (isBirthday) {
                            personalInfo.push(`Today is ${settings.userName || 'the user'}'s birthday! Wish them a happy birthday!`);
                        }
                    }
                    if (personalInfo.length > 0) {
                        finalPrompt += `\n\n### PERSONALIZATION\n${personalInfo.join('\n')}\n`;
                    }

                    if (settings.aiMemory) {
                        finalPrompt += `\n\n### USER MEMORY / CUSTOM INSTRUCTIONS\n${settings.aiMemory}\n`;
                    }
                    currentMessages.push({ role: 'system', content: finalPrompt });
                }

                // Add User Message
                currentMessages.push({ role: 'user', content });

                // UI Update: loading
                set({ messages: currentMessages, isLoading: true, error: null });

                try {
                    // 2. Loop until no more tools are called (max 3 turns to prevent loops)
                    let turnCount = 0;
                    const MAX_TURNS = 3;

                    while (turnCount < MAX_TURNS) {
                        turnCount++;

                        // 2. FRESH CONTEXT INJECTION
                        if (turnCount === 1) {
                            const vault = useVaultStore.getState().currentVault;
                            const activeNoteId = useVaultStore.getState().activeNoteId;

                            // Remove ALL stale knowledge blocks to keep conversation focused
                            currentMessages = currentMessages.filter(m =>
                                !(m.role === 'system' && m.content.includes('KNOWLEDGE BASE CONTEXT'))
                            );

                            if (vault) {
                                try {
                                    set({ processingTool: 'reading_notes' });
                                    let contextBlocks: string[] = [];

                                    // A. Active Note (The Source of Truth) - ALWAYS inject if available
                                    if (activeNoteId) {
                                        try {
                                            const { loadNote } = await import('../lib/tauri');
                                            const activeNote = await loadNote(activeNoteId);
                                            contextBlocks.push(`[ACTIVE NOTE / PRIMARY SUBJECT]\nPath: ${activeNote.path}\nTitle: ${activeNote.title}\nContent:\n${activeNote.content}\n`);
                                        } catch (e) {
                                            console.warn('Context: Failed to load active note', e);
                                        }
                                    }

                                    // B. Auto-Search (Secondary Context)
                                    const substantiveQuery = content.trim().split(/\s+/).length > 2;

                                    if (substantiveQuery) {
                                        const results = await searchNotes(vault.path, content);
                                        const topResults = results.slice(0, 2).filter(r => r.path !== activeNoteId);

                                        if (topResults.length > 0) {
                                            const { loadNote } = await import('../lib/tauri');
                                            const notes = await Promise.all(topResults.map(r => loadNote(r.path)));
                                            const ragBlock = notes.map(n => `Title: ${n.title} \n${n.content} \n`).join('\n');
                                            contextBlocks.push(`[ADDITIONAL VAULT CONTEXT]\n${ragBlock} `);
                                        }
                                    }

                                    if (contextBlocks.length > 0) {
                                        currentMessages.splice(currentMessages.length - 1, 0, {
                                            role: 'system',
                                            content: `[KNOWLEDGE BASE CONTEXT]\n\n${contextBlocks.join('\n\n')} \n\n[USER FOCUS]\nThe user is talking about the ACTIVE NOTE path: "${activeNoteId}".\nCRITICAL: When editing, you MUST provide the FULL content of the note.DO NOT overwrite the note with just your changes.`
                                        });
                                    }
                                } catch (err) {
                                    console.error('Context failed:', err);
                                }
                            }
                        }

                        // C. Plugins / Commands Context
                        try {
                            const { pluginManager } = await import('../plugins/manager');
                            const commands = pluginManager.getAllCommands();

                            if (commands.length > 0) {
                                const commandList = commands
                                    .map(c => `- id: "${c.id}", name: "${c.name}", description: "${c.description || c.name}"`)
                                    .join('\n');

                                currentMessages.splice(currentMessages.length - 1, 0, {
                                    role: 'system',
                                    content: `[AVAILABLE COMMANDS / PLUGINS]\nThe following commands are available to control the application: \n${commandList} \n\nTo use one, return the JSON tool call: { "tool": "invoke_command", "args": { "id": "COMMAND_ID" } } `
                                });
                            }
                        } catch (e) {
                            console.warn('Context: Failed to load commands', e);
                        }

                        set({ processingTool: null });

                        // 3. DYNAMIC SYSTEM INSTRUCTION
                        // Clean up ALL previous system reminders
                        currentMessages = currentMessages.filter(m => !m.content.startsWith('SYSTEM REMINDER:'));

                        // Find index of last user message
                        const lastUserIndex = currentMessages.map(m => m.role).lastIndexOf('user');
                        const sinceLastUser = currentMessages.slice(lastUserIndex === -1 ? 0 : lastUserIndex);

                        let hasExecutedTool = sinceLastUser.some(m => m.role === 'system' && m.content.startsWith('Tool Output:'));

                        if (hasExecutedTool) {
                            currentMessages.push({
                                role: 'system',
                                content: 'SYSTEM REMINDER: Tool executed successfully. Respond with a natural, conversational confirmation (e.g. "I\'ve inserted the date" or "Timer started"). DO NOT repeat the user\'s exact command verbatim.'
                            });
                        }

                        // Call AI
                        console.log('[AI] Sending payload:', currentMessages);
                        const response = await chatOllama(selectedModel, currentMessages);
                        console.log('[AI] Raw response:', response);

                        // Parse for Tool Call
                        let toolCall = parseToolCall(response);

                        // CRITICAL: Prevent the AI from looping on the same tool if it already ran
                        if (toolCall && hasExecutedTool) {
                            console.warn('AI tried to call a tool after execution. Stripping tool call.');

                            // Use aggressive stripper to remove all JSON artifacts
                            const textSummary = stripJSON(response);

                            const finalContent = textSummary || 'I have successfully completed that action for you.';
                            currentMessages.push({ role: 'assistant', content: finalContent });

                            set({ messages: currentMessages, isLoading: false, processingTool: null });

                            // TTS & Restart Listening
                            if (get().isVoiceMode) {
                                const { voiceId, voiceRate, preferMicMuted, isListening, isVoiceMode } = get();
                                VoiceService.speak(finalContent, () => {
                                    set({ isSpeaking: false });
                                    if (isVoiceMode && !isListening && !preferMicMuted) {
                                        startBargeInListening();
                                    }
                                }, { voiceId, rate: voiceRate });
                            }

                            break; // Done
                        }

                        if (toolCall) {
                            // ... tool execution logic ...
                            console.log('Tool detected:', toolCall);

                            // PHANTOM TURN INJECTION
                            // Force a generic message to prevent the AI from "thinking aloud" or leaking content
                            // before the tool actually runs.
                            const phantomText = `[PHANTOM] Executing tool: ${toolCall.tool} `;
                            currentMessages.push({ role: 'assistant', content: phantomText });

                            // Execute Tool
                            let toolResult = '';
                            try {
                                const vault = useVaultStore.getState().currentVault;
                                if (!vault) throw new Error('No vault open');

                                if (toolCall.tool === 'create_note') {
                                    const { title, content } = toolCall.args;
                                    const note = await createNote(vault.path, title, content);

                                    // Refresh vault state
                                    const { addNote, setNoteMetadata, setActiveNote } = useVaultStore.getState();
                                    const { setCurrentView } = useUIStore.getState();

                                    addNote(note); // Update editor/cache
                                    setActiveNote(note.id); // Switch to the new note
                                    setCurrentView('editor'); // Ensure we are in editor view

                                    // Refresh sidebar
                                    const { loadNotesMetadata } = await import('../lib/tauri');
                                    const metadata = await loadNotesMetadata(vault.path);
                                    setNoteMetadata(metadata);

                                    toolResult = `Success: Note "${note.title}" created at ${note.path} `;
                                } else if (toolCall.tool === 'search_notes') {
                                    const { query } = toolCall.args;
                                    const results = await searchNotes(vault.path, query);

                                    if (results.length > 0) {
                                        // Open the first result
                                        const firstResult = results[0];
                                        const { setActiveNote, addNote } = useVaultStore.getState();
                                        const { setCurrentView } = useUIStore.getState();

                                        // Load the full note content
                                        const { loadNote } = await import('../lib/tauri');
                                        const fullNote = await loadNote(firstResult.path);
                                        addNote({ ...fullNote, id: firstResult.path });
                                        setActiveNote(firstResult.path);
                                        setCurrentView('editor');

                                        toolResult = `Found ${results.length} note(s).Opened "${firstResult.title}".` +
                                            (results.length > 1 ? `\nOther matches: ${results.slice(1).map(n => n.title).join(', ')} ` : '');
                                    } else {
                                        toolResult = `No notes found matching "${query}".`;
                                    }
                                } else if (toolCall.tool === 'read_note') {
                                    const { path } = toolCall.args;
                                    const { loadNote } = await import('../lib/tauri');
                                    const note = await loadNote(path);
                                    toolResult = `Title: ${note.title} \nContent: \n${note.content} `;
                                } else if (toolCall.tool === 'edit_note') {
                                    let { path, content } = toolCall.args;

                                    // Fallback for empty path
                                    if (!path || path === "") {
                                        path = useVaultStore.getState().activeNoteId || "";
                                    }
                                    if (!path) throw new Error("No path provided for edit_note and no active note found.");

                                    const { updateNote, setNoteMetadata } = useVaultStore.getState();

                                    // Save to disk
                                    const { saveNote, loadNotesMetadata } = await import('../lib/tauri');
                                    await saveNote({ path, content } as any);

                                    // Update local editor state
                                    updateNote(path, { content });

                                    // Refresh sidebar metadata
                                    if (vault) {
                                        const metadata = await loadNotesMetadata(vault.path);
                                        setNoteMetadata(metadata);
                                    }

                                    const filename = path.split(/[/\\]/).pop()?.replace('.md', '') || 'Note';
                                    toolResult = `Success: Updated note "${filename}" at ${path} `;
                                } else if (toolCall.tool === 'replace_text') {
                                    const { original, replacement } = toolCall.args;
                                    const activeNoteId = useVaultStore.getState().activeNoteId;

                                    if (!activeNoteId) throw new Error('No active note to perform text replacement.');

                                    const { loadNote } = await import('../lib/tauri');
                                    const activeNote = await loadNote(activeNoteId);

                                    if (activeNote.content.includes(original)) {
                                        const newContent = activeNote.content.replace(original, replacement);
                                        const { updateNote, setNoteMetadata } = useVaultStore.getState();
                                        const { saveNote, loadNotesMetadata } = await import('../lib/tauri');

                                        await saveNote({ ...activeNote, content: newContent });
                                        updateNote(activeNoteId, { content: newContent });

                                        if (vault) {
                                            const metadata = await loadNotesMetadata(vault.path);
                                            setNoteMetadata(metadata);
                                        }
                                        toolResult = `Success: Replaced text in note "${activeNote.title}" at ${activeNote.path} `;
                                    } else {
                                        toolResult = `Error: Original text "${original}" not found in the active note "${activeNote.title}".`;
                                    }
                                } else if (toolCall.tool === 'save_memory') {
                                    const { content } = toolCall.args;
                                    const { settings, updateSettings } = useSettingsStore.getState();

                                    const currentMemory = settings.aiMemory || '';
                                    const updatedMemory = currentMemory
                                        ? `${currentMemory.trim()} \n - ${content} `
                                        : `- ${content} `;

                                    updateSettings({ aiMemory: updatedMemory });
                                    toolResult = `Success: Information saved to memory.`;
                                } else if (toolCall.tool === 'invoke_command') {
                                    const { id } = toolCall.args;
                                    const { pluginManager } = await import('../plugins/manager');

                                    const commands = pluginManager.getAllCommands();
                                    const command = commands.find(c => c.id === id);

                                    await pluginManager.executeCommand(id);
                                    toolResult = `Success: Command "${command ? command.name : id}" executed.\n\n[SYSTEM INSTRUCTION] Respond with a short confirmation using the past tense (e.g. "I ran the command" or "Date inserted"). DO NOT echo the command name as a statement.`;
                                } else {
                                    toolResult = `Error: Unknown tool "${toolCall.tool}"`;
                                }
                            } catch (err: any) {
                                console.error('Tool execution failed:', err);
                                toolResult = `Error executing tool: ${err.message} `;
                            }

                            currentMessages.push({
                                role: 'system',
                                content: `Tool Output: ${toolResult} `
                            });

                            set({ messages: [...currentMessages], processingTool: null });
                            continue;

                        } else {
                            // Regular response
                            const cleanResponse = stripJSON(response);
                            if (cleanResponse && cleanResponse.trim().length > 0) {
                                currentMessages.push({ role: 'assistant', content: cleanResponse });
                            } else {
                                // Fallback for when parseToolCall fails
                                currentMessages.push({
                                    role: 'assistant',
                                    content: "I attempted to perform the action, but I encountered a technical issue with the output format. Please try again or rephrase."
                                });
                            }

                            set({ messages: currentMessages, isLoading: false, processingTool: null });

                            // TTS: Speak the core response if in Voice Mode
                            if (get().isVoiceMode && cleanResponse) {
                                set({ isSpeaking: true });

                                if (!get().preferMicMuted) {
                                    startBargeInListening();
                                }

                                VoiceService.speak(cleanResponse, () => {
                                    set({ isSpeaking: false });
                                    const { isListening, isVoiceMode, preferMicMuted } = get();
                                    if (isVoiceMode && !isListening && !preferMicMuted) {
                                        startBargeInListening();
                                    }
                                }, { voiceId: get().voiceId, rate: get().voiceRate });
                            }

                            break; // Done
                        }
                    }

                    // Safety: Ensure loading stops
                    set({ isLoading: false, processingTool: null });

                } catch (e) {
                    console.error('Chat failed', e);
                    set({
                        isLoading: false,
                        processingTool: null,
                        error: 'Failed to communicate with AI agent.'
                    });
                }
            },

            askAboutNote: async (noteId: string, question: string) => {
                const vault = useVaultStore.getState().currentVault;

                if (!vault) {
                    set({ error: 'No vault open' });
                    return;
                }

                try {
                    // Load the note content
                    const { loadNote } = await import('../lib/tauri');
                    const note = await loadNote(noteId);

                    // Create a fresh message set with a Q&A-focused prompt (no tool calling)
                    const messages: OllamaMessage[] = [
                        {
                            role: 'system',
                            content: `You are a helpful assistant.Answer the user's question based on the following note. Be conversational and direct. Do NOT use JSON or tools. Just answer naturally.

Note Title: ${note.title}

Note Content:
${note.content} `
                        },
                        { role: 'user', content: question }
                    ];

                    set({ isLoading: true, isOpen: true, error: null });

                    // Get response
                    const response = await chatOllama(get().selectedModel, messages);

                    // Add to existing chat history for display
                    const currentMessages = get().messages;
                    const updatedMessages: OllamaMessage[] = [
                        ...currentMessages,
                        { role: 'user', content: question },
                        { role: 'assistant', content: response }
                    ];

                    set({ messages: updatedMessages, isLoading: false });
                } catch (e) {
                    console.error('Failed to ask about note:', e);
                    set({
                        isLoading: false,
                        error: 'Failed to communicate with AI.'
                    });
                }
            },

            summarizeNote: async (noteId: string) => {
                console.log('[AI] summarizeNote called for:', noteId);
                const vault = useVaultStore.getState().currentVault;

                if (!vault) {
                    console.error('[AI] No vault open');
                    set({ error: 'No vault open' });
                    return;
                }

                try {
                    // Load the note content
                    const { loadNote } = await import('../lib/tauri');
                    const note = await loadNote(noteId);
                    console.log('[AI] Note loaded:', note.title, 'Length:', note.content.length);

                    // Create messages
                    const messages: OllamaMessage[] = [
                        { role: 'system', content: 'You are a helpful assistant that creates concise summaries.' },
                        {
                            role: 'user',
                            content: `Summarize the following note in 2 - 3 sentences: \n\nTitle: ${note.title} \n\n${note.content} `
                        }
                    ];

                    set({ isLoading: true, isOpen: true, error: null });

                    // Ensure models are loaded
                    if (get().availableModels.length === 0) {
                        try {
                            const models = await getOllamaModels();
                            set({ availableModels: models, isOllamaRunning: true });
                        } catch (err) {
                            console.warn('Could not fetch models before summary:', err);
                        }
                    }

                    let model = get().selectedModel;
                    const available = get().availableModels;

                    // Auto-fix model selection if current one isn't valid
                    if (available.length > 0 && !available.includes(model)) {
                        console.warn(`[AI] Selected model '${model}' not found in available list.Falling back to '${available[0]}'`);
                        model = available[0];
                        set({ selectedModel: model });
                    }

                    console.log('[AI] Using model:', model);

                    // Get response
                    const response = await chatOllama(model, messages);
                    console.log('[AI] Response received:', response ? response.slice(0, 50) + '...' : 'EMPTY');

                    // Add to chat with context
                    const currentMessages = get().messages;
                    const updatedMessages: OllamaMessage[] = [
                        { role: 'system', content: `Note: ${note.title} ` },
                        { role: 'user', content: 'Summarize this note' },
                        { role: 'assistant', content: response }
                    ];

                    set({ messages: [...currentMessages, ...updatedMessages], isLoading: false });
                } catch (e) {
                    console.error('Failed to summarize note:', e);
                    set({
                        isLoading: false,
                        error: 'Failed to summarize note: ' + (e as Error).message
                    });
                }
            },

            editNoteWithAI: async (noteId: string, instruction: string) => {
                const vault = useVaultStore.getState().currentVault;

                if (!vault) {
                    set({ error: 'No vault open' });
                    return;
                }

                try {
                    // Load the note content
                    const { loadNote } = await import('../lib/tauri');
                    const note = await loadNote(noteId);

                    // Create messages
                    const messages: OllamaMessage[] = [
                        {
                            role: 'system',
                            content: 'You are a helpful editor. Edit the following content based on user\'s instruction. Return ONLY the edited markdown content, no explanations or extra text.'
                        },
                        {
                            role: 'user',
                            content: `Title: ${note.title} \n\nContent: \n${note.content} \n\nInstruction: ${instruction} `
                        }
                    ];

                    set({ isLoading: true, error: null });

                    // Get response
                    const response = await chatOllama(get().selectedModel, messages);

                    // Save edited note
                    const editedNote = { ...note, content: response };
                    const { saveNote } = await import('../lib/tauri');
                    await saveNote(editedNote);

                    // Update store
                    useVaultStore.getState().updateNote(noteId, { content: response });

                    set({ isLoading: false });

                    // Show success in chat
                    const currentMessages = get().messages;
                    const updatedMessages: OllamaMessage[] = [
                        { role: 'system', content: `Note edited: ${note.title} ` },
                        { role: 'assistant', content: `I've edited the note "${note.title}" as requested.` }
                    ];
                    set({ messages: [...currentMessages, ...updatedMessages] });
                } catch (e) {
                    console.error('Failed to edit note:', e);
                    set({
                        isLoading: false,
                        error: 'Failed to edit note.'
                    });
                }
            },

            clearChat: () => set({ messages: [], error: null }),

            stopPodcast: () => {
                import('../lib/kokoro').then(({ kokoroService }) => {
                    kokoroService.stop();
                });
                set({
                    podcastStatus: 'stopped',
                    podcastCurrentSpeaker: null,
                    podcastCurrentText: null
                });
            },

            pausePodcast: () => {
                import('../lib/kokoro').then(({ kokoroService }) => {
                    kokoroService.pause();
                });
                set({ podcastStatus: 'paused' });
            },

            resumePodcast: () => {
                import('../lib/kokoro').then(({ kokoroService }) => {
                    kokoroService.resume();
                });
                set({ podcastStatus: 'playing' });
            },

            generatePodcast: async (noteId: string) => {
                const { notes } = useVaultStore.getState();
                const note = notes.get(noteId);
                if (!note) {
                    set({ error: 'Note not found' });
                    return;
                }

                set({
                    podcastStatus: 'generating',
                    podcastCurrentSpeaker: null,
                    podcastCurrentText: null,
                    error: null
                });

                try {
                    const { settings } = useSettingsStore.getState();
                    const model = get().selectedModel || settings.ollamaModel || 'llama3.1:8b';

                    const podcastPrompt = `Generate a natural, engaging podcast conversation between two hosts discussing the following content.

HOSTS:
- ALEX: Curious host, asks insightful questions, keeps the conversation flowing
- SAM: Expert host, explains concepts clearly, adds interesting insights

FORMAT: Each line must start with either "ALEX:" or "SAM:" followed by their dialogue.

EXAMPLE OUTPUT:
ALEX: Welcome everyone! Today we're diving into something really fascinating.
SAM: Absolutely! I'm excited to break this down for our listeners.
ALEX: So let's start with the basics. What's the main idea here?
SAM: Well, the core concept is actually quite elegant...

RULES:
- MUST alternate between ALEX and SAM
- Each line MUST start with the speaker name followed by a colon
- Aim for 8-12 exchanges total
- Keep each response 1-3 sentences
- Start with ALEX, end with SAM

CONTENT TO DISCUSS:
---
${note.title}

${note.content.substring(0, 3000)}
---

Now generate the podcast conversation. Remember to alternate speakers:`;

                    console.log('[Podcast] Generating script with model:', model);
                    const response = await chatOllama(model, [
                        { role: 'user', content: podcastPrompt }
                    ]);

                    console.log('[Podcast] Raw response:', response);

                    // Parse the conversation into segments
                    const lines = response.split('\n').filter(line => line.trim());
                    const segments: Array<{ text: string; voiceId: string; speaker: string }> = [];

                    for (const line of lines) {
                        // More flexible regex - handle variations like "Alex:", "ALEX:", "Alex :"
                        const alexMatch = line.match(/^(?:\*\*)?ALEX(?:\*\*)?[:\s]+(.+)/i);
                        const samMatch = line.match(/^(?:\*\*)?SAM(?:\*\*)?[:\s]+(.+)/i);

                        if (alexMatch) {
                            segments.push({
                                text: alexMatch[1].trim().replace(/^\*\*|\*\*$/g, ''),
                                voiceId: 'af_heart', // Female voice
                                speaker: 'Alex'
                            });
                        } else if (samMatch) {
                            segments.push({
                                text: samMatch[1].trim().replace(/^\*\*|\*\*$/g, ''),
                                voiceId: 'am_adam', // Male voice
                                speaker: 'Sam'
                            });
                        }
                    }

                    console.log('[Podcast] Parsed segments:', segments.length, segments.map(s => s.speaker));

                    if (segments.length === 0) {
                        set({
                            podcastStatus: 'idle',
                            error: 'Failed to generate podcast script'
                        });
                        return;
                    }

                    set({ podcastStatus: 'playing', podcastSegments: segments });

                    // Import and play with Kokoro
                    const { kokoroService } = await import('../lib/kokoro');

                    await kokoroService.speakSegments(
                        segments,
                        (index, text) => {
                            set({
                                podcastCurrentSpeaker: segments[index].speaker,
                                podcastCurrentText: text
                            });
                        },
                        () => {
                            set({
                                podcastStatus: 'idle',
                                podcastCurrentSpeaker: null,
                                podcastCurrentText: null
                            });
                        }
                    );

                } catch (e) {
                    console.error('Podcast generation failed:', e);
                    set({
                        podcastStatus: 'idle',
                        error: 'Failed to generate podcast'
                    });
                }
            },

            clearGeneratedContent: () => {
                set({ generatedFlashcards: [], generatedQuiz: [] });
            },

            generateFlashcards: async (noteId: string) => {
                const { notes } = useVaultStore.getState();
                const note = notes.get(noteId);
                if (!note) {
                    set({ error: 'Note not found' });
                    return;
                }

                set({ isLoading: true, error: null, generatedFlashcards: [] });

                try {
                    const model = get().selectedModel;
                    const prompt = `Generate 5-8 flashcards from the following content. Each flashcard should have a clear question (front) and concise answer (back).

IMPORTANT: Return ONLY a valid JSON array with no extra text. Format:
[
  {"front": "Question 1?", "back": "Answer 1"},
  {"front": "Question 2?", "back": "Answer 2"}
]

Content to create flashcards from:
---
${note.title}

${note.content.substring(0, 4000)}
---

Return ONLY the JSON array:`;

                    const response = await chatOllama(model, [{ role: 'user', content: prompt }]);

                    // Parse JSON from response
                    const jsonMatch = response.match(/\[[\s\S]*\]/);
                    if (!jsonMatch) {
                        throw new Error('No valid JSON array found in response');
                    }

                    const flashcards = JSON.parse(jsonMatch[0]) as Array<{ front: string; back: string }>;
                    console.log('[Flashcards] Generated:', flashcards.length, 'cards');

                    set({ generatedFlashcards: flashcards, isLoading: false });
                } catch (e) {
                    console.error('Flashcard generation failed:', e);
                    set({ isLoading: false, error: 'Failed to generate flashcards' });
                }
            },

            generateQuiz: async (noteId: string) => {
                const { notes } = useVaultStore.getState();
                const note = notes.get(noteId);
                if (!note) {
                    set({ error: 'Note not found' });
                    return;
                }

                set({ isLoading: true, error: null, generatedQuiz: [] });

                try {
                    const model = get().selectedModel;
                    const prompt = `Generate 5 multiple choice quiz questions from the following content. Each question should have 4 options with only one correct answer.

IMPORTANT: Return ONLY a valid JSON array with no extra text. Format:
[
  {"question": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0}
]

correctIndex is the 0-based index of the correct option (0, 1, 2, or 3).

Content to create quiz from:
---
${note.title}

${note.content.substring(0, 4000)}
---

Return ONLY the JSON array:`;

                    const response = await chatOllama(model, [{ role: 'user', content: prompt }]);

                    // Parse JSON from response
                    const jsonMatch = response.match(/\[[\s\S]*\]/);
                    if (!jsonMatch) {
                        throw new Error('No valid JSON array found in response');
                    }

                    const quiz = JSON.parse(jsonMatch[0]) as Array<{ question: string; options: string[]; correctIndex: number }>;
                    console.log('[Quiz] Generated:', quiz.length, 'questions');

                    set({ generatedQuiz: quiz, isLoading: false });
                } catch (e) {
                    console.error('Quiz generation failed:', e);
                    set({ isLoading: false, error: 'Failed to generate quiz' });
                }
            }
        }),
        {
            name: 'synaptic-ai-storage',
            partialize: (state) => ({
                messages: state.messages,
                selectedModel: state.selectedModel,
                voiceId: state.voiceId,
                voiceRate: state.voiceRate
            })
        }
    )
);

/**
 * Extremely aggressive helper to strip any JSON-like blocks or stray braces 
 * that are often left over by LLMs during tool-calling turns.
 */
function stripJSON(content: string): string {
    let cleaned = content;

    // 1. Remove blocks starting with internal instruction headers (Prompt Scrubbing)
    const technicalBlocks = [
        /###\s+(?:CAPABILITIES|RULES|TOOLS|KNOWLEDGE)/gi,
        /\[(?:INFORMATION|ACTION|USER|SYSTEM)\s+PHASE\]/gi,
        /\[ACTIVE NOTE\]/gi,
        /\[USER FOCUS\]/gi,
        /NEVER suggest or hallucinate/gi,
        /NEVER repeat or echo/gi,
        /Assume "(?:this|it|they|them)" refers to/gi
    ];

    technicalBlocks.forEach(regex => {
        cleaned = cleaned.replace(new RegExp(regex.source + "[\\s\\S]*?(?=###|\\[|$)", "gi"), "");
    });

    // 2. Remove Markdown code blocks
    cleaned = cleaned.replace(/```(?:json)?\s*[\s\S]*?\s*```/g, '').trim();

    // 3. Remove loose JSON tool blocks (Robust handling for nested braces)
    let startIndex = cleaned.indexOf('{');
    while (startIndex !== -1) {
        // Check if this looks like a tool call
        if (cleaned.substring(startIndex, startIndex + 50).includes('"tool"')) {
            let braceCount = 0;
            let endIndex = -1;
            for (let i = startIndex; i < cleaned.length; i++) {
                if (cleaned[i] === '{') braceCount++;
                else if (cleaned[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }

            if (endIndex !== -1) {
                // Remove the entire block
                cleaned = cleaned.substring(0, startIndex) + cleaned.substring(endIndex + 1);
                // Re-check from the same index (as content shifted)
                startIndex = cleaned.indexOf('{', startIndex);
                continue;
            }
        }
        // Move to next {
        startIndex = cleaned.indexOf('{', startIndex + 1);
    }

    cleaned = cleaned.trim();

    // 4. Remove fake JSON result wrappers (Summarization Fix)
    cleaned = cleaned.replace(/\{[\s\S]*?"result"[\s\S]*?\}/g, (match) => {
        try {
            const parsed = JSON.parse(match);
            return parsed.result || match;
        } catch (e) { return match; }
    }).trim();

    // 4. Remove common LLM tool-calling preambles
    const fillerPhrases = [
        /here is the (?:json|output):?/gi,
        /i'll (?:use|call) the [a-z0-9_]+ tool:?/gi,
        /i will (?:add|change|insert|update) this note:?/gi,
        /applying (?:changes|updates):?/gi,
        /certainly!? i'd be happy to help/gi,
        /i'm happy to help!?/gi,
        /since you asked me/gi
    ];

    fillerPhrases.forEach(regex => {
        cleaned = cleaned.replace(regex, '').trim();
    });

    // 5. Remove stray technical debris and balancing artifacts
    cleaned = cleaned.replace(/^[\s\r\n}]+/, '').trim();
    cleaned = cleaned.replace(/[\s\r\n}]+$/, '').trim();

    return cleaned;
}

function parseToolCall(content: string): { tool: string, args: any } | null {
    try {
        // 0. NEW: Check if response starts with a JSON tool call (AI following instructions well)
        const trimmed = content.trim();
        if (trimmed.startsWith('{"tool"')) {
            console.log('[parseToolCall] Detected JSON-first response');
            try {
                // Find matching closing brace
                let braceCount = 0;
                let endIndex = -1;
                for (let i = 0; i < trimmed.length; i++) {
                    if (trimmed[i] === '{') braceCount++;
                    else if (trimmed[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i;
                            break;
                        }
                    }
                }

                if (endIndex > 0) {
                    let jsonStr = trimmed.substring(0, endIndex + 1);

                    // Fix unescaped newlines in string values
                    jsonStr = jsonStr.replace(/"([^"]*(?:[^"\\]|\\.)*)"/g, (match, body) => {
                        // Only process if it contains actual newlines
                        if (body.includes('\n') || body.includes('\r')) {
                            let fixed = body
                                .replace(/\r\n/g, '\\n')
                                .replace(/\n/g, '\\n')
                                .replace(/\r/g, '');
                            return '"' + fixed + '"';
                        }
                        return match;
                    });

                    const parsed = JSON.parse(jsonStr);
                    if (parsed && parsed.tool) {
                        console.log('[parseToolCall] Successfully parsed:', parsed.tool);
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn('[parseToolCall] JSON-first parse failed, falling back:', e);
            }
        }

        // 1. Priority: Markdown JSON blocks
        // Fix: Use greedy extraction for nested code blocks
        const firstTick = content.indexOf('```');
        const lastTick = content.lastIndexOf('```');

        if (firstTick !== -1 && lastTick !== -1 && lastTick > firstTick) {
            try {
                // Extract everything between first ```(json)? and last ```
                let jsonStr = content.substring(firstTick, lastTick);
                // Remove the first line (```json)
                jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '');

                // Fix newlines and invalid escapes in strings
                const cleanedJson = jsonStr.trim().replace(/"((?:[^"\\]|\\.|[\r\n])*)"/g, (_match, body) => {
                    // 1. Fix newlines
                    let fixed = body.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '');
                    // 2. Fix invalid escapes
                    fixed = fixed.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
                    return '"' + fixed + '"';
                });

                // Fix trailing commas
                const finalJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');

                const parsed = JSON.parse(finalJson);
                if (parsed && typeof parsed === 'object' && 'tool' in parsed) return parsed;
                if (parsed && typeof parsed === 'object' && ('path' in parsed || 'content' in parsed || 'title' in parsed)) {
                    // It's a raw args object, we need to find the tool name nearby
                    const toolNameMatch = content.match(/\b(edit_note|create_note|search_notes|read_note)\b/i);
                    if (toolNameMatch) return { tool: toolNameMatch[1].toLowerCase(), args: parsed };
                }
            } catch (e) {
                console.warn('Failed to parse JSON from markdown block', e);
            }
        }

        // 2. Informal Pattern: TOOL_NAME { ...JSON... }
        const informalMatch = content.match(/\b(edit_note|create_note|search_notes|read_note)\b\s*(\{[\s\S]*?\})/i);
        if (informalMatch) {
            try {
                const toolName = informalMatch[1].toLowerCase();
                const jsonStr = informalMatch[2];
                const cleanedJson = jsonStr.replace(/"((?:[^"\\]|\\.|[\r\n])*)"/g, (_match, body) => {
                    let fixed = body.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '');
                    fixed = fixed.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
                    return '"' + fixed + '"';
                });
                const args = JSON.parse(cleanedJson);
                return { tool: toolName, args };
            } catch (e) { }
        }

        // 3. Fallback: Find any block that looks like a tool call
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        let jsonStr = '';

        if (start !== -1 && end !== -1 && end > start) {
            jsonStr = content.substring(start, end + 1);
            const cleanedJson = jsonStr.replace(/"((?:[^"\\]|\\.|[\r\n])*)"/g, (_match, body) => {
                let fixed = body.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '');
                fixed = fixed.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
                return '"' + fixed + '"';
            });
            // Fix trailing commas
            const finalJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');

            try {
                const parsed = JSON.parse(finalJson);
                if (parsed && typeof parsed === 'object') {
                    if ('tool' in parsed) return parsed;
                    // Check if it looks like arguments
                    if ('content' in parsed || 'path' in parsed || 'query' in parsed) {
                        const toolNameMatch = content.match(/\b(edit_note|create_note|search_notes|read_note)\b/i);
                        if (toolNameMatch) return { tool: toolNameMatch[1].toLowerCase(), args: parsed };
                    }
                }
            } catch (e) {
                // 4. Last Resort: Manual Regex Extraction (For unescaped quotes in content)
                // If JSON parse failed, try to pull out fields manually
                const toolMatch = jsonStr.match(/"tool"\s*:\s*"([^"]+)"/);
                if (toolMatch) {
                    const tool = toolMatch[1].toLowerCase();
                    const args: any = {};

                    // Extract Path
                    const pathMatch = jsonStr.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (pathMatch) args.path = pathMatch[1];

                    // Extract Title
                    const titleMatch = jsonStr.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                    if (titleMatch) args.title = titleMatch[1];

                    // Extract Content - Greedy fuzzy match
                    // Look for "content": " ... and take until the end, attempting to trim valid suffixes
                    const contentStartRegex = /"content"\s*:\s*"/g;
                    const contentStart = contentStartRegex.exec(jsonStr);
                    if (contentStart) {
                        // We assume the content starts here. We take everything until the last " } or " }
                        // This is heuristic and risky, but better than total failure for "Add Table" actions.
                        let rawContent = jsonStr.substring(contentStart.index + contentStart[0].length);
                        // Remove trailing JSON closing structure
                        rawContent = rawContent.replace(/\s*}\s*}\s*$/, '').replace(/\s*}\s*$/, '');
                        // Remove last quote if present
                        if (rawContent.endsWith('"')) rawContent = rawContent.slice(0, -1);

                        // Unescape the raw JSON string content
                        // ORDER MATTERS: Fix double-backslashes FIRST, then control chars
                        args.content = rawContent
                            .replace(/\\\\/g, '\\')       // 1. \\ -> \
                            .replace(/\\n/g, '\n')        // 2. \n -> newline (Byte 10)
                            .replace(/\\r/g, '')          // 3. Remove \r
                            .replace(/\\"/g, '"')         // 4. \" -> "
                            .replace(/\\t/g, '\t');       // 5. \t -> tab
                    }

                    return { tool, args };
                }
            }
        }
    } catch (e) { }
    return null;
}
