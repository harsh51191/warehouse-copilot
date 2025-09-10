import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const derivedDir = process.env.VERCEL === '1' ? '/tmp/data/derived' : join(process.cwd(), 'data', 'derived');
    const artifactsPath = join(derivedDir, 'dashboard_artifacts.json');
    
    console.log('[DEBUG] Checking artifacts...');
    console.log('[DEBUG] Artifacts path:', artifactsPath);
    
    try {
      const artifactsData = await readFile(artifactsPath, 'utf-8');
      const artifacts = JSON.parse(artifactsData);
      
      return NextResponse.json({
        success: true,
        data: {
          calculation_timestamp: artifacts.calculation_timestamp,
          overall_summary: artifacts.overall_summary,
          sbl_stations_count: artifacts.sbl_stations?.length || 0,
          trips_count: artifacts.trips?.length || 0,
          macros: artifacts.macros,
          file_path: artifactsPath,
          timestamp: new Date().toISOString()
        }
      });
    } catch (fileError) {
      return NextResponse.json({
        success: false,
        error: 'Could not read artifacts file',
        details: fileError instanceof Error ? fileError.message : String(fileError),
        file_path: artifactsPath
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Error checking artifacts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
