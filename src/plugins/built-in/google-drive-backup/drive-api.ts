
export class DriveApi {
    private static BASE_URL = 'https://www.googleapis.com/drive/v3';
    private static UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

    static async validateToken(token: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.BASE_URL}/about?fields=user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    static async createFolder(name: string, token: string, parentId?: string): Promise<string | null> {
        const metadata: any = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
        };

        if (parentId) {
            metadata.parents = [parentId];
        }

        try {
            const response = await fetch(`${this.BASE_URL}/files`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metadata),
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.id;
        } catch (e) {
            console.error('Failed to create folder:', e);
            return null;
        }
    }

    static async findFile(name: string, token: string, parentId?: string): Promise<{ id: string, mimeType?: string } | null> {
        let query = `name = '${name}' and trashed = false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        try {
            const response = await fetch(`${this.BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, mimeType)`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.files?.[0] || null;
        } catch (e) {
            console.error('Failed to find file:', e);
            return null;
        }
    }

    static async uploadFile(name: string, content: Blob | string, token: string, parentId?: string, mimeType: string = 'application/octet-stream'): Promise<string | null> {
        // Simple multipart upload
        const metadata: any = {
            name,
            mimeType,
        };
        if (parentId) {
            metadata.parents = [parentId];
        }

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', content instanceof Blob ? content : new Blob([content], { type: mimeType }));

        try {
            const response = await fetch(`${this.UPLOAD_URL}?uploadType=multipart`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const err = await response.text();
                console.error('Upload failed:', err);
                return null;
            }
            const data = await response.json();
            return data.id;
        } catch (e) {
            console.error('Failed to upload file:', e);
            return null;
        }
    }

    static async updateFile(fileId: string, content: Blob | string, token: string, mimeType: string = 'application/octet-stream'): Promise<boolean> {
        try {
            const response = await fetch(`${this.UPLOAD_URL}/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': mimeType
                },
                body: content,
            });

            return response.ok;
        } catch (e) {
            console.error('Failed to update file:', e);
            return false;
        }
    }

    static async downloadFile(fileId: string, token: string): Promise<Blob | null> {
        try {
            const response = await fetch(`${this.BASE_URL}/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;
            return await response.blob();
        } catch (e) {
            return null;
        }
    }

    static async listFiles(token: string, parentId?: string): Promise<Array<{ id: string, name: string, mimeType: string, modifiedTime: string }>> {
        let query = "trashed = false";
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        try {
            const response = await fetch(`${this.BASE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, modifiedTime)&pageSize=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return [];
            const data = await response.json();
            return data.files || [];
        } catch (e) {
            return [];
        }
    }
}
