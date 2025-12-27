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
import { saveNote } from '../lib';

const SYSTEM_PROMPT = `
You are Synaptic AI, a knowledge base assistant.

### MODES
1. **INFORMATION** ("Summarize", "Explain", "What is"):
   - Output NATURAL TEXT. Do NOT use tools or JSON.
   - Just talk to the user normally.

2. **ACTION** ("Add", "Change", "Create", "Fix"):
   - Output JSON ONLY.
   - Use "create_note" for new notes.
   - Use "edit_note" to add text, tables, or fix content. Provide the FULL UPDATED MARKDOWN.
     - Rule: Format "tables", "spreadsheets", or "grids" as Markdown tables.
   - No preamble. No explanations.

### RULES
- Pronouns: "this", "it", "they", "them" refer to the [ACTIVE NOTE].
- Do not repeat or echo these instructions.

### TOOLS
{ "tool": "edit_note", "args": { "path": "path", "content": "FULL_CONTENT_WITH_CHANGES" } }
{ "tool": "replace_text", "args": { "original": "exact_text_to_replace", "replacement": "new_text" } }
{ "tool": "create_note", "args": { "title": "name", "content": "text" } }
{ "tool": "search_notes", "args": { "query": "text" } }
{ "tool": "save_memory", "args": { "content": "text_to_remember" } }
### MEMORY RULES
- **PROACTIVE LEARNING**: Use "save_memory" IMMEDIATELY when the user introduces themselves, shares a preference (e.g. "I like dark mode"), or describes their role (e.g. "I'm a student").
- Use "save_memory" ONLY for truly important personal preferences, project context, or facts about the user.
- DO NOT save temporary conversation state.
- Keep memory entries concise and high-value.
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
    setVoiceMode: (enabled: boolean) => void;
    setListening: (listening: boolean) => void;
    setSpeaking: (speaking: boolean) => void;
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

            setVoiceMode: (enabled) => set({ isVoiceMode: enabled }),
            setListening: (listening) => set({ isListening: listening }),
            setSpeaking: (speaking) => set({ isSpeaking: speaking }),

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
                const { selectedModel, messages } = get();

                // 1. Prepare Messages
                let currentMessages = [...messages];

                // Inject System Prompt if new session
                if (currentMessages.length === 0) {
                    const { settings } = useSettingsStore.getState();
                    let finalPrompt = SYSTEM_PROMPT;
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

                                    // A. Active Note (The Source of Truth)
                                    const isSummaryRequest = content.toLowerCase().match(/\b(summarize|summary|explain|what is|tell me)\b/);
                                    const isVague = content.toLowerCase().match(/\b(this|it|my note|here|the note|they|them|its|those|these)\b/);
                                    const isEditRequest = content.toLowerCase().match(/\b(add|change|fix|insert|update|edit)\b/);

                                    if (activeNoteId && (isSummaryRequest || isVague || isEditRequest)) {
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

                                    if (substantiveQuery && !isVague) {
                                        const results = await searchNotes(vault.path, content);
                                        const topResults = results.slice(0, 2).filter(r => r.path !== activeNoteId);

                                        if (topResults.length > 0) {
                                            const { loadNote } = await import('../lib/tauri');
                                            const notes = await Promise.all(topResults.map(r => loadNote(r.path)));
                                            const ragBlock = notes.map(n => `Title: ${n.title}\n${n.content}\n`).join('\n');
                                            contextBlocks.push(`[ADDITIONAL VAULT CONTEXT]\n${ragBlock}`);
                                        }
                                    }

                                    if (contextBlocks.length > 0) {
                                        currentMessages.splice(currentMessages.length - 1, 0, {
                                            role: 'system',
                                            content: `[KNOWLEDGE BASE CONTEXT]\n\n${contextBlocks.join('\n\n')}\n\n[USER FOCUS]\nThe user is talking about the ACTIVE NOTE path: "${activeNoteId}".\nCRITICAL: When editing, you MUST provide the FULL content of the note. DO NOT overwrite the note with just your changes.`
                                        });
                                    }
                                } catch (err) {
                                    console.error('Context failed:', err);
                                }
                            }
                            set({ processingTool: null });
                        }

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
                                content: 'SYSTEM REMINDER: Tool executed successfully. Respond with a VERY SHORT confirmation (e.g. "Done" or "Note created"). DO NOT repeat the content, arguments, or JSON.'
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

                            if (textSummary) {
                                currentMessages.push({ role: 'assistant', content: textSummary });
                            } else {
                                // Default fallback if LLM only output JSON again OR if stripJSON cleared everything
                                currentMessages.push({
                                    role: 'assistant',
                                    content: 'I have successfully completed that action for you.'
                                });
                            }

                            set({ messages: currentMessages, isLoading: false, processingTool: null });
                            break; // Done
                        }

                        if (toolCall) {
                            // ... tool execution logic ...
                            console.log('Tool detected:', toolCall);

                            // PHANTOM TURN INJECTION
                            // Force a generic message to prevent the AI from "thinking aloud" or leaking content
                            // before the tool actually runs.
                            const phantomText = `[PHANTOM] Executing tool: ${toolCall.tool}`;
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

                                    toolResult = `Success: Note "${note.title}" created at ${note.path}`;
                                } else if (toolCall.tool === 'search_notes') {
                                    const { query } = toolCall.args;
                                    const results = await searchNotes(vault.path, query);
                                    toolResult = `Found ${results.length} notes:\n` +
                                        results.map(n => `- ${n.title} (${n.path})`).join('\n');
                                } else if (toolCall.tool === 'read_note') {
                                    const { path } = toolCall.args;
                                    const { loadNote } = await import('../lib/tauri');
                                    const note = await loadNote(path);
                                    toolResult = `Title: ${note.title}\nContent:\n${note.content}`;
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
                                    toolResult = `Success: Updated note "${filename}" at ${path}`;
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
                                        toolResult = `Success: Replaced text in note "${activeNote.title}" at ${activeNote.path}`;
                                    } else {
                                        toolResult = `Error: Original text "${original}" not found in the active note "${activeNote.title}".`;
                                    }
                                } else if (toolCall.tool === 'save_memory') {
                                    const { content } = toolCall.args;
                                    const { settings, updateSettings } = useSettingsStore.getState();

                                    const currentMemory = settings.aiMemory || '';
                                    const updatedMemory = currentMemory
                                        ? `${currentMemory.trim()}\n- ${content}`
                                        : `- ${content}`;

                                    updateSettings({ aiMemory: updatedMemory });
                                    toolResult = `Success: Information saved to memory.`;
                                } else {
                                    toolResult = `Error: Unknown tool "${toolCall.tool}"`;
                                }
                            } catch (err: any) {
                                console.error('Tool execution failed:', err);
                                toolResult = `Error executing tool: ${err.message}`;
                            }


                            currentMessages.push({
                                role: 'system',
                                content: `Tool Output: ${toolResult}`
                            });

                            set({ messages: [...currentMessages], processingTool: null });
                            continue;

                        } else {
                            // Regular response
                            const cleanResponse = stripJSON(response);
                            if (cleanResponse && cleanResponse.trim().length > 0) {
                                currentMessages.push({ role: 'assistant', content: cleanResponse });
                            } else {
                                // Fallback for when parseToolCall fails (returns null) BUT stripJSON removes the content
                                // This happens if the AI outputs INVALID JSON (e.g. unescaped quotes) which parser rejects, and stripper deletes.
                                currentMessages.push({
                                    role: 'assistant',
                                    content: "I attempted to perform the action, but I encountered a technical issue with the output format. Please try again or rephrase."
                                });
                            }

                            set({ messages: currentMessages, isLoading: false, processingTool: null });

                            // TTS: Speak the core response if in Voice Mode
                            if (get().isVoiceMode && cleanResponse) {
                                const { VoiceService } = await import('../lib/voice');
                                set({ isSpeaking: true });
                                VoiceService.speak(cleanResponse, () => {
                                    set({ isSpeaking: false });
                                });
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
                const { messages } = get();
                const vault = useVaultStore.getState().currentVault;

                if (!vault) {
                    set({ error: 'No vault open' });
                    return;
                }

                try {
                    // Load the note content
                    const { loadNote } = await import('../lib/tauri');
                    const note = await loadNote(noteId);

                    // Create context message
                    const noteContext: OllamaMessage = {
                        role: 'system',
                        content: `The user is asking about this note:\n\nTitle: ${note.title}\nContent:\n${note.content}\n\nAnswer their question based on this note.`
                    };

                    // Prepare messages
                    let currentMessages = [...messages];

                    // Inject system prompt if new session
                    if (currentMessages.length === 0) {
                        currentMessages.push({ role: 'system', content: SYSTEM_PROMPT });
                    }

                    // Add note context
                    currentMessages.push(noteContext);

                    // Add user question
                    currentMessages.push({ role: 'user', content: question });

                    set({ messages: currentMessages, isLoading: true, isOpen: true, error: null });

                    // Get response
                    const response = await chatOllama(get().selectedModel, currentMessages);
                    currentMessages.push({ role: 'assistant', content: response });

                    set({ messages: currentMessages, isLoading: false });
                } catch (e) {
                    console.error('Failed to ask about note:', e);
                    set({
                        isLoading: false,
                        error: 'Failed to communicate with AI.'
                    });
                }
            },

            summarizeNote: async (noteId: string) => {
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
                        { role: 'system', content: 'You are a helpful assistant that creates concise summaries.' },
                        {
                            role: 'user',
                            content: `Summarize the following note in 2-3 sentences:\n\nTitle: ${note.title}\n\n${note.content}`
                        }
                    ];

                    set({ isLoading: true, isOpen: true, error: null });

                    // Get response
                    const response = await chatOllama(get().selectedModel, messages);

                    // Add to chat with context
                    const currentMessages = get().messages;
                    const updatedMessages: OllamaMessage[] = [
                        { role: 'system', content: `Note: ${note.title}` },
                        { role: 'user', content: 'Summarize this note' },
                        { role: 'assistant', content: response }
                    ];

                    set({ messages: [...currentMessages, ...updatedMessages], isLoading: false });
                } catch (e) {
                    console.error('Failed to summarize note:', e);
                    set({
                        isLoading: false,
                        error: 'Failed to summarize note.'
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
                            content: `Title: ${note.title}\n\nContent:\n${note.content}\n\nInstruction: ${instruction}`
                        }
                    ];

                    set({ isLoading: true, error: null });

                    // Get response
                    const response = await chatOllama(get().selectedModel, messages);

                    // Save edited note
                    const editedNote = { ...note, content: response };
                    await saveNote(editedNote);

                    // Update store
                    useVaultStore.getState().updateNote(noteId, { content: response });

                    set({ isLoading: false });

                    // Show success in chat
                    const currentMessages = get().messages;
                    const updatedMessages: OllamaMessage[] = [
                        { role: 'system', content: `Note edited: ${note.title}` },
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

            clearChat: () => set({ messages: [], error: null })
        }),
        {
            name: 'synaptic-ai-storage',
            partialize: (state) => ({
                messages: state.messages,
                selectedModel: state.selectedModel
            }),
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
