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
  FlashcardStudy
} from './components';
import { FileText, Clock, Save } from 'lucide-react';
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
    error,
    autoLoadFolder
  } = useVaultStore();

  const { currentView, hasUnsavedChanges, wordCount, typingSpeed, pomodoroStatus } = useUIStore();
  const { installed } = usePluginStore();
  const { settings, updateSettings } = useSettingsStore();

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
  };

  // Show onboarding if not explicitly completed (handles undefined for existing users)
  const shouldShowOnboarding = settings.onboardingCompleted !== true;

  // Auto-load vault or default folder on launch
  useEffect(() => {
    const autoLoad = async () => {
      // Use autoLoadFolder if set, otherwise fallback to the persisted currentVault path
      const pathToLoad = autoLoadFolder || currentVault?.path;

      // Stop if no path, or if currently loading
      if (!pathToLoad || isLoading) return;

      // Only sync if metadata is empty (initial launch or vault switch)
      if (noteMetadata.length === 0) {
        try {
          console.log('[App] Auto-syncing vault contents:', pathToLoad);
          const vault = await loadVault(pathToLoad);
          const metadata = await loadNotesMetadata(pathToLoad);

          setCurrentVault(vault);
          setNoteMetadata(metadata);
        } catch (error) {
          console.error('[App] Auto-sync failed:', error);
        }
      }
    };

    autoLoad();
  }, [autoLoadFolder, currentVault?.path, noteMetadata.length, isLoading, setCurrentVault, setNoteMetadata]);

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

  // Show welcome screen if no vault is open
  if (!currentVault && !isLoading) {
    return <WelcomeScreen />;
  }

  // Loading state
  if (isLoading && noteMetadata.length === 0) {
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
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-error mb-2">Error loading vault</p>
          <p className="text-foreground-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused (except for navigation commands which usually supersede text entry?)
      // Actually sidebar Nav items work globally usually, but let's be safe.
      // If user typing in editor, usually Ctrl+1 still switches tab.
      // So we generally allow it unless strictly colliding.

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (!isCmdOrCtrl) return;

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
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {shouldShowOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-secondary/50">
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground-secondary py-1 px-2.5 bg-background-tertiary rounded-md font-medium">
              {currentView === 'editor' && 'Notes'}
              {currentView === 'daily' && 'Daily Notes'}
              {currentView === 'graph' && 'Knowledge Graph'}
              {currentView === 'search' && 'Search Results'}
              {currentView === 'settings' && 'App Settings'}
              {currentView === 'plugins' && 'Plugin Manager'}
              {currentView === 'marketplace' && 'Plugin Marketplace'}
              {currentView === 'study' && 'Flashcard Study'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-foreground-muted">
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
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(new Date())}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'editor' && <NoteEditor />}
          {currentView === 'daily' && <DailyNotes />}
          {currentView === 'search' && <SearchView />}
          {currentView === 'graph' && <GraphView />}
          {currentView === 'marketplace' && <Marketplace />}
          {currentView === 'plugins' && <PluginManager />}
          {currentView === 'tasks' && <TaskView />}
          {currentView === 'study' && <FlashcardStudy />}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>

      {/* Search Modal */}
      <SearchModal />

      {/* Create Note Modal (Global Singleton) */}
      <CreateNoteModal isOpen={useUIStore((state) => state.createNoteModalOpen)} onClose={() => useUIStore.getState().setCreateNoteModalOpen(false)} />

      {/* AI Chat Interface */}
      <ChatInterface />
    </div>
  );
}

export default App;
// Force HMR update
