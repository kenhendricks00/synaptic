# Synaptic Plugin System

The plugin system allows developers to extend Synaptic with custom functionality. Plugins can add new views, toolbar components, sidebar components, and more.

## Architecture

### Core Components

1. **Plugin Types** (`src/plugins/types.ts`) - Defines plugin interfaces and types
2. **Plugin Manager** (`src/plugins/manager.ts`) - Manages plugin lifecycle and registration
3. **Plugin Store** (`src/plugins/store.ts`) - Zustand store for plugin state
4. **Plugin Registry** (`src/plugins/registry.ts`) - Registry of available plugins

## Creating a Plugin

### Basic Plugin Structure

```typescript
import type { Plugin } from '../../plugins/types';

export class MyPlugin implements Plugin {
  id = 'my-plugin';
  name = 'My Plugin';
  version = '1.0.0';
  description = 'Description of what the plugin does';
  author = 'Your Name';
  category = 'productivity' as const;
  tags = ['tag1', 'tag2'];
  permissions: Plugin['permissions'] = ['read_notes', 'storage'];

  // Lifecycle hooks
  async onLoad() {
    console.log('Plugin loaded');
  }

  async onUnload() {
    console.log('Plugin unloaded');
  }

  async onEnable() {
    console.log('Plugin enabled');
  }

  async onDisable() {
    console.log('Plugin disabled');
  }
}

export default MyPlugin;
```

### Adding UI Components

```typescript
import { MyView } from './components/MyView';

export class MyPlugin implements Plugin {
  // ... other properties

  components = {
    view: MyView,        // Full page view
    toolbar: MyToolbar,  // Toolbar component
    sidebar: MySidebar,   // Sidebar component
    settings: MySettings, // Settings page
  };
}
```

### Adding Commands

```typescript
export class MyPlugin implements Plugin {
  // ... other properties

  commands = [
    {
      id: 'my-command',
      name: 'My Command',
      description: 'Does something cool',
      keyboard: '⌘⇧M',
      handler: () => {
        console.log('Command executed!');
      }
    }
  ];
}
```

## Plugin Permissions

Plugins can request the following permissions:

- `read_notes` - Read note content
- `write_notes` - Create and modify notes
- `read_vault` - Read vault metadata
- `write_vault` - Modify vault structure
- `network` - Make network requests
- `storage` - Access localStorage
- `ui` - Modify UI elements

## Categories

- `productivity` - Tools that boost productivity
- `visualization` - Visual tools and graphs
- `integration` - Third-party integrations
- `ai` - AI-powered features
- `utility` - Helper utilities

## Example Plugins

### Spaced Repetition (`src/plugins/built-in/spaced-repetition/`)

Implements a flashcard-based learning system using the SM-2 algorithm:
- Create flashcards with questions and answers
- Review cards based on spaced repetition
- Track learning progress

### Canvas Whiteboard (`src/plugins/built-in/canvas-whiteboard/`)

An infinite canvas for visual brainstorming:
- Draw shapes (rectangles, circles, text)
- Pan and zoom the canvas
- Save and export canvas data

## Building Plugins

1. Create a new folder in `src/plugins/built-in/your-plugin/`
2. Create `index.tsx` with your plugin class
3. Create any necessary components
4. Add your plugin to the registry (`src/plugins/registry.ts`)
5. Build and test!

## Plugin Registry

To make your plugin available in the marketplace, add it to the registry in `src/plugins/registry.ts`:

```typescript
export async function getAvailablePlugins(): Promise<PluginManifest[]> {
  return [
    // ... existing plugins
    {
      id: 'your-plugin',
      name: 'Your Plugin',
      version: '1.0.0',
      description: 'What your plugin does',
      author: 'Your Name',
      icon: '🎉',
      category: 'productivity',
      tags: ['example'],
      downloads: 0,
      rating: 0,
      lastUpdated: new Date(),
      isOfficial: false,
      permissions: ['read_notes'],
      minAppVersion: '0.1.0',
    }
  ];
}
```

## Installation

Users can install plugins from the Marketplace UI:
1. Navigate to "Marketplace" from the sidebar
2. Browse available plugins
3. Click "Install" to add a plugin
4. Enable/disable plugins from the plugin list

## Data Storage

Plugins can use localStorage for persistence:

```typescript
// Save data
localStorage.setItem('my-plugin-data', JSON.stringify(data));

// Load data
const data = JSON.parse(localStorage.getItem('my-plugin-data') || '{}');
```

## API Access

Plugins can access the stores to interact with the app:

```typescript
import { useVaultStore } from '../../stores';
import { useUIStore } from '../../stores';

const { notes, activeNoteId } = useVaultStore.getState();
const { currentView } = useUIStore.getState();
```

## Best Practices

1. **Prefix all storage keys** with your plugin ID
2. **Clean up** in the `onUnload` hook
3. **Handle errors gracefully** with try-catch blocks
4. **Request minimal permissions** - only what you need
5. **Test thoroughly** before publishing
6. **Document your plugin** with clear instructions

## Future Enhancements

- Remote plugin registry (API)
- Plugin marketplace website
- Plugin analytics and ratings
- Plugin update notifications
- Plugin sandboxing for security
- Plugin dependencies
- Plugin internationalization (i18n)

## Contributing

We welcome community plugins! Feel free to fork the repository and submit pull requests with your awesome plugins.
