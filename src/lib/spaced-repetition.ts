import { NoteMetadata } from '../types';
import { loadNote } from './tauri';
import { writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Flashcard data structure
 */
export interface Flashcard {
    path: string;
    title: string;
    front: string;
    back: string;
    ease: number;
    interval: number;
    nextReview: Date;
}

/**
 * Rating options for SM-2 algorithm
 */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

/**
 * SM-2 Algorithm Implementation
 * Based on SuperMemo 2 algorithm for spaced repetition
 */
export function calculateNextReview(
    ease: number,
    interval: number,
    rating: Rating
): { newEase: number; newInterval: number; nextDate: Date } {
    let newEase = ease;
    let newInterval = interval;

    switch (rating) {
        case 'again':
            // Failed - reset interval, decrease ease
            newEase = Math.max(1.3, ease - 0.2);
            newInterval = 1;
            break;
        case 'hard':
            // Difficult - keep interval, slightly decrease ease
            newEase = Math.max(1.3, ease - 0.15);
            newInterval = Math.max(1, Math.round(interval * 1.2));
            break;
        case 'good':
            // Normal - increase interval using ease factor
            newInterval = Math.round(interval * ease);
            break;
        case 'easy':
            // Easy - increase interval more, increase ease
            newEase = Math.min(3.0, ease + 0.15);
            newInterval = Math.round(interval * ease * 1.3);
            break;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);
    nextDate.setHours(0, 0, 0, 0);

    return { newEase, newInterval, nextDate };
}

/**
 * Parse flashcards from note content
 */
export function parseFlashcardsFromContent(
    content: string,
    path: string,
    title: string
): Flashcard[] {
    const cards: Flashcard[] = [];

    // 1. First, look for blocks that look like flashcard frontmatter
    // We search for "type: flashcard" and take the surrounding block
    // This handles cases where delimiters are missing or there's multiple blocks
    const blocks = content.split(/---?\s*\n/);

    console.log(`[SpacedRep] Scanning ${title}: Found ${blocks.length} potential blocks`);

    blocks.forEach((block, index) => {
        if (!block.includes('type: flashcard')) return;

        console.log(`[SpacedRep] Found flashcard block in ${title} (block ${index}):`, {
            length: block.length,
            preview: block.slice(0, 100).replace(/\n/g, ' ')
        });

        // Use more forgiving regex for each field
        // These look for the key followed by colon and then the value, ignoring quotes
        const getField = (key: string) => {
            const regex = new RegExp(`${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n\\r]*))`, 'i');
            const match = block.match(regex);
            if (!match) return null;
            return (match[1] || match[2] || match[3] || '').trim();
        };

        const front = getField('front');
        const back = getField('back');
        const easeStr = getField('ease');
        const intervalStr = getField('interval');
        const nextReviewStr = getField('next_review');

        if (front && back) {
            console.log(`[SpacedRep] Successfully parsed card: "${front}" | "${back}"`);

            // Parse numeric values with defaults
            const ease = easeStr ? parseFloat(easeStr) : 2.5;
            const interval = intervalStr ? parseInt(intervalStr) : 1;

            // Parse date carefully
            let nextReview = new Date();
            if (nextReviewStr) {
                const date = new Date(nextReviewStr);
                if (!isNaN(date.getTime())) {
                    nextReview = date;
                }
            }
            nextReview.setHours(0, 0, 0, 0);

            cards.push({
                path,
                title,
                front,
                back,
                ease,
                interval,
                nextReview
            });
        } else {
            console.warn(`[SpacedRep] Block had type: flashcard but missing front/back:`, {
                hasFront: !!front,
                hasBack: !!back,
                front,
                back
            });
        }
    });

    return cards;
}

/**
 * Get all flashcards due for review
 */
export async function getDueFlashcards(
    noteMetadata: NoteMetadata[]
): Promise<Flashcard[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('[SpacedRep] Scanning', noteMetadata.length, 'notes for flashcards. Today:', today.toISOString());

    const allCards: Flashcard[] = [];

    for (const meta of noteMetadata) {
        try {
            const note = await loadNote(meta.path);
            console.log('[SpacedRep] Checking note:', meta.title, '| Content length:', note.content.length);

            const cards = parseFlashcardsFromContent(note.content, meta.path, meta.title);
            console.log('[SpacedRep] Cards found in', meta.title, ':', cards.length);

            for (const card of cards) {
                console.log('[SpacedRep] Card:', card.front, '| nextReview:', card.nextReview, '| isDue:', card.nextReview <= today);
                if (card.nextReview <= today) {
                    allCards.push(card);
                }
            }
        } catch (e) {
            console.error(`Error loading flashcards from ${meta.path}:`, e);
        }
    }

    // Sort by next review date (oldest first)
    return allCards.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
}

/**
 * Update a flashcard's review data in the note file
 */
export async function updateFlashcardInNote(
    path: string,
    front: string,
    newEase: number,
    newInterval: number,
    nextDate: Date
): Promise<void> {
    try {
        const note = await loadNote(path);
        let content = note.content;

        // Find and update the specific flashcard by its front text
        // We use a more flexible approach: split by potential delimiters and find the block containing the front text
        const blocks = content.split(/---?\s*\n/);
        const dateStr = nextDate.toISOString().split('T')[0];

        const updatedBlocks = blocks.map(block => {
            if (!block.includes('type: flashcard')) return block;

            // Extract current front to see if it matches
            const frontRegex = /front:\s*(?:"([^"]*)"|'([^']*)'|([^\n\r]*))/i;
            const frontMatch = block.match(frontRegex);
            if (!frontMatch) return block;

            const currentFront = (frontMatch[1] || frontMatch[2] || frontMatch[3] || '').trim();
            if (currentFront !== front) return block;

            // This is the block to update
            console.log(`[SpacedRep] Updating card block for: "${front}"`);

            let updatedBlock = block;
            const updateField = (key: string, newValue: string | number) => {
                const regex = new RegExp(`(${key}:\\s*)(?:"[^"]*"|'[^']*'|[^\\n\\r]*)`, 'i');
                if (updatedBlock.match(regex)) {
                    updatedBlock = updatedBlock.replace(regex, `$1${newValue}`);
                } else {
                    // If field doesn't exist, append it
                    updatedBlock = updatedBlock.trimEnd() + `\n${key}: ${newValue}\n`;
                }
            };

            updateField('ease', newEase.toFixed(1));
            updateField('interval', newInterval);
            updateField('next_review', dateStr);

            return updatedBlock;
        });

        content = updatedBlocks.join('---\n');

        await writeTextFile(path, content);
    } catch (e) {
        console.error(`Error updating flashcard in ${path}:`, e);
        throw e;
    }
}
