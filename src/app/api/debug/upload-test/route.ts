import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { BlobStorage } from '@/lib/blob-storage';
import { SimpleStorage } from '@/lib/simple-storage';

export async function GET() {
  try {
    // Try blob storage first, fallback to simple storage
    let storage;
    let useBlobStorage = false;
    
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        storage = BlobStorage.getInstance();
        useBlobStorage = true;
        console.log('[UPLOAD TEST] Using Vercel Blob storage');
      } else {
        throw new Error('No blob storage token available');
      }
    } catch (error) {
      console.log('[UPLOAD TEST] Blob storage not available, using simple storage:', error);
      storage = SimpleStorage.getInstance();
      await storage.loadRepositoryFiles();
      useBlobStorage = false;
    }
    
    console.log('[UPLOAD TEST] Checking storage system');
    
    // Get stored files
    const storedFiles = storage.getStoredFiles();
    const allFiles = await storage.getBestAvailableFiles();
    
    console.log('[UPLOAD TEST] Stored files:', storedFiles.length);
    console.log('[UPLOAD TEST] Available files:', allFiles.length);
    
    // Get detailed stats for stored files
    const storedFileStats = storedFiles.map(file => ({
      name: file.filename,
      size: (file as any).buffer?.length || 0,
      modified: file.uploadedAt,
      created: file.uploadedAt,
      type: file.detectedType
    }));
    
    // Get detailed stats for all available files
    const allFileStats = allFiles.map(file => ({
      name: file.filename,
      size: file.buffer.length,
      modified: 'N/A',
      created: 'N/A',
      type: file.detectedType
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        storage: {
          type: useBlobStorage ? 'Vercel Blob' : 'Simple Storage',
          storedFiles: storedFileStats,
          hasUploadedFiles: storage.hasUploadedFiles(),
          allFiles: allFileStats
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
