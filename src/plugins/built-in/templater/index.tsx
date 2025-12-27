import type { Plugin } from '../../types';

export interface TemplaterPluginInterface extends Plugin {
    generateTemplate: (date: Date) => Promise<string>;
}

export class TemplaterPlugin implements TemplaterPluginInterface {
    id = 'templater';
    name = 'Templater';
    version = '1.0.0';
    description = 'Smart template engine for Daily Notes with dynamic content support.';
    author = 'Synaptic Team';
    category = 'productivity' as const;
    tags = ['templates', 'daily', 'automation'];
    permissions: Plugin['permissions'] = ['ui', 'write_notes'];

    async onLoad() {
        console.log('Templater plugin loaded');
    }

    async onUnload() {
        console.log('Templater plugin unloaded');
    }

    async onEnable() {
        console.log('Templater plugin enabled');
    }

    async onDisable() {
        console.log('Templater plugin disabled');
    }

    async generateTemplate(date: Date): Promise<string> {
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const quotes = [
            "The best way to predict the future is to create it.",
            "Do what you can, with what you have, where you are.",
            "It always seems impossible until it's done.",
            "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            "Believe you can and you're halfway there."
        ];

        // Simulate API call delay for "weather"
        await new Promise(resolve => setTimeout(resolve, 300));

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const weather = ["Sunny ☀️", "Cloudy ☁️", "Rainy 🌧️", "Partly Cloudy ⛅"][Math.floor(Math.random() * 4)];
        const temp = Math.floor(Math.random() * (30 - 15) + 15); // 15-30 deg C

        return `# ${formattedDate}

> ${randomQuote}

## 🌤️ Weather
${weather}, ${temp}°C

## 📝 Today's Focus
- [ ] 

## 🧠 Thoughts
`;
    }
}

export default TemplaterPlugin;
