import type { Plugin } from '../../types';
import { useVaultStore } from '../../../stores';
import { loadNote } from '../../../lib';

export class BirthdayTrackerPlugin implements Plugin {
    id = 'birthday-tracker';
    name = 'Birthday Tracker';
    version = '1.0.2';
    description = 'Keep track of all birthdays of your family and friends.';
    author = 'Raboro';
    category = 'utility' as const;
    tags = ['birthday', 'calendar', 'tracker', 'people'];
    permissions: Plugin['permissions'] = ['read_notes'];

    settingsSchema = [
        {
            key: 'dateFormat',
            type: 'select' as const,
            label: 'Date Format',
            description: 'How dates are displayed',
            default: 'DD/MM/YYYY',
            options: [
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
            ]
        },
        {
            key: 'upcomingCount',
            type: 'number' as const,
            label: 'Upcoming Birthdays to Show',
            description: 'Number of upcoming birthdays to display',
            default: 5,
            min: 1,
            max: 20
        }
    ];

    async onLoad() {
        console.log('Birthday Tracker plugin loaded');
    }

    async onUnload() {
        console.log('Birthday Tracker plugin unloaded');
    }

    commands = [
        {
            id: 'birthday-tracker:upcoming',
            name: 'Birthday: Show Upcoming',
            description: 'Scan notes for upcoming birthdays',
            handler: async () => {
                const { currentVault } = useVaultStore.getState();

                if (!currentVault) return;

                const today = new Date();
                // Set time to start of day for accurate comparison
                today.setHours(0, 0, 0, 0);

                const birthdays: { name: string; date: Date; turn: number }[] = [];

                // Regex: name=<name>; birthday=<DD/MM/YYYY>
                // Case insensitive, Global match to find multiple per note
                const regex = /name=([^;]+);\s*birthday=(\d{1,2})\/(\d{1,2})\/(\d{4})/gi;

                const noteMetadata = useVaultStore.getState().noteMetadata;

                for (const noteMeta of noteMetadata) {
                    try {
                        const note = await loadNote(noteMeta.path);
                        const matches = Array.from(note.content.matchAll(regex));

                        for (const match of matches) {
                            const name = match[1].trim();
                            const day = parseInt(match[2], 10);
                            const month = parseInt(match[3], 10) - 1; // Month is 0-indexed
                            const year = parseInt(match[4], 10);

                            const birthDate = new Date(year, month, day);

                            // Check for invalid date
                            if (isNaN(birthDate.getTime())) continue;

                            // Calculate next occurrence
                            let nextBirthday = new Date(today.getFullYear(), month, day);
                            if (nextBirthday < today) {
                                nextBirthday.setFullYear(today.getFullYear() + 1);
                            }

                            // Calculate age they are turning
                            const age = nextBirthday.getFullYear() - birthDate.getFullYear();

                            birthdays.push({
                                name: name,
                                date: nextBirthday,
                                turn: age
                            });
                        }
                    } catch (e) {
                        console.error(`Error loading note ${noteMeta.title}`, e);
                    }
                }

                // Sort by nearest date
                birthdays.sort((a, b) => a.date.getTime() - b.date.getTime());
                const upcoming = birthdays.slice(0, 5);

                if (upcoming.length === 0) {
                    alert('No birthdays found.\nUse format: name=Name; birthday=DD/MM/YYYY');
                } else {
                    const message = upcoming.map(b =>
                        `${b.name}: ${b.date.toLocaleDateString()} (Turning ${b.turn})`
                    ).join('\n');
                    alert(`🎉 Upcoming Birthdays:\n\n${message}`);
                }
            }
        }
    ];
}

export default BirthdayTrackerPlugin;
