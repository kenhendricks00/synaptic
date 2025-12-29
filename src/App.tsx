import { useEffect } from 'react';
import { useVaultStore, useUIStore, usePluginStore, useSettingsStore, useAIStore } from './stores';
import { TaskView } from './plugins/built-in/tasks';
import {
  Sidebar,
  NoteEditor,
  SearchModal,
  SearchView,
  WelcomeScreen,
  DailyNotes,
  ChatInterface,
  Marketplace,
  PluginManager,
  GraphView,
  Onboarding,
  Settings,
  CreateNoteModal,
  FlashcardStudy,
  WeatherWidget,
  HomeDashboard,
  LearningHub
} from './components';
import { Modal } from './components/ui/Modal';
import { FileText, Clock, Save, Square, Play, Pause } from 'lucide-react';
import { formatDate, loadNote, loadVault, loadNotesMetadata } from './lib';

function App() {
  const {
    currentVault,
    setCurrentVault,
    noteMetadata,
    setNoteMetadata,
    activeNoteId,
    notes,
    addNote,
    isLoading,
    isInitialized,
    setInitialized,
    error,
    autoLoadFolder
  } = useVaultStore();

  const { currentView, hasUnsavedChanges, wordCount, typingSpeed, pomodoroStatus, focusMode, setFocusMode } = useUIStore();
  const { installed } = usePluginStore();
  const { settings, updateSettings } = useSettingsStore();
  const { podcastStatus, podcastCurrentSpeaker, stopPodcast, pausePodcast, resumePodcast } = useAIStore();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'oled', 'catppuccin');

    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'oled') {
      root.classList.add('oled');
    } else if (settings.theme === 'catppuccin') {
      root.classList.add('catppuccin');
    } else if (settings.theme === 'light') {
      // already removed dark/oled/catppuccin
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, [settings.theme]);

  // Mark onboarding as complete
  const handleOnboardingComplete = () => {
    updateSettings({ onboardingCompleted: true });
    // Refresh for clean React state
    window.location.reload();
  };

  // Show onboarding if not explicitly completed (handles undefined for existing users)
  const shouldShowOnboarding = settings.onboardingCompleted !== true;

  // Auto-load vault or default folder on launch
  useEffect(() => {
    const autoLoad = async () => {
      // Use autoLoadFolder if set, otherwise fallback to the persisted currentVault path
      const pathToLoad = autoLoadFolder || currentVault?.path;

      // Stop if no path, or if currently loading, or already initialized
      if (!pathToLoad || isLoading || isInitialized) return;

      // Only sync if metadata is empty (initial launch or vault switch)
      if (noteMetadata.length === 0) {
        try {
          console.log('[App] Auto-syncing vault contents:', pathToLoad);
          const vault = await loadVault(pathToLoad);
          const metadata = await loadNotesMetadata(pathToLoad);

          setCurrentVault(vault);
          setNoteMetadata(metadata);
          setInitialized(true); // Mark as initialized
        } catch (error) {
          console.error('[App] Auto-sync failed:', error);
          setInitialized(true); // Mark as initialized even on error to prevent infinite loop
        }
      } else {
        // Metadata already loaded (from WelcomeScreen), just mark as initialized
        setInitialized(true);
      }
    };

    autoLoad();
  }, [autoLoadFolder, currentVault?.path, noteMetadata.length, isLoading, isInitialized, setCurrentVault, setNoteMetadata, setInitialized]);

  // Load active note content when it changes
  useEffect(() => {
    const loadActiveNote = async () => {
      if (!activeNoteId || !currentVault) return;

      // Check if we already have the full note
      const existingNote = notes.get(activeNoteId);
      if (existingNote && existingNote.content) return;

      // Find the note metadata
      const state = useVaultStore.getState();
      const metadata = state.noteMetadata.find((n) => n.id === activeNoteId);
      if (!metadata) return;

      try {
        const fullNote = await loadNote(metadata.path);
        addNote({ ...fullNote, id: activeNoteId });
      } catch (err) {
        console.error('Failed to load note:', err);
      }
    };

    loadActiveNote();
  }, [activeNoteId, currentVault, notes, addNote]);

  // Keyboard Shortcuts - must be before any early returns!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      // Toggle Focus Mode (Cmd+Shift+F)
      if (e.code === 'KeyF' && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().setFocusMode(!useUIStore.getState().focusMode);
      }

      // Toggle Sidebar (Cmd+\)
      if (e.code === 'Backslash' && !e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }

      switch (e.key) {
        case '1':
          e.preventDefault();
          useUIStore.getState().setCurrentView('editor');
          break;
        case '2':
          if (settings.corePlugins['daily-notes'] !== false) {
            e.preventDefault();
            useUIStore.getState().setCurrentView('daily');
          }
          break;
        case '3':
          if (settings.corePlugins['graph-view'] !== false) {
            e.preventDefault();
            useUIStore.getState().setCurrentView('graph');
          }
          break;
        case '4':
          e.preventDefault();
          useUIStore.getState().setCurrentView('learning');
          break;
        case ',':
          e.preventDefault();
          useUIStore.getState().setCurrentView('settings');
          break;
        case 'n':
          e.preventDefault();
          useUIStore.getState().setCreateNoteModalOpen(true);
          break;
        case 't':
        case 'x':
          e.preventDefault();
          const aiState = useAIStore.getState();
          aiState.setIsOpen(!aiState.isOpen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.corePlugins]);

  // Debug: Log current render state
  console.log('[App Render]', {
    currentVault: !!currentVault,
    isLoading,
    isInitialized,
    noteMetadataCount: noteMetadata.length,
    error,
    shouldShowOnboarding
  });

  // Show onboarding first if not completed (takes priority over WelcomeScreen)
  if (shouldShowOnboarding) {
    console.log('[App] → Showing Onboarding');
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Show welcome screen if no vault is open (only after onboarding is done)
  if (!currentVault && !isLoading) {
    console.log('[App] → Showing WelcomeScreen');
    return <WelcomeScreen />;
  }

  // Loading state
  if (isLoading) {
    console.log('[App] → Showing Loading (isLoading=true)');
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-foreground-secondary">Loading vault...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && noteMetadata.length === 0) {
    console.log('[App] → Showing Error');
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-error mb-2">Error loading vault</p>
          <p className="text-foreground-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  console.log('[App] → Showing Main App');

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar */}
      {!focusMode && <Sidebar />}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {!focusMode && (
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-secondary/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground-secondary py-1 px-2.5 bg-background-tertiary rounded-md font-medium">
                {currentView === 'home' && 'Dashboard'}
                {currentView === 'editor' && 'Notes'}
                {currentView === 'daily' && 'Daily Notes'}
                {currentView === 'graph' && 'Knowledge Graph'}
                {currentView === 'search' && 'Search Results'}
                {currentView === 'settings' && 'App Settings'}
                {currentView === 'plugins' && 'Plugin Manager'}
                {currentView === 'marketplace' && 'Plugin Marketplace'}
                {currentView === 'study' && 'Flashcard Study'}
                {currentView === 'learning' && 'Learning Hub'}
              </span>
            </div>

            <div id="main-header-right" className="flex items-center gap-4 text-xs text-foreground-muted">
              {(currentView === 'editor' || currentView === 'daily') && (
                <>
                  {hasUnsavedChanges ? (
                    <span className="flex items-center gap-1.5 text-warning font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                      Unsaved Changes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-green-500 font-medium opacity-80">
                      <Save className="w-3.5 h-3.5" />
                      All Changes Saved
                    </span>
                  )}
                  <div className="w-px h-3 bg-border mx-1" />
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {wordCount} words
                  </span>
                  {installed.get('reading-time')?.enabled && (
                    <>
                      <div className="w-px h-3 bg-border mx-1" />
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {Math.ceil(wordCount / 200)} min read
                      </span>
                    </>
                  )}
                  {installed.get('typing-speed')?.enabled && (
                    <>
                      <div className="w-px h-3 bg-border mx-1" />
                      <span className="flex items-center gap-1.5">
                        {typingSpeed} WPM
                      </span>
                    </>
                  )}
                  {installed.get('pomodoro-timer')?.enabled && pomodoroStatus && (
                    <>
                      <div className="w-px h-3 bg-border mx-1" />
                      <span className="flex items-center gap-1.5 text-accent font-medium">
                        {pomodoroStatus}
                      </span>
                    </>
                  )}
                </>
              )}
              <div className="w-px h-3 bg-border mx-1" />

              {/* Podcast Controls */}
              {(podcastStatus === 'playing' || podcastStatus === 'paused' || podcastStatus === 'generating') && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                    {podcastStatus === 'generating' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-purple-400">Generating...</span>
                      </>
                    ) : (
                      <>
                        {/* Mini Waveform */}
                        <div className="flex items-center gap-0.5 h-4">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                              style={{
                                animation: podcastStatus === 'playing' ? `waveform 0.8s ease-in-out infinite` : 'none',
                                animationDelay: `${i * 0.1}s`,
                                height: podcastStatus === 'paused' ? '40%' : '100%',
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-purple-400">
                          {podcastCurrentSpeaker || (podcastStatus === 'paused' ? 'Paused' : 'Playing')}
                        </span>
                        {/* Play/Pause */}
                        <button
                          onClick={() => podcastStatus === 'paused' ? resumePodcast() : pausePodcast()}
                          className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                          title={podcastStatus === 'paused' ? 'Resume' : 'Pause'}
                        >
                          {podcastStatus === 'paused' ? (
                            <Play className="w-3 h-3 text-purple-400" />
                          ) : (
                            <Pause className="w-3 h-3 text-purple-400" />
                          )}
                        </button>
                        {/* Stop */}
                        <button
                          onClick={() => stopPodcast()}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Stop Podcast"
                        >
                          <Square className="w-3 h-3 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="w-px h-3 bg-border mx-1" />
                </>
              )}

              {/* Weather Widget */}
              {installed.get('weather')?.enabled && (
                <>
                  <WeatherWidget />
                  <div className="w-px h-3 bg-border mx-1" />
                </>
              )}

              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(new Date())}
              </span>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'home' && <HomeDashboard />}
          {currentView === 'editor' && <NoteEditor />}
          {currentView === 'daily' && <DailyNotes />}
          {currentView === 'search' && <SearchView />}
          {currentView === 'graph' && <GraphView />}
          {currentView === 'marketplace' && <Marketplace />}
          {currentView === 'plugins' && <PluginManager />}
          {currentView === 'tasks' && <TaskView />}
          {currentView === 'study' && <FlashcardStudy />}
          {currentView === 'learning' && <LearningHub />}
          {currentView === 'settings' && <Settings />}
        </div>

        {/* Focus Mode Exit Button - Floating over content */}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="absolute bottom-6 right-6 px-4 py-2 bg-background-tertiary/80 backdrop-blur border border-border rounded-full text-foreground-muted hover:text-foreground hover:border-accent/50 transition-all flex items-center gap-2 shadow-lg z-50 group"
          >
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium">Focus Mode On</span>
            <span className="text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0">
              (Click to Exit)
            </span>
          </button>
        )}
      </main>

      {/* Search Modal */}
      <SearchModal />

      {/* Create Note Modal (Global Singleton) */}
      <CreateNoteModal isOpen={useUIStore((state) => state.createNoteModalOpen)} onClose={() => useUIStore.getState().setCreateNoteModalOpen(false)} />

      {/* AI Chat Interface */}
      <ChatInterface />

      {/* Global Modal */}
      <Modal />
    </div>
  );
}

export default App;
// Force HMR update
