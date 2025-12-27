import type { Plugin } from '../../types';

export class MealPlanPlugin implements Plugin {
    id = 'meal-plan';
    name = 'Meal Plan';
    version = '1.0.0';
    description = 'Meal planning and recipe manager.';
    author = 'tmayoff';
    category = 'productivity' as const;
    tags = ['food', 'meal-plan', 'cooking'];
    permissions: Plugin['permissions'] = ['write_notes'];

    async onLoad() {
        console.log('Meal Plan plugin loaded');
    }

    async onUnload() {
        console.log('Meal Plan plugin unloaded');
    }

    async onEnable() {
        console.log('Meal Plan plugin enabled');
    }

    async onDisable() {
        console.log('Meal Plan plugin disabled');
    }

    commands = [
        {
            id: 'meal-plan:create',
            name: 'Create Meal Plan',
            description: 'Insert a weekly meal plan template',
            handler: () => {
                const template = `## Weekly Meal Plan

| Day | Breakfast | Lunch | Dinner |
| :--- | :--- | :--- | :--- |
| **Monday** | | | |
| **Tuesday** | | | |
| **Wednesday** | | | |
| **Thursday** | | | |
| **Friday** | | | |
| **Saturday** | | | |
| **Sunday** | | | |

## Grocery List
- [ ] 
`;
                const event = new CustomEvent('synaptic:editor:insert', {
                    detail: { text: template }
                });
                window.dispatchEvent(event);
            }
        }
    ];
}

export default MealPlanPlugin;
