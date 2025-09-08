import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { DashboardArtifacts } from '@/lib/analytics/dashboard-artifacts';
import { RecommendationEngine } from '@/lib/analytics/recommendation-engine';

export async function GET() {
  try {
    // Use /tmp for Vercel compatibility in production
    const derivedDir = process.env.NODE_ENV === 'production' 
      ? '/tmp/data/derived' 
      : join(process.cwd(), 'data', 'derived');
    const artifactsPath = join(derivedDir, 'dashboard_artifacts.json');
    
    try {
      const artifactsData = await readFile(artifactsPath, 'utf-8');
      const artifacts: DashboardArtifacts = JSON.parse(artifactsData);
      
      const recommendationEngine = new RecommendationEngine();
      const recommendations = recommendationEngine.generateRecommendations(artifacts);
      
      return NextResponse.json({
        success: true,
        data: {
          recommendations,
          summary: {
            total: recommendations.length,
            high_priority: recommendations.filter(r => r.priority === 'HIGH').length,
            medium_priority: recommendations.filter(r => r.priority === 'MEDIUM').length,
            low_priority: recommendations.filter(r => r.priority === 'LOW').length
          }
        }
      });
    } catch (fileError) {
      // If artifacts don't exist, return empty recommendations
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          summary: {
            total: 0,
            high_priority: 0,
            medium_priority: 0,
            low_priority: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recommendations'
    }, { status: 500 });
  }
}
