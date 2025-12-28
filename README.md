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
2. **AI Integration**:
    - **Local Intelligence (Ollama)**: Chat with your notes, summarize documents, and brainstorm ideas.
    - **Voice Mode (Kokoro TTS)**: Fluid, natural voice conversations with offline neural speech.
    - **Context Aware**: The AI understands your active note and vault content.
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
3. Launch Synaptic and start chatting!

> **Note**: The high-quality voice model (Kokoro, ~80MB) will be downloaded automatically the first time you enable Voice Mode. It runs 100% offline after that.

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
- **[Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)** - High-quality local text-to-speech model

# 📄 License
This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

### 🛡️ Why AGPL-3.0?
Synaptic is an open-source, local-first companion. We chose the AGPL-3.0 license to ensure that:
1. **The community benefits from all improvements**: If you modify the code and distribute it, you must share those changes.
2. **The "Cloud Loophole" is closed**: If you host this as a network service, you must provide the source code to your users.
3. **Synaptic stays open forever**: It protects the project from being used in proprietary derivatives while keeping it free for everyone to use and improve.
