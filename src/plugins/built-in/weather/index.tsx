import type { Plugin, PluginSettingDefinition } from '../../types';
import { Sun } from 'lucide-react';

const settingsSchema: PluginSettingDefinition[] = [
    {
        key: 'zipCode',
        type: 'text',
        label: 'Zip / Postal Code',
        description: 'e.g. 10001',
        default: '10001',
    },
    {
        key: 'countryCode',
        type: 'text',
        label: 'Country Code',
        description: '2-letter code (e.g. US, UK, DE)',
        default: 'US',
    },
    {
        key: 'unit',
        type: 'select',
        label: 'Temperature Unit',
        description: 'Celsius or Fahrenheit',
        default: 'fahrenheit',
        options: [
            { value: 'celsius', label: 'Celsius (°C)' },
            { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
        ],
    },
];

export default class WeatherPlugin implements Plugin {
    id = 'weather';
    name = 'Weather';
    version = '1.0.0';
    description = 'Display current weather in status bar using Open-Meteo.';
    author = 'Synaptic Team';
    icon = <Sun className="w-5 h-5 text-yellow-500" />;
    category = 'utility' as const;
    tags = ['weather', 'forecast', 'status-bar'];
    permissions: Plugin['permissions'] = ['network', 'ui'];
    settingsSchema = settingsSchema;

    settings: any = {};

    async onLoad() {
        console.log('Weather Plugin loaded');
    }

    async onUnload() {
        console.log('Weather Plugin unloaded');
    }
}
