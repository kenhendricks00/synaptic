import type { Plugin } from '../../types';
import { TaskView } from './TaskView';

export class TasksPlugin implements Plugin {
    id = 'tasks';
    name = 'Tasks';
    version = '1.0.0';
    description = 'Aggregates all tasks (- [ ] #task) from your vault into a single view.';
    author = 'Synaptic Team';
    category = 'productivity' as const;
    tags = ['tasks', 'todo', 'management', 'sidebar'];
    permissions: Plugin['permissions'] = ['ui', 'read_notes', 'write_notes'];

    // In a more advanced architecture, we would register the view here.
    // For now, App.tsx handles the routing based on View ID.

    async onLoad() {
        console.log('Tasks plugin loaded');
    }

    async onUnload() {
        console.log('Tasks plugin unloaded');
    }

    async onEnable() {
        console.log('Tasks plugin enabled');
    }

    async onDisable() {
        console.log('Tasks plugin disabled');
    }
}

export default TasksPlugin;
export { TaskView };
