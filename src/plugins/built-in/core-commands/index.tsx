import type { Plugin } from '../../types';

/**
 * Core Commands Plugin
 * Provides essential note-taking commands like Insert Date, Time, Checkbox, Callout, Table, etc.
 */
export class CoreCommandsPlugin implements Plugin {
    id = 'core-commands';
    name = 'Core Commands';
    version = '1.0.0';
    description = 'Essential note-taking commands: Insert Date, Time, Checkbox, Callout, Table, and more.';
    author = 'Synaptic Team';
    category = 'utility' as const;
    tags = ['commands', 'productivity', 'essential'];
    permissions: Plugin['permissions'] = ['ui'];

    async onLoad() {
        console.log('Core Commands plugin loaded');
    }

    async onUnload() {
        console.log('Core Commands plugin unloaded');
    }

    private insertText(text: string) {
        const event = new CustomEvent('synaptic:editor:insert', {
            detail: { text }
        });
        window.dispatchEvent(event);
    }

    private formatDate(date: Date, format: string): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekday = weekdays[date.getDay()];
        const shortWeekday = weekday.slice(0, 3);

        return format
            .replace('YYYY', year.toString())
            .replace('MM', month)
            .replace('DD', day)
            .replace('dddd', weekday)
            .replace('ddd', shortWeekday);
    }

    private formatTime(date: Date): string {
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    commands = [
        // ===== DATE & TIME =====
        {
            id: 'core:insert-date',
            name: 'Insert Date',
            description: 'Insert current date (YYYY-MM-DD)',
            keyboard: 'Ctrl+Shift+D',
            handler: () => {
                const now = new Date();
                this.insertText(this.formatDate(now, 'YYYY-MM-DD'));
            }
        },
        {
            id: 'core:insert-date-full',
            name: 'Insert Date (Full)',
            description: 'Insert current date with weekday',
            handler: () => {
                const now = new Date();
                this.insertText(this.formatDate(now, 'dddd, YYYY-MM-DD'));
            }
        },
        {
            id: 'core:insert-time',
            name: 'Insert Time',
            description: 'Insert current time (12-hour format)',
            keyboard: 'Ctrl+Shift+T',
            handler: () => {
                const now = new Date();
                this.insertText(this.formatTime(now));
            }
        },
        {
            id: 'core:insert-datetime',
            name: 'Insert Date & Time',
            description: 'Insert current date and time',
            handler: () => {
                const now = new Date();
                this.insertText(`${this.formatDate(now, 'YYYY-MM-DD')} ${this.formatTime(now)}`);
            }
        },

        // ===== LISTS & TASKS =====
        {
            id: 'core:insert-checkbox',
            name: 'Insert Checkbox',
            description: 'Insert an unchecked task checkbox',
            handler: () => {
                this.insertText('- [ ] ');
            }
        },
        {
            id: 'core:insert-checkbox-checked',
            name: 'Insert Checked Checkbox',
            description: 'Insert a checked task checkbox',
            handler: () => {
                this.insertText('- [x] ');
            }
        },
        {
            id: 'core:insert-bullet',
            name: 'Insert Bullet Point',
            description: 'Insert a bullet list item',
            handler: () => {
                this.insertText('- ');
            }
        },
        {
            id: 'core:insert-numbered',
            name: 'Insert Numbered List',
            description: 'Insert a numbered list item',
            handler: () => {
                this.insertText('1. ');
            }
        },

        // ===== CALLOUTS =====
        {
            id: 'core:insert-callout-note',
            name: 'Insert Note Callout',
            description: 'Insert a note callout block',
            handler: () => {
                this.insertText('> [!NOTE]\n> ');
            }
        },
        {
            id: 'core:insert-callout-tip',
            name: 'Insert Tip Callout',
            description: 'Insert a tip callout block',
            handler: () => {
                this.insertText('> [!TIP]\n> ');
            }
        },
        {
            id: 'core:insert-callout-important',
            name: 'Insert Important Callout',
            description: 'Insert an important callout block',
            handler: () => {
                this.insertText('> [!IMPORTANT]\n> ');
            }
        },
        {
            id: 'core:insert-callout-warning',
            name: 'Insert Warning Callout',
            description: 'Insert a warning callout block',
            handler: () => {
                this.insertText('> [!WARNING]\n> ');
            }
        },

        // ===== FORMATTING =====
        {
            id: 'core:insert-hr',
            name: 'Insert Horizontal Rule',
            description: 'Insert a horizontal divider line',
            handler: () => {
                this.insertText('\n---\n');
            }
        },
        {
            id: 'core:insert-code-block',
            name: 'Insert Code Block',
            description: 'Insert a fenced code block',
            handler: () => {
                this.insertText('```\n\n```');
            }
        },
        {
            id: 'core:insert-blockquote',
            name: 'Insert Blockquote',
            description: 'Insert a blockquote',
            handler: () => {
                this.insertText('> ');
            }
        },

        // ===== TABLES =====
        {
            id: 'core:insert-table',
            name: 'Insert Table',
            description: 'Insert a 3-column markdown table',
            handler: () => {
                this.insertText(
                    `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |
`);
            }
        },

        // ===== LINKS & MEDIA =====
        {
            id: 'core:insert-link',
            name: 'Insert Link',
            description: 'Insert a markdown link template',
            handler: () => {
                this.insertText('[Link Text](url)');
            }
        },
        {
            id: 'core:insert-image',
            name: 'Insert Image',
            description: 'Insert an image markdown template',
            handler: () => {
                this.insertText('![Alt Text](image-url)');
            }
        },
        {
            id: 'core:insert-wikilink',
            name: 'Insert Wikilink',
            description: 'Insert a wikilink to another note',
            handler: () => {
                this.insertText('[[Note Name]]');
            }
        },

        // ===== HEADINGS =====
        {
            id: 'core:insert-h1',
            name: 'Insert Heading 1',
            description: 'Insert a level 1 heading',
            handler: () => {
                this.insertText('# ');
            }
        },
        {
            id: 'core:insert-h2',
            name: 'Insert Heading 2',
            description: 'Insert a level 2 heading',
            handler: () => {
                this.insertText('## ');
            }
        },
        {
            id: 'core:insert-h3',
            name: 'Insert Heading 3',
            description: 'Insert a level 3 heading',
            handler: () => {
                this.insertText('### ');
            }
        },

        // ===== TEMPLATES =====
        {
            id: 'core:insert-frontmatter',
            name: 'Insert Frontmatter',
            description: 'Insert YAML frontmatter template',
            handler: () => {
                const now = new Date();
                this.insertText(
                    `---
title: 
date: ${this.formatDate(now, 'YYYY-MM-DD')}
tags: []
---

`);
            }
        },
        {
            id: 'core:insert-meeting-template',
            name: 'Insert Meeting Template',
            description: 'Insert a meeting notes template',
            handler: () => {
                const now = new Date();
                this.insertText(
                    `# Meeting Notes - ${this.formatDate(now, 'YYYY-MM-DD')}

## Attendees
- 

## Agenda
1. 

## Discussion Notes


## Action Items
- [ ] 

## Next Steps

`);
            }
        },
    ];
}

export default CoreCommandsPlugin;
