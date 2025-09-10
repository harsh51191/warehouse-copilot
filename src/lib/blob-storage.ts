import { put, del, list, head } from '@vercel/blob';

export interface StoredFile {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  detectedType: string;
}

export class BlobStorage {
  private static instance: BlobStorage;
  private storedFiles: Map<string, StoredFile> = new Map();

  static getInstance(): BlobStorage {
    if (!BlobStorage.instance) {
      BlobStorage.instance = new BlobStorage();
    }
    return BlobStorage.instance;
  }

  // Store uploaded files in Vercel Blob
  async storeFiles(files: Array<{ filename: string; originalName: string; buffer: Buffer; detectedType: string }>): Promise<StoredFile[]> {
    console.log('[BLOB STORAGE] Storing', files.length, 'files to Vercel Blob');
    
    const storedFiles: StoredFile[] = [];
    
    for (const file of files) {
      try {
        // Upload to Vercel Blob
        const blob = await put(`${file.detectedType}/${file.filename}`, file.buffer, {
          access: 'public',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const storedFile: StoredFile = {
          url: blob.url,
          filename: file.filename,
          originalName: file.originalName,
          size: file.buffer.length,
          uploadedAt: new Date().toISOString(),
          detectedType: file.detectedType
        };
        
        this.storedFiles.set(file.filename, storedFile);
        storedFiles.push(storedFile);
        
        console.log('[BLOB STORAGE] Stored file:', {
          filename: file.filename,
          url: blob.url,
          size: file.buffer.length
        });
      } catch (error) {
        console.error('[BLOB STORAGE] Error storing file:', file.filename, error);
        throw error;
      }
    }
    
    return storedFiles;
  }

  // Get all stored files
  getStoredFiles(): StoredFile[] {
    return Array.from(this.storedFiles.values());
  }

  // Check if we have uploaded files
  hasUploadedFiles(): boolean {
    return this.storedFiles.size > 0;
  }

  // Get file data for artifact generation
  async getFileData(filename: string): Promise<Buffer | null> {
    const storedFile = this.storedFiles.get(filename);
    if (!storedFile) {
      return null;
    }
    
    try {
      const response = await fetch(storedFile.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('[BLOB STORAGE] Error fetching file:', filename, error);
      return null;
    }
  }

  // Get all file data for artifact generation
  async getAllFileData(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    const result: Array<{ filename: string; buffer: Buffer; detectedType: string }> = [];
    
    for (const [filename, storedFile] of this.storedFiles) {
      try {
        const buffer = await this.getFileData(filename);
        if (buffer) {
          result.push({
            filename,
            buffer,
            detectedType: storedFile.detectedType
          });
        }
      } catch (error) {
        console.error('[BLOB STORAGE] Error getting file data:', filename, error);
      }
    }
    
    return result;
  }

  // Fallback to repository files if no uploaded files
  async getRepositoryFiles(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    const { readFile, readdir } = await import('fs/promises');
    const { join } = await import('path');
    
    const dataDir = join(process.cwd(), 'data');
    const files = await readdir(dataDir);
    const excelFiles = files.filter(f => f.endsWith('.xlsx'));
    
    console.log('[BLOB STORAGE] Using repository files:', excelFiles);
    
    const result: Array<{ filename: string; buffer: Buffer; detectedType: string }> = [];
    
    for (const file of excelFiles) {
      try {
        const filePath = join(dataDir, file);
        const buffer = await readFile(filePath);
        
        // Try to detect file type from filename
        let detectedType = 'unknown';
        if (file.includes('sbl_productivity')) detectedType = 'sbl_productivity';
        else if (file.includes('sbl_infeed_rate')) detectedType = 'sbl_infeed_rate';
        else if (file.includes('sbl_table_lines')) detectedType = 'sbl_table_lines';
        else if (file.includes('ptl_productivity')) detectedType = 'ptl_productivity';
        else if (file.includes('ptl_table_lines')) detectedType = 'ptl_table_lines';
        else if (file.includes('line_completion')) detectedType = 'line_completion_2';
        else if (file.includes('secondary_sortation')) detectedType = 'secondary_sortation';
        else if (file.includes('updated_loading')) detectedType = 'updated_loading_dashboard_query';
        else if (file.includes('wave_macros')) detectedType = 'wave_macros';
        else if (file.includes('partial_hus')) detectedType = 'partial_hus_pending_based_on_gtp_demand';
        
        result.push({
          filename: file,
          buffer,
          detectedType
        });
      } catch (error) {
        console.warn('[BLOB STORAGE] Error reading repository file:', file, error);
      }
    }
    
    return result;
  }

  // Get the best available files (uploaded first, then repository)
  async getBestAvailableFiles(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    if (this.hasUploadedFiles()) {
      console.log('[BLOB STORAGE] Using uploaded files from Vercel Blob');
      return await this.getAllFileData();
    } else {
      console.log('[BLOB STORAGE] Using repository files');
      return await this.getRepositoryFiles();
    }
  }

  // Clear all stored files (for testing)
  async clearAllFiles(): Promise<void> {
    console.log('[BLOB STORAGE] Clearing all stored files');
    
    for (const [filename, storedFile] of this.storedFiles) {
      try {
        await del(storedFile.url);
        console.log('[BLOB STORAGE] Deleted file:', filename);
      } catch (error) {
        console.error('[BLOB STORAGE] Error deleting file:', filename, error);
      }
    }
    
    this.storedFiles.clear();
  }
}
