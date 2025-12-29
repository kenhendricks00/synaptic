# Changelog

All notable changes to Synaptic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-12-28

### 🎓 Learning Hub

A dedicated space for all your AI-generated learning content!

- **Flashcard Decks**: Save and study AI-generated flashcards with flip-to-reveal cards
- **Quiz Mode**: Take saved quizzes with score tracking and instant feedback
- **Podcast Library**: Save and replay AI podcasts with full media controls
- **Segment Scrubber**: Click to jump between podcast segments, progress bar, skip controls
- **Keyboard Shortcut**: Press `⌘4` / `Ctrl+4` to access Learning Hub

### 🎴 AI Flashcard Generation

Generate study flashcards from any note!

- **Smart Extraction**: AI identifies 5-8 key concepts from your note
- **Q&A Format**: Each card has a front (question) and back (answer)
- **Save to Hub**: Save generated decks to Learning Hub for later study

### 📋 AI Quiz Generation

Test your knowledge with AI-generated quizzes!

- **Multiple Choice**: 5 questions with 4 options each
- **Instant Feedback**: Green checkmark for correct, red X for incorrect
- **Score Tracking**: See your score and performance at the end
- **Retry or Save**: Try again immediately or save quiz for later

### 🔊 Read Aloud

Select any text and have it read aloud!

- **Selection Menu**: New "Read Aloud" button appears when you select text
- **Kokoro TTS**: Uses your configured voice settings
- **Quick Access**: Perfect for proofreading or accessibility

### 🏠 Welcome Dashboard

A beautiful new home screen greets you on startup!

- **Time-Based Greeting**: "Good morning/afternoon/evening, [Name]!" based on time of day
- **Birthday Celebration**: Special message with sparkles on your birthday 🎂🎉
- **Quick Actions**: Create New Note and Today's Daily Note buttons
- **Recent Notes**: Last 5 edited notes with quick access
- **Vault Stats**: Shows total note count
- **Dashboard Badge**: Header shows "Dashboard" when on home view
- **Logo Navigation**: Click the Synaptic logo to return to Dashboard from anywhere

### 🎙️ AI Podcast Generation

Generate NotebookLM-style podcasts about your notes!

- **Two AI Hosts**: Alex (curious female) and Sam (knowledgeable male)
- **Natural Conversation**: AI generates an engaging 2-minute discussion about your note
- **Kokoro TTS**: Uses alternating voices (af_heart & am_adam)
- **Live Playback**: Shows current speaker and text as podcast plays
- **Stop Button**: Cancel playback at any time
- **Gradient UI**: Beautiful purple-pink styling for podcast controls

### 👤 Personalization Settings

New dedicated "Personalization" section in Settings:

- **Your Name**: Change how the AI addresses you
- **Birthday**: Set your birthday for special greetings
- **AI Integration**: AI system prompt now includes your name and birthday

### 🤖 AI Gets Superpowers

This release focuses on making the AI smarter and giving it control over the entire application through plugins.

#### 🔌 AI Plugin Integration
- **Command Execution**: The AI can now execute any registered plugin command (e.g., "Start a timer", "Toggle focus mode").
- **Dynamic Command Discovery**: AI automatically knows about all available commands from enabled plugins.
- **Natural Confirmations**: Improved response quality after executing commands - no more awkward echoing.

#### 🧠 Smarter Context
- **Always-On Active Note**: The currently open note is now always injected into AI context, regardless of query wording.
- **Better Search Navigation**: Asking the AI to "find" or "open" a note now properly opens it in the editor (not just displaying content in chat).

### 🎨 Custom Modal System
- **Beautiful Prompts**: Replaced browser's ugly default `prompt()` dialogs with custom styled modals.
- **Themed Design**: Modals match Synaptic's dark aesthetic with solid backgrounds (no transparency issues).
- **Keyboard Support**: Enter to confirm, Escape to cancel, click outside to dismiss.
- **Promise-based API**: New `useModalStore` with `prompt()`, `confirm()`, and `alert()` methods for easy use throughout the app.

### 📜 License Update
- **AGPL-3.0**: Relicensed from MIT to AGPL-3.0 for stronger open-source protection.
- Updated LICENSE file, README, package.json, and website footer.

### 🎙️ Personalized AI Onboarding
- **Name Input**: First step now asks "What should I call you?" to personalize the experience.
- **AI Voice Greeting**: "Hello [Name]! I'm Synaptic..." - the first voice greeting creates an emotional connection.
- **Narrated Walkthrough**: Every step is read aloud by the AI with Kokoro TTS.
- **Smart Auto-Advance**: Informational steps (Notes, Plugins) auto-advance after narration; interactive steps (Vault, AI) wait for user action.
- **Skip Greeting on Back**: Navigation properly skips the one-time greeting step when going backwards.
- **Auto-Refresh on Reset**: Clicking "Reset Onboarding" in Settings immediately refreshes to start the flow.

### ✨ Onboarding Polish
- **🔊 Sound Effects**: Subtle chime on step transitions
- **⌨️ Keyboard Shortcuts**: Enter = Next, Escape = Skip
- **💾 Progress Persistence**: Resume onboarding if closed mid-flow
- **🎬 Caption Bar**: Beautiful glassy bar with glow effect showing narration text

### 🛠️ Technical
- New `HomeDashboard` component with greeting and quick actions
- Added `speakSegments()` to Kokoro service for sequential voice playback
- Added `generatePodcast()`/`stopPodcast()` to AI store
- New `'home'` view type and default view changed to home
- Added `userBirthday` to Settings interface
- Personalization info injected into AI system prompt
- New `src/stores/modalStore.ts` for global modal state management
- New `src/components/ui/Modal.tsx` component
- Updated `aiStore.ts` with `invoke_command` tool handler
- Improved `SYSTEM_PROMPT` with clearer instructions for tool usage

## [1.0.1] - 2025-12-27

### 🚀 Voice Mode Experience Upgrade

This release brings a massive overhaul to the Voice Mode, moving entirely offline for TTS and refining the conversation flow.

#### 🧠 Local Intelligence
- **Offline High-Quality TTS**: Integrated `Kokoro` (82M) directly into the app. No more external dependencies or slow system voices.
- **WebGPU Acceleration**: Powered by ONNX Runtime with WebGPU backend for blazing fast audio generation on supported hardware.
- **Sentence Streaming**: Audio now plays instantly as it is generated (sentence-by-sentence), eliminating perceived latency.

#### 🎨 Visuals
- **AI Glow**: Added a premium animated mesh gradient that swirls when the AI speaks.
- **Ambient Pulse**: Subtle breathing glow effect when the microphone is ready for input.
- **Layout Fixes**: Moved "Speaking" indicator to status bar to preserve header layout.

#### 🗣️ Interaction
- **Continuous Conversation**: The AI now automatically re-enables the microphone after executing tools (like creating notes), allowing for seamless multi-turn workflows.
- **New Voices**: Added 9 distinct high-quality voices, defaulting to "Heart" (US Female).
- **Barge-In**: Speaking instantly stops the AI's audio response.

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
