import { useUIStore } from '../../../stores';
import type { Plugin } from '../../types';

export class PomodoroPlugin implements Plugin {
    id = 'pomodoro-timer';
    name = 'Pomodoro Timer';
    version = '1.0.1';
    description = 'Productivity timer with customizable work/break intervals.';
    author = 'Community';
    category = 'productivity' as const;
    tags = ['timer', 'focus', 'productivity'];
    permissions: Plugin['permissions'] = ['ui'];

    settingsSchema = [
        {
            key: 'workDuration',
            type: 'number' as const,
            label: 'Work Duration (minutes)',
            description: 'Length of each focus session',
            default: 25,
            min: 1,
            max: 120
        },
        {
            key: 'breakDuration',
            type: 'number' as const,
            label: 'Break Duration (minutes)',
            description: 'Length of each break',
            default: 5,
            min: 1,
            max: 30
        },
        {
            key: 'autoStartBreak',
            type: 'toggle' as const,
            label: 'Auto-start Break',
            description: 'Automatically start break after work session',
            default: true
        }
    ];

    private intervalId: ReturnType<typeof setInterval> | null = null;
    private timeLeft = 25 * 60; // 25 minutes in seconds
    private isRunning = false;
    private isBreak = false;

    async onLoad() {
        console.log('Pomodoro Timer plugin loaded');
    }

    async onUnload() {
        this.stopTimer();
        useUIStore.getState().setPomodoroStatus(null);
        console.log('Pomodoro Timer plugin unloaded');
    }

    async onDisable() {
        this.stopTimer();
        useUIStore.getState().setPomodoroStatus(null);
    }

    private updateStatus() {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        const status = this.isRunning
            ? (this.isBreak ? `☕ Break: ${timeStr}` : `🍅 Focus: ${timeStr}`)
            : null;

        useUIStore.getState().setPomodoroStatus(status);
    }

    private startTimer(durationMins: number, isBreak: boolean) {
        if (this.intervalId) clearInterval(this.intervalId);

        this.isRunning = true;
        this.isBreak = isBreak;
        this.timeLeft = durationMins * 60;
        this.updateStatus();

        this.intervalId = setInterval(() => {
            this.timeLeft--;

            if (this.timeLeft <= 0) {
                this.handleTimerComplete();
            } else {
                this.updateStatus();
            }
        }, 1000);
    }

    private handleTimerComplete() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;

        if (this.isBreak) {
            useUIStore.getState().setPomodoroStatus('☕ Break complete!');
            // Play a subtle sound or notification if we had an API for it
            // For now, just show status
        } else {
            useUIStore.getState().setPomodoroStatus('🍅 Pomodoro complete!');
            // Auto-start break? (In a real app, maybe wait for user click or follow settings)
            // For now, let's keep it simple or follow the original logic
            this.startTimer(5, true); // 5 min break
        }
    }

    private stopTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.updateStatus();
    }

    commands = [
        {
            id: 'pomodoro:start',
            name: 'Pomodoro: Start Timer',
            description: 'Start a focus session',
            handler: () => {
                this.startTimer(25, false);
            }
        },
        {
            id: 'pomodoro:stop',
            name: 'Pomodoro: Stop Timer',
            description: 'Stop the current timer',
            handler: () => {
                this.stopTimer();
                useUIStore.getState().setPomodoroStatus('⏸️ Timer stopped');
                setTimeout(() => {
                    if (!this.isRunning) useUIStore.getState().setPomodoroStatus(null);
                }, 3000);
            }
        },
        {
            id: 'pomodoro:status',
            name: 'Pomodoro: Check Status',
            description: 'Check remaining time',
            handler: () => {
                this.updateStatus();
            }
        }
    ];
}

export default PomodoroPlugin;
