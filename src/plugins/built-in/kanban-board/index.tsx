import type { Plugin } from '../../types';

export class KanbanPlugin implements Plugin {
    id = 'kanban-board';
    name = 'Kanban Board';
    version = '1.0.0';
    description = 'Organize your notes into a Kanban board.';
    author = 'Community';
    category = 'productivity' as const;
    tags = ['kanban', 'tasks', 'project-management'];
    permissions: Plugin['permissions'] = ['read_notes', 'write_notes', 'storage'];

    async onLoad() {
        console.log('Kanban Board plugin loaded');
    }

    async onUnload() {
        console.log('Kanban Board plugin unloaded');
    }

    commands = [
        {
            id: 'kanban:create-board',
            name: 'Kanban: Create Board Template',
            description: 'Insert a Kanban board template into the editor',
            handler: () => {
                const template = `## 📋 Kanban Board

### 🔜 To Do
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### 🚧 In Progress
- [ ] Active task

### ✅ Done
- [x] Completed task
`;
                const event = new CustomEvent('synaptic:editor:insert', {
                    detail: { text: template }
                });
                window.dispatchEvent(event);
            }
        },
        {
            id: 'kanban:open-view',
            name: 'Kanban: Open Board (Coming Soon)',
            description: 'Open interactive Kanban view',
            handler: () => {
                alert('🚧 Interactive Kanban Board view is coming in a future update!\n\nFor now, use "Kanban: Create Board Template" to add a markdown-based board to your notes.');
            }
        }
    ];
}

export default KanbanPlugin;
