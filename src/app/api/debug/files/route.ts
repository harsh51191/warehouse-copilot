import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const dataDir = process.env.VERCEL === '1' ? '/tmp/data' : join(process.cwd(), 'data');
    const derivedDir = process.env.VERCEL === '1' ? '/tmp/data/derived' : join(process.cwd(), 'data', 'derived');
    
    console.log('[DEBUG] Checking data directories...');
    console.log('[DEBUG] Data dir:', dataDir);
    console.log('[DEBUG] Derived dir:', derivedDir);
    
    // Check Excel files in data directory
    let excelFiles: string[] = [];
    let derivedFiles: string[] = [];
    
    try {
      const dataFiles = await readdir(dataDir);
      excelFiles = dataFiles.filter(f => f.endsWith('.xlsx'));
      
      // Get file stats
      const fileStats = await Promise.all(
        excelFiles.map(async (file) => {
          const filePath = join(dataDir, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        })
      );
      
      console.log('[DEBUG] Excel files found:', fileStats);
    } catch (error) {
      console.log('[DEBUG] Error reading data directory:', error);
    }
    
    // Check derived files
    try {
      const derivedFilesList = await readdir(derivedDir);
      derivedFiles = derivedFilesList.filter(f => f.endsWith('.json'));
      
      // Get file stats for derived files
      const derivedStats = await Promise.all(
        derivedFiles.map(async (file) => {
          const filePath = join(derivedDir, file);
          const stats = await stat(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        })
      );
      
      console.log('[DEBUG] Derived files found:', derivedStats);
    } catch (error) {
      console.log('[DEBUG] Error reading derived directory:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        dataDir,
        derivedDir,
        excelFiles: excelFiles,
        derivedFiles: derivedFiles,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error checking files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
