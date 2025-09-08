import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DashboardArtifacts } from '@/lib/analytics/dashboard-artifacts';

export async function GET() {
  try {
    const derivedDir = join(process.cwd(), 'data', 'derived');
    const artifactsPath = join(derivedDir, 'dashboard_artifacts.json');
    
    try {
      const artifactsData = await readFile(artifactsPath, 'utf-8');
      const artifacts: DashboardArtifacts = JSON.parse(artifactsData);
      
      return NextResponse.json({
        success: true,
        data: artifacts
      });
    } catch (fileError) {
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
