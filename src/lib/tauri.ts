import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
    readTextFile,
    writeTextFile,
    writeFile,
    mkdir,
    remove,
    exists,
    rename,
} from '@tauri-apps/plugin-fs';
import type { Note, NoteMetadata, Vault } from '../types';
import { extractTitle, extractTags, extractLinks } from './utils';
import { getDailyNoteFilename, getDailyNotePath } from './dates';

/**
 * Save a binary attachment to the vault
 */
export async function saveAttachment(vaultPath: string, filename: string, data: Uint8Array): Promise<string> {
    const attachmentsFolder = `${vaultPath}/attachments`;
    if (!(await exists(attachmentsFolder))) {
        await mkdir(attachmentsFolder, { recursive: true });
    }
    const filePath = `${attachmentsFolder}/${filename}`;
    await writeFile(filePath, data);
    return `attachments/${filename}`;
}

/**
 * Open folder picker dialog
 */
export async function selectVaultFolder(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Vault Folder',
    });

    return selected as string | null;
}

/**
 * Load vault from a folder path
 */
export async function loadVault(vaultPath: string): Promise<Vault> {
    try {
        console.log(`[Vault] Loading metadata for: ${vaultPath}`);
        // Use Rust for robust metadata collection
        const metadata = await invoke<NoteMetadata>('get_vault_metadata', {
            path: vaultPath,
        });

        return {
            path: metadata.path,
            name: metadata.title,
            noteCount: parseInt(metadata.preview) || 0,
            lastOpened: new Date(),
        };
    } catch (error) {
        console.error(`[Vault] Failed to load vault: ${vaultPath}`, error);
        // Fallback to basic JS logic if Rust fails
        const pathParts = vaultPath.split(/[/\\]/);
        const name = pathParts[pathParts.length - 1] || 'Vault';
        return {
            path: vaultPath,
            name,
            noteCount: 0,
            lastOpened: new Date(),
        };
    }
}



/**
 * Load all notes metadata from vault
 */
export async function loadNotesMetadata(vaultPath: string): Promise<NoteMetadata[]> {
    try {
        console.log(`[Scanner] Requesting metadata for: ${vaultPath}`);
        // Use the Rust search_notes command with an empty query to get all files
        // This is significantly more robust on Windows than JS-based readDir
        const results = await invoke<NoteMetadata[]>('search_notes', {
            vaultPath,
            query: '', // Empty query matches all files
        });

        const metadata = results.map(n => ({
            ...n,
            id: n.path.replace(/\\/g, '/'),
            path: n.path.replace(/\\/g, '/'),
            updatedAt: new Date(), // Local fallback for missing dates
        }));

        console.log(`[Scanner] Completed. Found ${metadata.length} notes.`);
        return metadata;
    } catch (error) {
        console.error(`[Scanner] Failed to scan vault: ${vaultPath}`, error);
        return [];
    }
}

/**
 * Load a single note by path
 */
export async function loadNote(notePath: string): Promise<Note> {
    const content = await readTextFile(notePath);
    const title = extractTitle(content);
    const tags = extractTags(content);
    const links = extractLinks(content);

    // Check if it's a daily note
    const filename = notePath.split(/[/\\]/).pop() || '';
    const isDailyNote = /^\d{4}-\d{2}-\d{2}\.md$/.test(filename);

    const normalizedPath = notePath.replace(/\\/g, '/');
    return {
        id: normalizedPath,
        title,
        content,
        path: normalizedPath,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags,
        links,
        backlinks: [],
        isDailyNote,
    };
}

/**
 * Save a note to disk
 */
export async function saveNote(note: Note): Promise<void> {
    await writeTextFile(note.path, note.content);
}

/**
 * Create a new note
 */
export async function createNote(
    vaultPath: string,
    title: string,
    content = ''
): Promise<Note> {
    const filename = `${title.replace(/[<>:"/\\|?*]/g, '')}.md`;
    const notePath = `${vaultPath}/${filename}`;

    // Check if file exists
    if (await exists(notePath)) {
        throw new Error(`Note "${title}" already exists`);
    }

    const noteContent = content || `# ${title}\n\n`;

    await writeTextFile(notePath, noteContent);

    const normalizedPath = notePath.replace(/\\/g, '/');
    return {
        id: normalizedPath,
        title,
        content: noteContent,
        path: normalizedPath,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: extractTags(noteContent),
        links: extractLinks(noteContent),
        backlinks: [],
        isDailyNote: false,
    };
}

/**
 * Create or get today's daily note
 */
export async function getOrCreateDailyNote(
    vaultPath: string,
    dailyNotesFolder = 'daily',
    initialContent?: string
): Promise<Note> {
    const today = new Date();
    const folderPath = getDailyNotePath(`${vaultPath}/${dailyNotesFolder}`, today);
    const filename = getDailyNoteFilename(today);
    const notePath = `${folderPath}/${filename}`;

    // Ensure folder exists
    if (!(await exists(folderPath))) {
        await mkdir(folderPath, { recursive: true });
    }

    // Check if today's note exists
    if (await exists(notePath)) {
        return loadNote(notePath);
    }

    // Create new daily note
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const content = initialContent || `# ${formattedDate}

## Morning



## Tasks

- [ ] 

## Notes



## Reflection

`;

    await writeTextFile(notePath, content);

    const normalizedPath = notePath.replace(/\\/g, '/');
    return {
        id: normalizedPath,
        title: filename.replace('.md', ''),
        content,
        path: normalizedPath,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        links: [],
        backlinks: [],
        isDailyNote: true,
    };
}

/**
 * Delete a note
 */
export async function deleteNote(notePath: string): Promise<void> {
    await remove(notePath);
}

/**
 * Rename a note
 */
export async function renameNote(oldPath: string, newName: string): Promise<string> {
    const pathParts = oldPath.split(/[/\\]/);
    pathParts.pop();
    const dirPath = pathParts.join('/');
    const newPath = `${dirPath}/${newName.replace(/[<>:"/\\|?*]/g, '')}.md`;

    await rename(oldPath, newPath);
    return newPath;
}

/**
 * Search notes (full-text, client-side fallback)
 */
export function searchNotesLocally(
    notes: NoteMetadata[],
    query: string
): NoteMetadata[] {
    const lowerQuery = query.toLowerCase();

    return notes
        .filter((note) => {
            return (
                note.title.toLowerCase().includes(lowerQuery) ||
                note.preview.toLowerCase().includes(lowerQuery) ||
                note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
            );
        })
        .sort((a, b) => {
            // Prioritize title matches
            const aTitle = a.title.toLowerCase().includes(lowerQuery);
            const bTitle = b.title.toLowerCase().includes(lowerQuery);
            if (aTitle && !bTitle) return -1;
            if (!aTitle && bTitle) return 1;
            return 0;
        });
}

/**
 * Full-text search via Rust backend
 */
export async function searchNotes(
    vaultPath: string,
    query: string
): Promise<NoteMetadata[]> {
    try {
        const results = await invoke<NoteMetadata[]>('search_notes', {
            vaultPath,
            query,
        });
        return results.map(n => ({
            ...n,
            id: n.path.replace(/\\/g, '/'),
            path: n.path.replace(/\\/g, '/'),
        }));
    } catch (error) {
        console.error('Search failed, falling back to local search:', error);
        // Fallback handled by caller
        throw error;
    }
}

/**
 * Initialize AI model for semantic search
 */
export async function initSemanticModel(): Promise<string> {
    return await invoke('init_model');
}

/**
 * Index notes for semantic search
 */
export async function indexNotes(notes: NoteMetadata[]): Promise<number> {
    return await invoke('index_notes', { notes });
}

export interface SemanticResult {
    id: string;
    score: number;
}

/**
 * Perform semantic search
 */
export async function semanticSearch(query: string, limit = 10): Promise<SemanticResult[]> {
    return await invoke('semantic_search', { query, limit });
}

// --- Ollama API ---

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Check if Ollama is running
 */
export async function checkOllamaStatus(): Promise<boolean> {
    try {
        return await invoke('check_ollama_status');
    } catch (e) {
        console.error('Ollama check failed:', e);
        return false;
    }
}

/**
 * Get available Ollama models
 */
export async function getOllamaModels(): Promise<string[]> {
    return await invoke('get_ollama_models');
}

/**
 * Send chat message to Ollama (non-streaming for now)
 */
export async function chatOllama(model: string, messages: OllamaMessage[]): Promise<string> {
    return await invoke('unstreamed_chat', { model, messages });
}
