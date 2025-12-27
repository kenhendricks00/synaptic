# Changelog

All notable changes to Synaptic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-27

### 🎉 Initial Release

The first public release of Synaptic - your intelligent, local-first knowledge companion.

### ✨ Features

#### Core Editor
- **Markdown Editor** with TipTap-powered rich text editing
- **[[Wikilinks]]** for connecting notes with automatic backlink detection
- **Backlinks Panel** showing all notes that reference the current note
- **Auto-save** with configurable intervals
- **Spell check** toggle
- **Customizable fonts** (font family, size, line height)

#### Knowledge Graph
- **Interactive graph visualization** of your entire vault
- **Force-directed layout** with smooth physics simulation
- **Click-to-navigate** between connected notes
- **Real-time updates** as you create and link notes

#### Daily Notes
- **Quick daily note creation** with keyboard shortcut
- **Calendar widget** in sidebar for navigation
- **Templater plugin** support for custom daily note templates

#### AI Integration
- **Chat with your notes** using local LLMs via Ollama
- **Context-aware responses** based on your knowledge base
- **Smart summarization** and brainstorming
- **100% local** - no data leaves your machine

#### Spaced Repetition
- **Flashcard system** with SM-2 algorithm
- **Create cards directly in notes** using `?question::answer` syntax
- **Study view** with flip animations
- **Progress tracking** (Easy/Good/Hard/Again)

#### Plugin System
- **Built-in Plugin Marketplace** with categories and search
- **One-click install/uninstall** for all plugins
- **Plugin settings** with declarative schema
- **Coming Soon badges** for unreleased plugins

#### Themes
- **Light Mode** - Clean, bright interface
- **Dark Mode** - Easy on the eyes
- **OLED Mode** - True black for battery saving
- **Catppuccin Mocha** - Vibrant pastel-on-dark aesthetic

### 🔌 Included Plugins

#### Productivity
- **Pomodoro Timer** - Focus sessions with customizable work/break intervals
- **Tasks** - Aggregate all `- [ ] #task` items from your vault
- **Calendar** - Sidebar widget for daily note navigation
- **Templater** - Dynamic templates for daily notes

#### Utility
- **Reading Time** - Estimated read time in status bar
- **Typing Speed** - Real-time WPM tracking
- **Core Commands** - 25+ essential note-taking commands

#### Integration
- **Local RSS** - Download articles for offline reading
- **GitHub Sync** - Sync vault to a GitHub repository (Coming Soon)
- **Obsidian Sync** - Import/export with Obsidian (Coming Soon)

#### Fun
- **Birthday Tracker** - Never forget a birthday
- **Meal Plan** - Weekly meal planning
- **Fantasy Name Generator** - Random fantasy names for RPG notes

### ⚙️ Settings
- **Factory Reset** - One-click cleanup with confirmation
- **Onboarding** - Guided setup for new users
- **Core plugin toggles** - Enable/disable built-in features
- **AI configuration** - Model selection and endpoint settings

### 🏗️ Technical
- Built with **Tauri** for lightweight, native performance
- **React** + **TypeScript** frontend
- **Zustand** for state management with persistence
- **TipTap** rich text editor
- **D3.js** force-directed graph
- Cross-platform: **Windows**, **macOS**, **Linux**

### 📖 Documentation
- **Landing page** at `/docs` for GitHub Pages
- **Comprehensive README** with setup instructions
- **GitHub Actions** workflow for automated releases

---

[1.0.0]: https://github.com/kenhendricks00/synaptic/releases/tag/v1.0.0
