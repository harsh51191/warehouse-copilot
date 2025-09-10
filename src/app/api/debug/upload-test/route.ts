import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    console.log('[UPLOAD TEST] Checking repository files');
    
    // Check repository data directory
    const dataDir = join(process.cwd(), 'data');
    const files = await readdir(dataDir);
    const excelFiles = files.filter(f => f.endsWith('.xlsx'));
    
    console.log('[UPLOAD TEST] Found files:', excelFiles.length);
    
    // Get file stats
    const fileStats = await Promise.all(
      excelFiles.map(async (file) => {
        const filePath = join(dataDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
          type: file.includes('sbl_productivity') ? 'sbl_productivity' :
                file.includes('ptl_productivity') ? 'ptl_productivity' :
                file.includes('partial_hus') ? 'partial_hus_pending_based_on_gtp_demand' :
                'other'
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        storage: {
          type: 'Repository Files',
          storedFiles: [],
          hasUploadedFiles: false,
          allFiles: fileStats
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
