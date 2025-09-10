import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const dataDir = process.env.VERCEL === '1' ? '/tmp/data' : join(process.cwd(), 'data');
    
    console.log('[UPLOAD TEST] Checking data directory:', dataDir);
    
    // List all files in /tmp/data
    const files = await readdir(dataDir);
    const excelFiles = files.filter(f => f.endsWith('.xlsx'));
    
    console.log('[UPLOAD TEST] All files in data directory:', files);
    console.log('[UPLOAD TEST] Excel files found:', excelFiles);
    
    // Get detailed stats for each Excel file
    const fileStats = await Promise.all(
      excelFiles.map(async (file) => {
        const filePath = join(dataDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString()
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        dataDir,
        allFiles: files,
        excelFiles: excelFiles,
        fileStats: fileStats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[UPLOAD TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      dataDir: process.env.VERCEL === '1' ? '/tmp/data' : join(process.cwd(), 'data')
    }, { status: 500 });
  }
}
