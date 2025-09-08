import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DashboardArtifacts } from '@/lib/analytics/dashboard-artifacts';

export async function GET() {
  try {
    // Use /tmp for Vercel compatibility in production
    const derivedDir = process.env.VERCEL === '1' 
      ? '/tmp/data/derived' 
      : join(process.cwd(), 'data', 'derived');
    const artifactsPath = join(derivedDir, 'dashboard_artifacts.json');
    
    console.log('[DASHBOARD API] Looking for artifacts at:', artifactsPath);
    console.log('[DASHBOARD API] VERCEL env:', process.env.VERCEL);
    console.log('[DASHBOARD API] NODE_ENV:', process.env.NODE_ENV);
    
    // Check if directory exists
    try {
      const fs = await import('fs');
      const dirExists = fs.existsSync(derivedDir);
      console.log('[DASHBOARD API] Derived dir exists:', dirExists);
      if (dirExists) {
        const files = fs.readdirSync(derivedDir);
        console.log('[DASHBOARD API] Files in derived dir:', files);
      }
    } catch (e) {
      console.log('[DASHBOARD API] Error checking directory:', e);
    }
    
    try {
      const artifactsData = await readFile(artifactsPath, 'utf-8');
      const artifacts: DashboardArtifacts = JSON.parse(artifactsData);
      
      console.log('[DASHBOARD API] Successfully loaded artifacts, SBL rate:', artifacts.sbl_stream?.ema_lph);
      
      return NextResponse.json({
        success: true,
        data: artifacts
      });
    } catch (fileError) {
      console.log('[DASHBOARD API] File read error:', fileError instanceof Error ? fileError.message : String(fileError));
      // If artifacts don't exist, return empty state
      return NextResponse.json({
        success: true,
        data: {
          overall_summary: {
            projected_finish_iso: new Date().toISOString(),
            buffer_minutes: 0,
            otif_risk: 'LOW' as const,
            line_coverage_pct: 0,
            wave_status: 'ON_TRACK' as const
          },
          sbl_stations: [],
          sbl_stream: {
            ema_lph: 0,
            last_hour_avg: 0,
            slope: 0,
            trend: 'stable' as const,
            health_color: 'green' as const
          },
          ptl_stream: {
            ema_lph: 0,
            last_hour_avg: 0,
            slope: 0,
            trend: 'stable' as const,
            shortfall: false,
            shortfall_factor: 0,
            health_color: 'green' as const
          },
          ptl_totals: {
            last_hour_lines: 0,
            by_station: [],
            leaderboard: { top: [], bottom: [] }
          },
          trips: [],
          calculation_timestamp: new Date().toISOString(),
          macros: null
        }
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard artifacts:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard artifacts'
    }, { status: 500 });
  }
}
