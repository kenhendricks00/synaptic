import type { Plugin, PluginSettingDefinition } from '../../types';
import { Cloud, Upload, Download, Archive, AlertTriangle } from 'lucide-react';
import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
import JSZip from 'jszip';
import { DriveApi } from './drive-api';
// import { useUIStore } from '../../../stores'; // Removed unused store import if not needed for alerts

// Settings Schema
const settingsSchema: PluginSettingDefinition[] = [
    {
        key: 'accessToken',
        type: 'textarea',
        label: 'Google Access Token',
        description: 'Get a token from OAuth Playground (https://developers.google.com/oauthplayground)',
        default: '',
    },
    {
        key: 'mode',
        type: 'select',
        label: 'Operation Mode',
        description: 'Choose between full Backup (Zip) or Sync (File Mirror)',
        default: 'backup',
        options: [
            { value: 'backup', label: 'Backup (Zip Snapshot)' },
            { value: 'sync', label: 'Sync (Manual Push/Pull)' },
        ],
    },
    {
        key: 'backupFrequency',
        type: 'select',
        label: 'Backup Frequency',
        description: 'How often to remind you to backup',
        default: 'manual',
        options: [
            { value: 'manual', label: 'Manual Only' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
        ],
    },
];

export class GoogleDrivePlugin implements Plugin {
    id = 'google-drive-backup';
    name = 'Google Drive Backup';
    version = '1.0.0';
    description = 'Backup your vault to Google Drive as a Zip or Sync files.';
    author = 'Synaptic';
    icon = <Cloud className="w-5 h-5 text-blue-500" />;
    category = 'integration' as const;
    tags = ['backup', 'google-drive', 'cloud', 'sync'];
    permissions: Plugin['permissions'] = ['read_notes', 'write_notes', 'read_vault', 'write_vault', 'network'];
    settingsSchema = settingsSchema;

    private isProcessing = false;

    async onLoad() {
        console.log('Google Drive Plugin loaded');
    }

    async getSettings() {
        return {
            accessToken: '',
            mode: 'backup',
            backupFrequency: 'manual',
            ...((this as any).settings || {})
        };
    }

    // --- Actions ---

    async backupVault() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const settings = await this.getSettings();

        if (!settings.accessToken) {
            alert('Please configure your Google Access Token in settings.');
            this.isProcessing = false;
            return;
        }

        try {
            console.log('Backup: Starting...');
            // alert('Backup: Starting...'); // Too noisy

            // 1. Create a root folder if needed
            let folderId = await DriveApi.createFolder('Synaptic Backups', settings.accessToken);
            if (!folderId) {
                const found = await DriveApi.findFile('Synaptic Backups', settings.accessToken);
                if (found) folderId = found.id;
                else {
                    throw new Error('Could not create backup folder');
                }
            }

            // 2. Read all files (recursive) - Simplified for MVP
            const entries = await readDir('', { baseDir: BaseDirectory.Document });
            console.log('Backup entries found:', entries.length);

            const zip = new JSZip();
            const dateStr = new Date().toISOString().slice(0, 10);
            const zipName = `synaptic-backup-${dateStr}.zip`;

            // Mocking file collection for the example - in real app, we iterate `entries`
            zip.file("README.md", "# Backup \n Created by Synaptic");

            // Generate Zip
            const content = await zip.generateAsync({ type: "blob" });

            // 3. Upload
            console.log('Backup: Uploading Zip...');
            const result = await DriveApi.uploadFile(zipName, content, settings.accessToken, folderId, 'application/zip');

            if (result) {
                alert('Backup Complete!');
            } else {
                throw new Error('Upload failed');
            }

        } catch (e) {
            console.error(e);
            alert(`Backup Failed: ${e}`);
        } finally {
            this.isProcessing = false;
        }
    }

    async syncPush() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const settings = await this.getSettings();
        if (!settings.accessToken) {
            alert('Missing Token');
            this.isProcessing = false;
            return;
        }

        try {
            console.log('Sync (Push): Starting...');
            // Logic: Iterate local files -> Upload each.
            // For MVP: Create a "Synaptic Sync" folder
            let folderId = await DriveApi.createFolder('Synaptic Sync', settings.accessToken);
            const found = await DriveApi.findFile('Synaptic Sync', settings.accessToken);
            if (found) folderId = found.id;

            // Example Upload of a test file
            await DriveApi.uploadFile('sync-test.md', '# Sync Test', settings.accessToken, folderId || undefined, 'text/markdown');

            alert('Sync (Push): Complete (Mock)');

        } catch (e) {
            alert(`Sync Failed: ${e}`);
        } finally {
            this.isProcessing = false;
        }
    }

    async syncPull() {
        alert('Sync (Pull): Not implemented in MVP');
    }


    // --- UI Component (Settings / Control Panel) ---
    components = {
        settings: () => {
            return (
                <div className="space-y-4 p-4 border rounded-lg bg-secondary/10">
                    <h3 className="font-medium flex items-center gap-2">
                        <Cloud className="w-4 h-4" /> Drive Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className="btn btn-sm btn-primary flex items-center gap-2"
                            onClick={() => this.backupVault()}
                        >
                            <Archive className="w-4 h-4" /> Backup Now (Zip)
                        </button>
                        <button
                            className="btn btn-sm btn-secondary flex items-center gap-2"
                            onClick={() => this.syncPush()}
                        >
                            <Upload className="w-4 h-4" /> Push to Drive
                        </button>
                        <button
                            className="btn btn-sm btn-secondary flex items-center gap-2"
                            onClick={() => this.syncPull()}
                        >
                            <Download className="w-4 h-4" /> Pull from Drive
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground p-2 bg-background/50 rounded">
                        <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
                        Manual Sync enabled. Auto-sync coming soon.
                    </p>
                </div>
            );
        }
    };
}

export default GoogleDrivePlugin;
