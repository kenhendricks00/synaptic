import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Trash2, Edit3, ExternalLink, Copy, Plus, FolderPlus } from 'lucide-react';
import { useVaultStore, useUIStore } from '../../stores';
import { cn } from '../../lib';
import { deleteNote, renameNote, createNote } from '../../lib/tauri';
import { mkdir } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { ContextMenu } from '../ui/ContextMenu';
import type { NoteMetadata } from '../../types';

interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: TreeNode[];
    note?: NoteMetadata;
}

function buildTree(notes: NoteMetadata[], vaultPath: string): TreeNode[] {
    const root: TreeNode[] = [];
    // Aggressive normalization for Windows path matching (handle UNC and slashes)
    const normalize = (p: string) => p.replace(/^\\\\\?\\/, '').toLowerCase().replace(/\\/g, '/');
    const normVault = normalize(vaultPath);

    for (const note of notes) {
        // Normalize note path same as vault path
        const normNotePath = normalize(note.path);

        // Get relative path from vault
        let relativePath = normNotePath.replace(normVault, '').replace(/^[/\\]/, '');
        const parts = relativePath.split(/[/\\]/);

        let current = root;
        let currentPath = vaultPath;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = `${currentPath}/${part}`;
            const isLast = i === parts.length - 1;

            let node = current.find((n) => n.name === part);
            if (!node) {
                node = {
                    name: part,
                    path: currentPath,
                    isFolder: !isLast,
                    children: [],
                    note: isLast ? note : undefined,
                };
                current.push(node);
            }

            if (!isLast) {
                current = node.children;
            }
        }
    }
    // Sort logic follows...


    // Sort: folders first, then alphabetically
    function sortTree(nodes: TreeNode[]): TreeNode[] {
        return nodes.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        }).map((node) => ({
            ...node,
            children: sortTree(node.children),
        }));
    }

    return sortTree(root);
}

interface TreeItemProps {
    node: TreeNode;
    depth: number;
    expandedFolders: Set<string>;
    toggleFolder: (path: string) => void;
    activeNoteId: string | null;
    onNoteClick: (note: NoteMetadata) => void;
    onRefresh: () => void;
}

function TreeItem({
    node,
    depth,
    expandedFolders,
    toggleFolder,
    activeNoteId,
    onNoteClick,
    onRefresh
}: TreeItemProps) {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.note?.id === activeNoteId;
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.isFolder ? node.name : node.name.replace(/\.md$/, ''));
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleRename = async () => {
        if (!newName.trim() || newName === (node.isFolder ? node.name : node.name.replace(/\.md$/, ''))) {
            setIsRenaming(false);
            return;
        }

        try {
            const newPath = await renameNote(node.path, newName);
            setIsRenaming(false);

            // If the renamed note was active, update its ID in the store
            const { setActiveNote, activeNoteId } = useVaultStore.getState();
            if (activeNoteId === node.path) {
                setActiveNote(newPath.replace(/\\/g, '/'));
            }

            onRefresh();
        } catch (err) {
            console.error('Rename failed', err);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${node.name}"?`)) return;
        try {
            await deleteNote(node.path);
            onRefresh();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleReveal = async () => {
        try {
            await revealItemInDir(node.path);
        } catch (err) {
            console.error('Reveal failed', err);
        }
    };

    const handleCopyPath = () => {
        navigator.clipboard.writeText(node.path);
    };

    const handleNewNote = async () => {
        try {
            const vault = useVaultStore.getState().currentVault;
            if (!vault) return;
            const note = await createNote(node.path, 'Untitled');
            const { setActiveNote } = useVaultStore.getState();
            setActiveNote(note.id);
            onRefresh();
        } catch (err) {
            console.error('Failed to create note', err);
        }
    };

    const handleNewFolder = async () => {
        try {
            const folderPath = `${node.path}/New Folder`;
            await mkdir(folderPath, { recursive: true });
            onRefresh();
            // Optional: expand the folder after creating
            if (!isExpanded) toggleFolder(node.path);
        } catch (err) {
            console.error('Failed to create folder', err);
        }
    };

    const menuItems = [
        ...(node.isFolder ? [
            { label: 'New Note', icon: Plus, onClick: handleNewNote },
            { label: 'New Folder', icon: FolderPlus, onClick: handleNewFolder },
        ] : []),
        { label: 'Rename', icon: Edit3, onClick: () => setIsRenaming(true) },
        { label: 'Copy Path', icon: Copy, onClick: handleCopyPath },
        { label: 'Reveal in Explorer', icon: ExternalLink, onClick: handleReveal },
        { label: 'Delete', icon: Trash2, onClick: handleDelete, variant: 'danger' as const },
    ];

    if (isRenaming) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                <span className="w-3.5" />
                {!node.isFolder && <FileText className="w-4 h-4 text-accent" />}
                {node.isFolder && <Folder className="w-4 h-4 text-accent" />}
                <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    className="flex-1 bg-background-tertiary border border-accent/30 rounded px-1.5 py-0.5 text-sm outline-none focus:border-accent"
                />
            </div>
        );
    }

    if (node.isFolder) {
        return (
            <div>
                <button
                    onClick={() => toggleFolder(node.path)}
                    onContextMenu={handleContextMenu}
                    className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors group relative',
                        'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                    )}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    {isExpanded ? (
                        <FolderOpen className="w-4 h-4 flex-shrink-0 text-foreground-muted" />
                    ) : (
                        <Folder className="w-4 h-4 flex-shrink-0 text-foreground-muted" />
                    )}
                    <span className="truncate">{node.name}</span>
                </button>
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        items={menuItems}
                    />
                )}
                {isExpanded && node.children.length > 0 && (
                    <div>
                        {node.children.map((child) => (
                            <TreeItem
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                expandedFolders={expandedFolders}
                                toggleFolder={toggleFolder}
                                activeNoteId={activeNoteId}
                                onNoteClick={onNoteClick}
                                onRefresh={onRefresh}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // File node
    const displayName = node.name.replace(/\.md$/, '');

    return (
        <>
            <button
                onClick={() => node.note && onNoteClick(node.note)}
                onContextMenu={handleContextMenu}
                className={cn(
                    'w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors group relative',
                    isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <span className="w-3.5" /> {/* Spacer for alignment */}
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{displayName}</span>
            </button>
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    items={menuItems}
                />
            )}
        </>
    );
}

export function NoteTree() {
    const { currentVault, noteMetadata, activeNoteId, setActiveNote, setNoteMetadata } = useVaultStore();
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const tree = useMemo(() => {
        if (!currentVault) return [];
        return buildTree(noteMetadata, currentVault.path);
    }, [noteMetadata, currentVault]);

    const handleRefresh = async () => {
        if (!currentVault) return;
        const { loadNotesMetadata } = await import('../../lib/tauri');
        const metadata = await loadNotesMetadata(currentVault.path);
        setNoteMetadata(metadata);
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleNoteClick = (note: NoteMetadata) => {
        setActiveNote(note.id);
        useUIStore.getState().setCurrentView('editor');
    };

    if (!currentVault) {
        return (
            <div className="px-3 py-4 text-sm text-foreground-muted text-center">
                No vault open
            </div>
        );
    }

    if (noteMetadata.length === 0) {
        return (
            <div className="px-3 py-4 text-sm text-foreground-muted text-center">
                No notes found
            </div>
        );
    }

    return (
        <div className="py-1">
            {tree.map((node) => (
                <TreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    activeNoteId={activeNoteId}
                    onNoteClick={handleNoteClick}
                    onRefresh={handleRefresh}
                />
            ))}
        </div>
    );
}
