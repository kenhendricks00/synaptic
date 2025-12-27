<p align="center">
  <a href="https://github.com/kenhendricks00/Synaptic/releases"><img src="https://raw.githubusercontent.com/kenhendricks00/Synaptic/main/assets/banner.png" /></a>
</p>
<div align="center">
  <a href="https://github.com/kenhendricks00/Synaptic/releases/latest">
    <img src="https://img.shields.io/github/v/release/kenhendricks00/Synaptic?label=Download&color=blue" alt="Download"></a>
  <a href="https://github.com/kenhendricks00/Synaptic/stargazers">
    <img src="https://img.shields.io/github/stars/kenhendricks00/Synaptic?label=Stars&color=yellow" alt="Stars"></a>
  <a href="https://github.com/kenhendricks00/Synaptic/commits/main/">
    <img src="https://img.shields.io/github/last-commit/kenhendricks00/Synaptic?label=Last%20Commit&color=green" alt="Last Commit"></a>
</div>
<br>
<h2> <div align="center"><b> Your Intelligent, Local-First Knowledge Companion. </b></div> </h2>

# 🛠️ Usage
Launch Synaptic, select a folder as your **Vault**, and start writing. Your notes are plain **Markdown files** stored locally on your machine—no cloud, no sync, complete privacy.

<p align="center">
<img src="https://raw.githubusercontent.com/kenhendricks00/Synaptic/main/assets/header.png">
</p>

**Keyboard Shortcuts:**
- `Ctrl+N` - Create a new note
- `Ctrl+K` - Open quick search / command palette
- `Ctrl+G` - Toggle knowledge graph view
- `Ctrl+T` - Open AI chat interface
- `Ctrl+,` - Open settings

# 🌟 Why Choose Synaptic?
- **100% Local & Private**: All your notes and AI processing stay on your machine. No cloud, no tracking.
- **AI-Powered**: Chat with your notes using local LLMs via Ollama. Summarize, brainstorm, and explore your ideas.
- **Extensible Plugin System**: Install community plugins from the Marketplace to customize your workflow.
- **Beautiful Themes**: Choose from Light, Dark, OLED (True Black), or Catppuccin Mocha themes.

# 📋 Key Features
1. **Intelligent Note-Taking**:
    - **Markdown Editor** with live preview and rich formatting
    - **[[Wikilinks]]** to connect your ideas
    - **Backlinks Panel** to see what notes reference the current one
    - **Knowledge Graph** to visualize your entire vault
2. **AI Integration (via Ollama)**:
    - **Chat with your Notes**: Ask questions about your knowledge base
    - **Smart Summarization**: Get quick summaries of long documents
    - **Brainstorming Partner**: Generate ideas based on your existing notes
3. **Daily Notes**:
    - Quick capture for daily thoughts and logs
    - Calendar widget for easy navigation
    - Customizable templates via the Templater plugin
4. **Spaced Repetition**:
    - Create flashcards directly in your notes
    - SM-2 algorithm for optimal review intervals
    - Track your study progress
5. **Plugin Marketplace**:
    - **Pomodoro Timer** for focused work sessions
    - **Tasks View** to aggregate all your to-dos
    - **Local RSS** to download articles for offline reading
    - **Birthday Tracker**, **Meal Planner**, and more!

# 🚀 Download Synaptic
Download the latest release for your platform:
- [Windows (.exe)](https://github.com/kenhendricks00/Synaptic/releases/latest)
- [macOS (.dmg)](https://github.com/kenhendricks00/Synaptic/releases/latest)
- [Linux (.AppImage / .deb)](https://github.com/kenhendricks00/Synaptic/releases/latest)

# 🧠 Setting Up AI Features
Synaptic uses **Ollama** to run AI models locally. To enable AI features:

1. Download and install [Ollama](https://ollama.ai)
2. Open a terminal and run:
```bash
ollama pull llama3.1:8b
```
3. Launch Synaptic and start chatting with your notes!

# 🏗️ Build From Source
Clone the repository and build with Tauri:
```bash
git clone https://github.com/kenhendricks00/Synaptic.git
cd Synaptic
npm install
npm run tauri build
```

# 💬 Support
If you need support or have any questions, you can open an issue on [GitHub](https://github.com/kenhendricks00/Synaptic/issues).

# 🎉 Quick Links
- [Download Synaptic](https://github.com/kenhendricks00/Synaptic/releases/latest)
- [Star us on GitHub](https://github.com/kenhendricks00/Synaptic)
- [Report a Bug](https://github.com/kenhendricks00/Synaptic/issues)

# 📜 Credits & Inspiration
Synaptic is inspired by the incredible work of the open-source community:
- **[Obsidian](https://obsidian.md)** - The original inspiration for local-first knowledge management
- **[Ollama](https://ollama.ai)** - Local LLM inference engine
- **[Tauri](https://tauri.app)** - Lightweight desktop app framework
- **[TipTap](https://tiptap.dev)** - Headless rich-text editor
- **Plugin Inspirations**:
    - Reading Time by [Supercip971](https://github.com/Supercip971/obsidian-reading-time)
    - Typing Speed by [Supercip971](https://github.com/Supercip971/obsidian-typing-speed)
    - Local RSS by [onikun94](https://github.com/onikun94/obsidian-local-rss)
    - Birthday Tracker by [Raboro](https://github.com/Raboro/Obsidian-Birthday-Tracker-Plugin)
    - Meal Plan by [tmayoff](https://github.com/tmayoff/obsidian-meals)
    - Fantasy Name by [Lukewh](https://github.com/Lukewh/fantasy-name)
    - GitHub Sync by [Kevin Chin](https://github.com/kevinmkchin/Obsidian-GitHub-Sync)

# 📄 License
MIT License - See [LICENSE](LICENSE) for details.
