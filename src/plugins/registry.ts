import type { PluginManifest } from './types';

/**
 * Plugin registry - all available plugins
 * In production, this would be fetched from a remote marketplace API
 */
const REGISTRY_URL = 'https://raw.githubusercontent.com/kenhendricks00/Synaptic/main/plugins.json';

/**
 * Plugin registry - all available plugins
 * Fetches from remote GitHub registry and merges with built-ins
 */
export async function getAvailablePlugins(): Promise<PluginManifest[]> {
  try {
    // 1. Fetch Remote Registry
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) throw new Error('Failed to fetch registry');
    const remotePlugins: PluginManifest[] = await response.json();

    // 2. Parse dates (JSON dates are strings)
    const remoteParsed = remotePlugins.map(p => ({
      ...p,
      lastUpdated: new Date(p.lastUpdated)
    }));

    // 3. Get Built-ins
    const builtIns = getBuiltInPlugins();

    // 4. Merge: Remote overrides built-in if ID matches (allows updating built-ins via remote)
    // Actually, for safety/simplicity in this stage, let's just Append remote ones that aren't built-in,
    // OR allow remote to be the source of truth if we want dynamic updates.
    // Strategy: Use a Map, remote wins.
    const pluginMap = new Map<string, PluginManifest>();

    // Add built-ins first
    builtIns.forEach(p => pluginMap.set(p.id, p));

    // Add/Update with remote
    remoteParsed.forEach(p => pluginMap.set(p.id, p));

    return Array.from(pluginMap.values());

  } catch (e) {
    console.warn('Failed to fetch remote registry, falling back to built-ins:', e);
    return getBuiltInPlugins();
  }
}

function getBuiltInPlugins(): PluginManifest[] {
  return [
    {
      id: 'spaced-repetition',
      name: 'Spaced Repetition',
      version: '1.0.1',
      description: 'Flashcard study system with SM-2 algorithm. Create flashcards in your notes and review them at optimal intervals for long-term retention.',
      author: 'Synaptic Team',
      icon: 'brain',
      category: 'productivity',
      tags: ['learning', 'flashcards', 'memorization', 'study', 'anki'],
      screenshots: [],
      repository: 'https://github.com/synaptic/spaced-repetition-plugin',
      homepage: 'https://synaptic.app/plugins/spaced-repetition',
      downloads: 12500,
      rating: 4.8,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: true,
      permissions: ['read_notes', 'write_notes', 'storage'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'core-commands',
      name: 'Core Commands',
      version: '1.0.0',
      description: '25+ essential note-taking commands: Dates, Times, Checkboxes, Callouts, Tables, and more.',
      author: 'Synaptic Team',
      icon: 'terminal',
      category: 'utility',
      tags: ['commands', 'productivity', 'essential'],
      screenshots: [],
      downloads: 0,
      rating: 5.0,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: true,
      permissions: ['ui'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'canvas-whiteboard',
      name: 'Canvas Whiteboard',
      version: '1.0.0',
      description: 'Visual brainstorming tool with an infinite canvas. Create mind maps, diagrams, and connect your notes visually.',
      author: 'Synaptic Team',
      icon: 'palette',
      category: 'visualization',
      tags: ['mind-maps', 'diagrams', 'visual'],
      screenshots: [],
      repository: 'https://github.com/synaptic/canvas-whiteboard-plugin',
      homepage: 'https://synaptic.app/plugins/canvas-whiteboard',
      downloads: 8300,
      rating: 4.7,
      lastUpdated: new Date('2025-12-18'),
      isOfficial: true,
      isComingSoon: true,
      permissions: ['read_notes', 'write_notes', 'storage'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'pomodoro-timer',
      name: 'Pomodoro Timer',
      version: '1.0.1',
      description: 'Productivity timer with customizable work/break intervals. Track your focus sessions and stay productive.',
      author: 'Community',
      icon: 'timer',
      category: 'productivity',
      tags: ['timer', 'focus', 'productivity'],
      screenshots: [],
      downloads: 5600,
      rating: 4.5,
      lastUpdated: new Date('2025-12-15'),
      isOfficial: false,
      permissions: ['ui'],
      minAppVersion: '0.1.0',
      settingsSchema: [
        {
          key: 'workDuration',
          type: 'number',
          label: 'Work Duration (minutes)',
          description: 'Length of each focus session',
          default: 25,
          min: 1,
          max: 120
        },
        {
          key: 'breakDuration',
          type: 'number',
          label: 'Break Duration (minutes)',
          description: 'Length of each break',
          default: 5,
          min: 1,
          max: 30
        },
        {
          key: 'autoStartBreak',
          type: 'toggle',
          label: 'Auto-start Break',
          description: 'Automatically start break after work session',
          default: true
        }
      ]
    },
    {
      id: 'kanban-board',
      name: 'Kanban Board',
      version: '1.0.0',
      description: 'Organize your notes into a Kanban board. Perfect for project management and task tracking.',
      author: 'Community',
      icon: 'layout',
      category: 'productivity',
      tags: ['kanban', 'tasks', 'project-management'],
      screenshots: [],
      downloads: 4100,
      rating: 4.3,
      lastUpdated: new Date('2025-12-10'),
      isOfficial: false,
      permissions: ['read_notes', 'write_notes', 'storage'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'local-rss',
      name: 'Local RSS',
      version: '1.0.2',
      description: 'Download RSS feed articles to local files.',
      author: 'onikun94',
      icon: 'rss',
      category: 'integration',
      tags: ['rss', 'news', 'download', 'offline'],
      screenshots: [],
      repository: 'https://github.com/onikun94/obsidian-local-rss',
      downloads: 670,
      rating: 4.8,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['network', 'write_notes'],
      minAppVersion: '0.1.0',
      settingsSchema: [
        {
          key: 'customFeeds',
          type: 'textarea',
          label: 'Custom Feed URLs',
          description: 'One RSS feed URL per line',
          default: 'https://hnrss.org/frontpage\nhttps://www.theverge.com/rss/index.xml\nhttps://www.wired.com/feed/rss'
        },
        {
          key: 'articlesPerFeed',
          type: 'number',
          label: 'Articles per Feed',
          description: 'Maximum articles to download from each feed',
          default: 5,
          min: 1,
          max: 20
        }
      ]
    },
    {
      id: 'obsidian-sync',
      name: 'Obsidian Sync',
      version: '1.0.0',
      description: 'Sync your Obsidian vault with Synaptic. Import and export notes between the two apps seamlessly.',
      author: 'Community',
      icon: 'refresh',
      category: 'integration',
      tags: ['obsidian', 'sync', 'import-export'],
      screenshots: [],
      downloads: 3100,
      rating: 4.4,
      lastUpdated: new Date('2025-12-05'),
      isOfficial: false,
      isComingSoon: true,
      permissions: ['read_vault', 'write_vault', 'read_notes', 'write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'emoji-picker',
      name: 'Emoji Picker',
      version: '1.0.0',
      description: 'Quick emoji insertion for your notes. Search and insert emojis with keyboard shortcuts.',
      author: 'Community',
      icon: 'smile',
      category: 'utility',
      tags: ['emoji', 'quick-insert', 'text'],
      screenshots: [],
      downloads: 2900,
      rating: 4.2,
      lastUpdated: new Date('2025-12-01'),
      isOfficial: false,
      isComingSoon: true,
      permissions: ['ui'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'reading-time',
      name: 'Reading Time',
      version: '1.0.0',
      description: 'Display estimated reading time in the status bar based on word count (200 wpm).',
      author: 'Supercip971',
      icon: 'clock',
      category: 'utility',
      tags: ['reading', 'stats', 'time', 'status-bar'],
      screenshots: [],
      downloads: 1200,
      rating: 4.8,
      lastUpdated: new Date('2025-12-25'),
      isOfficial: true,
      permissions: ['ui'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      version: '1.0.0',
      description: 'Sidebar calendar widget for quick navigation to your Daily Notes.',
      author: 'Synaptic Team',
      icon: 'calendar',
      category: 'productivity',
      tags: ['calendar', 'daily', 'navigation', 'sidebar'],
      screenshots: [],
      downloads: 750,
      rating: 4.9,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: true,
      permissions: ['ui', 'read_notes', 'write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'templater',
      name: 'Templater',
      version: '1.0.0',
      description: 'Smart template engine for Daily Notes with dynamic content support.',
      author: 'Synaptic Team',
      icon: 'file-text',
      category: 'productivity',
      tags: ['templates', 'daily', 'automation'],
      screenshots: [],
      downloads: 420,
      rating: 4.7,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: true,
      permissions: ['ui', 'write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'tasks',
      name: 'Tasks',
      version: '1.0.0',
      description: 'Aggregates all tasks (- [ ] #task) from your vault into a single view.',
      author: 'Synaptic Team',
      icon: 'check-square',
      category: 'productivity',
      tags: ['tasks', 'todo', 'management', 'sidebar'],
      screenshots: [],
      downloads: 1200,
      rating: 4.8,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: true,
      permissions: ['ui', 'read_notes', 'write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'typing-speed',
      name: 'Typing Speed',
      version: '1.0.0',
      description: 'Show the current typing speed (WPM) in the status bar.',
      author: 'Synaptic Team',
      icon: 'gauge',
      category: 'productivity',
      tags: ['typing', 'speed', 'wpm', 'status-bar'],
      screenshots: [],
      repository: 'https://github.com/Supercip971/obsidian-typing-speed',
      downloads: 800,
      rating: 4.5,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['ui'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'github-sync',
      name: 'GitHub Sync',
      version: '1.0.0',
      description: 'Sync your vault to a personal GitHub repository.',
      author: 'Kevin Chin',
      icon: 'github',
      category: 'integration',
      tags: ['github', 'sync', 'backup', 'git'],
      screenshots: [],
      repository: 'https://github.com/kevinmkchin/Obsidian-GitHub-Sync',
      downloads: 450,
      rating: 4.7,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['read_notes', 'write_notes', 'storage'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'fantasy-name',
      name: 'Fantasy Name Generator',
      version: '1.0.0',
      description: 'Insert a random fantasy name.',
      author: 'Lukewh',
      icon: 'wand',
      category: 'utility',
      tags: ['fantasy', 'name', 'generator', 'rpg'],
      screenshots: [],
      repository: 'https://github.com/Lukewh/fantasy-name',
      downloads: 300,
      rating: 4.6,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'meal-plan',
      name: 'Meal Plan',
      version: '1.0.0',
      description: 'Meal planning and recipe manager.',
      author: 'tmayoff',
      icon: 'utensils',
      category: 'productivity',
      tags: ['food', 'meal-plan', 'cooking'],
      screenshots: [],
      repository: 'https://github.com/tmayoff/obsidian-meals',
      downloads: 150,
      rating: 5.0,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['write_notes'],
      minAppVersion: '0.1.0',
    },
    {
      id: 'birthday-tracker',
      name: 'Birthday Tracker',
      version: '1.0.2',
      description: 'Keep track of all birthdays of your family and friends.',
      author: 'Raboro',
      icon: 'cake',
      category: 'utility',
      tags: ['birthday', 'calendar', 'tracker', 'people'],
      screenshots: [],
      repository: 'https://github.com/Raboro/Obsidian-Birthday-Tracker-Plugin',
      downloads: 400,
      rating: 4.9,
      lastUpdated: new Date('2025-12-26'),
      isOfficial: false,
      permissions: ['read_notes'],
      minAppVersion: '0.1.0',
      settingsSchema: [
        {
          key: 'dateFormat',
          type: 'select',
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
          type: 'number',
          label: 'Upcoming Birthdays to Show',
          description: 'Number of upcoming birthdays to display',
          default: 5,
          min: 1,
          max: 20
        }
      ]
    },
    {
      id: 'web-search',
      name: 'Web Search',
      version: '1.0.0',
      description: 'Search the Web from Synaptic using bangs (e.g., !g for Google, !d for DuckDuckGo).',
      author: 'Synaptic Team',
      icon: 'globe',
      category: 'utility',
      tags: ['search', 'web', 'browser', 'bangs'],
      screenshots: [],
      downloads: 5000,
      rating: 5.0,
      lastUpdated: new Date('2025-12-27'),
      isOfficial: true,
      permissions: ['network'],
      minAppVersion: '1.0.0',
      settingsSchema: [
        {
          key: 'defaultEngine',
          type: 'select',
          label: 'Default Search Engine',
          description: 'Engine to use for fallback search',
          default: '!g',
          options: [
            { value: '!g', label: 'Google' },
            { value: '!d', label: 'DuckDuckGo' },
            { value: '!w', label: 'Wikipedia' },
          ],
        },
        {
          key: 'enableFallback',
          type: 'toggle',
          label: 'Enable Fallback',
          description: 'Show web search option when no other results match',
          default: true
        }
      ]
    },
    {
      id: 'voice-memos',
      name: 'Voice Memos',
      version: '1.0.0',
      description: 'Record audio notes with auto-transcription.',
      author: 'Synaptic Team',
      icon: 'mic',
      category: 'productivity',
      tags: ['audio', 'record', 'transcribe', 'voice'],
      screenshots: [],
      downloads: 1500,
      rating: 4.8,
      lastUpdated: new Date('2025-12-27'),
      isOfficial: true,
      permissions: ['write_notes', 'storage'],
      minAppVersion: '1.0.0',
    },
    {
      id: 'google-drive-backup',
      name: 'Google Drive Backup',
      version: '1.0.0',
      description: 'Backup your vault to Google Drive as a Zip or Sync files.',
      author: 'Synaptic Team',
      icon: 'cloud',
      category: 'integration',
      tags: ['backup', 'google-drive', 'cloud', 'sync'],
      screenshots: [],
      downloads: 100,
      rating: 5.0,
      lastUpdated: new Date('2025-12-27'),
      isOfficial: true,
      permissions: ['read_notes', 'write_notes', 'read_vault', 'write_vault', 'network'],
      minAppVersion: '1.0.0',
      settingsSchema: [
        {
          key: 'accessToken',
          type: 'textarea',
          label: 'Google Access Token',
          description: 'Get a token from OAuth Playground (https://developers.google.com/oauthplayground)',
          default: '',
        },
        {
          key: 'mode',
          type: 'select',
          label: 'Operation Mode',
          description: 'Choose between full Backup (Zip) or Sync (File Mirror)',
          default: 'backup',
          options: [
            { value: 'backup', label: 'Backup (Zip Snapshot)' },
            { value: 'sync', label: 'Sync (Manual Push/Pull)' },
          ],
        },
        {
          key: 'backupFrequency',
          type: 'select',
          label: 'Backup Frequency',
          description: 'How often to remind you to backup',
          default: 'manual',
          options: [
            { value: 'manual', label: 'Manual Only' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ],
        },
      ]
    },
    {
      id: 'weather',
      name: 'Weather',
      version: '1.0.0',
      description: 'Display current weather in status bar using Open-Meteo.',
      author: 'Synaptic Team',
      icon: 'sun',
      category: 'utility',
      tags: ['weather', 'forecast', 'status-bar'],
      downloads: 42,
      rating: 4.9,
      lastUpdated: new Date('2025-12-27'),
      isOfficial: true,
      permissions: ['network', 'ui'],
      minAppVersion: '1.0.0',
      settingsSchema: [
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
      ]
    }
  ];
}

/**
 * Get plugin by ID
 */
export async function getPluginById(id: string): Promise<PluginManifest | undefined> {
  const plugins = await getAvailablePlugins();
  return plugins.find(p => p.id === id);
}
