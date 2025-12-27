import type { Plugin } from '../../types';
import { useVaultStore } from '../../../stores';
import { loadNote } from '../../../lib';

export class SpacedRepetitionPlugin implements Plugin {
  id = 'spaced-repetition';
  name = 'Spaced Repetition';
  version = '1.0.1';
  description = 'Flashcard-based learning system with spaced repetition algorithm';
  author = 'Synaptic Team';
  category = 'productivity' as const;
  tags = ['learning', 'flashcards', 'memorization'];
  permissions: Plugin['permissions'] = ['read_notes', 'write_notes', 'storage'];

  async onLoad() {
    console.log('Spaced Repetition plugin loaded');
  }

  async onUnload() {
    console.log('Spaced Repetition plugin unloaded');
  }

  commands = [
    {
      id: 'spaced-rep:create-card',
      name: 'Flashcard: Create New',
      description: 'Insert a flashcard template at cursor',
      handler: () => {
        console.log('[SpacedRep] Creating new flashcard template');
        const template = `\n---\ntype: flashcard\nfront: "Question goes here"\nback: "Answer goes here"\nease: 2.5\ninterval: 1\nnext_review: ${new Date().toISOString().split('T')[0]}\n---\n`;
        const event = new CustomEvent('synaptic:editor:insert', {
          detail: { text: template }
        });
        window.dispatchEvent(event);
        console.log('[SpacedRep] Dispatched insert event');
      }
    },
    {
      id: 'spaced-rep:review',
      name: 'Flashcard: Start Review Session',
      description: 'Review flashcards due today',
      handler: async () => {
        const noteMetadata = useVaultStore.getState().noteMetadata;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueCards: { path: string; front: string; back: string }[] = [];

        const frontRegex = /front:\s*"([^"]+)"/i;
        const backRegex = /back:\s*"([^"]+)"/i;
        const nextReviewRegex = /next_review:\s*(\d{4}-\d{2}-\d{2})/i;

        console.log(`[SpacedRep] Scanning ${noteMetadata.length} notes for flashcards...`);

        for (const noteMeta of noteMetadata) {
          try {
            const note = await loadNote(noteMeta.path);
            if (note.content.includes('type: flashcard')) {
              console.log(`[SpacedRep] Found flashcard note: ${noteMeta.title}`);
              const frontMatch = note.content.match(frontRegex);
              const backMatch = note.content.match(backRegex);
              const reviewMatch = note.content.match(nextReviewRegex);

              if (frontMatch && backMatch && reviewMatch) {
                const nextReview = new Date(reviewMatch[1]);
                console.log(`[SpacedRep] Card due: ${reviewMatch[1]}, today: ${today.toISOString().split('T')[0]}, isDue: ${nextReview <= today}`);
                if (nextReview <= today) {
                  dueCards.push({
                    path: note.path,
                    front: frontMatch[1],
                    back: backMatch[1]
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Error loading ${noteMeta.path}`, e);
          }
        }

        if (dueCards.length === 0) {
          alert('🎉 No cards due for review today!');
        } else {
          const card = dueCards[0];
          const answer = confirm(`📚 Review (${dueCards.length} cards due)\n\nQ: ${card.front}\n\n[Click OK to reveal answer]`);
          if (answer) {
            alert(`A: ${card.back}\n\n(In a full implementation, you'd rate your recall here)`);
          }
        }
      }
    }
  ];
}

export default SpacedRepetitionPlugin;
