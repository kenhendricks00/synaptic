import { create } from 'zustand';

export interface ModalConfig {
    type: 'prompt' | 'confirm' | 'alert';
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value?: string) => void;
    onCancel?: () => void;
}

interface ModalStore {
    isOpen: boolean;
    config: ModalConfig | null;

    // Actions
    openModal: (config: ModalConfig) => void;
    closeModal: () => void;

    // Convenience methods
    prompt: (title: string, options?: Partial<ModalConfig>) => Promise<string | null>;
    confirm: (title: string, message?: string) => Promise<boolean>;
    alert: (title: string, message?: string) => Promise<void>;
}

export const useModalStore = create<ModalStore>((set, get) => ({
    isOpen: false,
    config: null,

    openModal: (config) => set({ isOpen: true, config }),

    closeModal: () => set({ isOpen: false, config: null }),

    prompt: (title, options = {}) => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: {
                    type: 'prompt',
                    title,
                    placeholder: options.placeholder || '',
                    defaultValue: options.defaultValue || '',
                    confirmText: options.confirmText || 'OK',
                    cancelText: options.cancelText || 'Cancel',
                    onConfirm: (value) => {
                        get().closeModal();
                        resolve(value || null);
                    },
                    onCancel: () => {
                        get().closeModal();
                        resolve(null);
                    },
                    ...options,
                }
            });
        });
    },

    confirm: (title, message) => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: {
                    type: 'confirm',
                    title,
                    message,
                    confirmText: 'Confirm',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        get().closeModal();
                        resolve(true);
                    },
                    onCancel: () => {
                        get().closeModal();
                        resolve(false);
                    },
                }
            });
        });
    },

    alert: (title, message) => {
        return new Promise((resolve) => {
            set({
                isOpen: true,
                config: {
                    type: 'alert',
                    title,
                    message,
                    confirmText: 'OK',
                    onConfirm: () => {
                        get().closeModal();
                        resolve();
                    },
                }
            });
        });
    },
}));
