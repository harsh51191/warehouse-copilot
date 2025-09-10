import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

export interface StoredFile {
  filename: string;
  originalName: string;
  data: string; // base64 encoded
  size: number;
  modified: string;
  detectedType: string;
}

export class DataStorage {
  private static instance: DataStorage;
  private storedFiles: Map<string, StoredFile> = new Map();

  static getInstance(): DataStorage {
    if (!DataStorage.instance) {
      DataStorage.instance = new DataStorage();
    }
    return DataStorage.instance;
  }

  // Store uploaded files in memory (for this session)
  async storeFiles(files: Array<{ filename: string; originalName: string; buffer: Buffer; detectedType: string }>): Promise<void> {
    console.log('[STORAGE] Storing', files.length, 'files in memory');
    
    for (const file of files) {
      const storedFile: StoredFile = {
        filename: file.filename,
        originalName: file.originalName,
        data: file.buffer.toString('base64'),
        size: file.buffer.length,
        modified: new Date().toISOString(),
        detectedType: file.detectedType
      };
      
      this.storedFiles.set(file.filename, storedFile);
      console.log('[STORAGE] Stored file:', file.filename, 'size:', file.buffer.length);
    }
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
    if (storedFile) {
      return Buffer.from(storedFile.data, 'base64');
    }
    return null;
  }

  // Get all file data for artifact generation
  async getAllFileData(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    const result: Array<{ filename: string; buffer: Buffer; detectedType: string }> = [];
    
    for (const [filename, storedFile] of this.storedFiles) {
      result.push({
        filename,
        buffer: Buffer.from(storedFile.data, 'base64'),
        detectedType: storedFile.detectedType
      });
    }
    
    return result;
  }

  // Fallback to repository files if no uploaded files
  async getRepositoryFiles(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    const dataDir = join(process.cwd(), 'data');
    const files = await readdir(dataDir);
    const excelFiles = files.filter(f => f.endsWith('.xlsx'));
    
    console.log('[STORAGE] Using repository files:', excelFiles);
    
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
        console.warn('[STORAGE] Error reading repository file:', file, error);
      }
    }
    
    return result;
  }

  // Get the best available files (uploaded first, then repository)
  async getBestAvailableFiles(): Promise<Array<{ filename: string; buffer: Buffer; detectedType: string }>> {
    if (this.hasUploadedFiles()) {
      console.log('[STORAGE] Using uploaded files');
      return await this.getAllFileData();
    } else {
      console.log('[STORAGE] Using repository files');
      return await this.getRepositoryFiles();
    }
  }
}
