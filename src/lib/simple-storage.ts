// Simple in-memory storage for Vercel (fallback when blob storage is not available)
export interface StoredFile {
  filename: string;
  originalName: string;
  buffer: Buffer;
  detectedType: string;
  uploadedAt: string;
}

export class SimpleStorage {
  private static instance: SimpleStorage;
  private storedFiles: Map<string, StoredFile> = new Map();
  private repoFiles: StoredFile[] = [];

  static getInstance(): SimpleStorage {
    if (!SimpleStorage.instance) {
      SimpleStorage.instance = new SimpleStorage();
    }
    return SimpleStorage.instance;
  }

  // Load repository files on initialization
  async loadRepositoryFiles(): Promise<void> {
    try {
      const { readFile, readdir } = await import('fs/promises');
      const { join } = await import('path');
      
      const dataDir = join(process.cwd(), 'data');
      const files = await readdir(dataDir);
      const excelFiles = files.filter(f => f.endsWith('.xlsx'));
      
      console.log('[SIMPLE_STORAGE] Loading repository files:', excelFiles);
      
      for (const file of excelFiles) {
        try {
          const filePath = join(dataDir, file);
          const buffer = await readFile(filePath);
          
          // Detect file type from filename
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
          
          this.repoFiles.push({
            filename: file,
            originalName: file,
            buffer,
            detectedType,
            uploadedAt: new Date().toISOString()
          });
        } catch (error) {
          console.warn('[SIMPLE_STORAGE] Error loading repository file:', file, error);
        }
      }
    } catch (error) {
      console.error('[SIMPLE_STORAGE] Error loading repository files:', error);
    }
  }

  // Store uploaded files in memory
  async storeFiles(files: Array<{ filename: string; originalName: string; buffer: Buffer; detectedType: string }>): Promise<StoredFile[]> {
    console.log('[SIMPLE_STORAGE] Storing', files.length, 'files in memory');
    
    // Clear existing uploaded files
    this.storedFiles.clear();
    
    const storedFiles: StoredFile[] = [];
    
    for (const file of files) {
      const storedFile: StoredFile = {
        filename: file.filename,
        originalName: file.originalName,
        buffer: file.buffer,
        detectedType: file.detectedType,
        uploadedAt: new Date().toISOString()
      };
      
      this.storedFiles.set(file.filename, storedFile);
      storedFiles.push(storedFile);
      
      console.log('[SIMPLE_STORAGE] Stored file:', {
        filename: file.filename,
        size: file.buffer.length,
        detectedType: file.detectedType
      });
    }
    
    return storedFiles;
  }

  // Get all stored files (uploaded first, then repository)
  async getBestAvailableFiles(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    if (this.storedFiles.size > 0) {
      console.log('[SIMPLE_STORAGE] Using uploaded files from memory');
      return Array.from(this.storedFiles.values()).map(file => ({
        filename: file.filename,
        buffer: file.buffer,
        detectedType: file.detectedType
      }));
    } else {
      console.log('[SIMPLE_STORAGE] Using repository files');
      return this.repoFiles.map(file => ({
        filename: file.filename,
        buffer: file.buffer,
        detectedType: file.detectedType
      }));
    }
  }

  // Check if we have uploaded files
  hasUploadedFiles(): boolean {
    return this.storedFiles.size > 0;
  }

  // Get stored files info
  getStoredFiles(): StoredFile[] {
    return Array.from(this.storedFiles.values());
  }

  // Clear all stored files
  async clearAllFiles(): Promise<void> {
    console.log('[SIMPLE_STORAGE] Clearing all stored files');
    this.storedFiles.clear();
  }
}
