import { useState } from 'react';
import { Brain, Sparkles, FolderOpen, ArrowRight, Check } from 'lucide-react';
import { useVaultStore } from '../../stores';
import { selectVaultFolder, loadVault, loadNotesMetadata } from '../../lib';
import { useUIStore } from '../../stores';
import { cn } from '../../lib';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 0,
    title: 'Welcome to Synaptic',
    description: 'Your AI-powered knowledge base. Connect your thoughts and ideas.',
    icon: <Brain className="w-16 h-16" />,
  },
  {
    id: 1,
    title: 'Open Your First Vault',
    description: 'Select a folder containing your markdown notes to get started.',
    icon: <FolderOpen className="w-16 h-16" />,
  },
  {
    id: 2,
    title: 'Start Writing',
    description: 'Create your first note and start building your knowledge graph.',
    icon: <Sparkles className="w-16 h-16" />,
  },
  {
    id: 3,
    title: 'All Done!',
    description: 'You\'re ready to explore Synaptic\'s features.',
    icon: <Check className="w-16 h-16 text-green-500" />,
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const { setCurrentVault, setNoteMetadata, setLoading, setError, currentVault } = useVaultStore();
  const { setCurrentView } = useUIStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleOpenVault = async () => {
    try {
      setLoading(true);
      setError(null);

      const folderPath = await selectVaultFolder();
      if (!folderPath) {
        setLoading(false);
        return;
      }

      const vault = await loadVault(folderPath);
      const notes = await loadNotesMetadata(folderPath);

      setCurrentVault(vault);
      setNoteMetadata(notes);
      setIsCompleted(true);
      setCurrentView('editor');
    } catch (error) {
      console.error('Failed to open vault:', error);
      setError(error instanceof Error ? error.message : 'Failed to open vault');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  if (currentVault) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background/30 to-background-secondary/50 backdrop-blur-md">
      <div className="relative w-full max-w-4xl mx-auto p-8">
        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mb-12">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'w-3 h-3 rounded-full transition-all duration-300',
                index < currentStep ? 'bg-accent' : 'bg-border',
                index === currentStep ? 'ring-4 ring-accent/30 ring-offset-4' : '',
                index < currentStep ? 'animate-pulse' : ''
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in duration-500">
          {steps[currentStep].id === 0 && (
            <div className="text-center">
              <div className="mb-8 animate-bounce">
                {steps[0].icon}
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                {steps[0].title}
              </h1>
              <p className="text-xl text-foreground-muted/80 max-w-lg mx-auto leading-relaxed">
                {steps[0].description}
              </p>
              <button
                onClick={handleNext}
                className="mt-8 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-accent/25 hover:scale-105"
              >
                Get Started
              </button>
            </div>
          )}

          {steps[currentStep].id === 1 && (
            <div className="text-center">
              <div className="mb-8 animate-fade-in">
                {steps[1].icon}
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {steps[1].title}
              </h1>
              <p className="text-xl text-foreground-muted/80 max-w-lg mx-auto mb-8">
                {steps[1].description}
              </p>
              <button
                onClick={handleOpenVault}
                disabled={false}
                className="mt-8 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-accent/25 hover:scale-105 flex items-center gap-2 mx-auto"
              >
                <FolderOpen className="w-5 h-5" />
                Select Folder
              </button>
            </div>
          )}

          {steps[currentStep].id === 2 && (
            <div className="text-center">
              <div className="mb-8 animate-fade-in">
                {steps[2].icon}
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {steps[2].title}
              </h1>
              <p className="text-xl text-foreground-muted/80 max-w-lg mx-auto mb-8">
                {steps[2].description}
              </p>
              <button
                onClick={handleNext}
                className="mt-8 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-accent/25 hover:scale-105"
              >
                Create Note
              </button>
            </div>
          )}

          {steps[currentStep].id === 3 && (
            <div className="text-center">
              <div className="mb-8 animate-scale-in">
                {steps[3].icon}
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {steps[3].title}
              </h1>
              <p className="text-xl text-foreground-muted/80 max-w-lg mx-auto mb-8">
                {steps[3].description}
              </p>
              <button
                onClick={handleComplete}
                className="mt-8 px-8 py-3 bg-gradient-to-r from-accent to-purple-500 hover:to-purple-600 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-xl hover:shadow-accent/25 hover:scale-105 flex items-center gap-2 mx-auto"
              >
                Go to Notes
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-12">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-2 text-foreground-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-background-tertiary rounded-lg"
            >
              Back
            </button>
            <div className="flex gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentStep ? 'bg-accent' : 'bg-border',
                  )}
                />
              ))}
            </div>
            <div className="w-16" />
            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1 || isCompleted}
              className={cn(
                'px-6 py-2 text-foreground-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-background-tertiary rounded-lg',
                currentStep === steps.length - 1 && 'opacity-50'
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
