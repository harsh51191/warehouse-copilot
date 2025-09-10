import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BlobStorage } from '@/lib/blob-storage';

export async function GET() {
  try {
    const blobStorage = BlobStorage.getInstance();
    
    console.log('[UPLOAD TEST] Checking blob storage');
    
    // Get stored files from blob storage
    const storedFiles = blobStorage.getStoredFiles();
    const repositoryFiles = await blobStorage.getRepositoryFiles();
    
    console.log('[UPLOAD TEST] Stored files in blob:', storedFiles.length);
    console.log('[UPLOAD TEST] Repository files:', repositoryFiles.length);
    
    // Get detailed stats for stored files
    const storedFileStats = storedFiles.map(file => ({
      name: file.filename,
      size: file.size,
      modified: file.uploadedAt,
      created: file.uploadedAt,
      url: file.url,
      type: file.detectedType
    }));
    
    // Get detailed stats for repository files
    const repositoryFileStats = repositoryFiles.map(file => ({
      name: file.filename,
      size: file.buffer.length,
      modified: 'N/A',
      created: 'N/A',
      type: file.detectedType
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        blobStorage: {
          storedFiles: storedFileStats,
          hasUploadedFiles: blobStorage.hasUploadedFiles()
        },
        repository: {
          files: repositoryFileStats
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[UPLOAD TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
