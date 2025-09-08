import { NextResponse } from "next/server";
import { RecommendationEngine } from "@/lib/analytics/recommendation-engine";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		const { question } = await req.json();
		console.log('[AI API] Processing question:', question);
		
		// Use same path logic as dashboard API
		const derivedDir = process.env.VERCEL === '1' 
			? '/tmp/data/derived' 
			: join(process.cwd(), 'data', 'derived');
		const artifactsPath = join(derivedDir, 'dashboard_artifacts.json');
		
		console.log('[AI API] Looking for artifacts at:', artifactsPath);
		console.log('[AI API] VERCEL env:', process.env.VERCEL);
		
		try {
			const artifactsData = await readFile(artifactsPath, 'utf8');
			const artifacts = JSON.parse(artifactsData);
			
			if (!artifacts || !artifacts.overall_summary) {
				return NextResponse.json({
					ok: true,
					data: {
						reasoning: 'Invalid dashboard artifacts',
						intent: 'invalid_artifacts',
						parameters: {},
						answer: 'Dashboard data is corrupted. Please try uploading files again.',
						uiPatch: { highlight: [] }
					}
				});
			}

			// Use recommendation engine to generate answer
			const recommendationEngine = new RecommendationEngine();
			const answer = recommendationEngine.generateFactBasedAnswer(question, artifacts);
			
			console.log('[AI API] Generated answer:', answer);
			
			// Determine UI highlights based on question
			const lowerQuestion = question.toLowerCase();
			let highlights: string[] = [];
			
			if (lowerQuestion.includes('sbl')) highlights.push('SBLTrend', 'SBLStations');
			if (lowerQuestion.includes('ptl')) highlights.push('PTLTrend', 'PTLTotals');
			if (lowerQuestion.includes('trip') || lowerQuestion.includes('loading')) highlights.push('TripsGrid');
			if (lowerQuestion.includes('otif') || lowerQuestion.includes('overall')) highlights.push('WaveSummary');
			
			return NextResponse.json({ 
				ok: true, 
				data: {
					reasoning: 'Direct analytics-based response using dashboard artifacts',
					intent: 'analytics_based',
					parameters: {},
					answer: answer,
					uiPatch: { highlight: highlights }
				}
			});
			
		} catch (fileError) {
			console.log('[AI API] Artifacts not found at:', artifactsPath);
			return NextResponse.json({
				ok: true,
				data: {
					reasoning: 'Dashboard artifacts not found',
					intent: 'no_artifacts',
					parameters: {},
					answer: 'Dashboard data is not available. Please upload Excel files to get started.',
					uiPatch: { highlight: [] }
				}
			});
		}
		
	} catch (err: any) {
		console.error('[AI API] Error:', err);
		return NextResponse.json({ 
			ok: false, 
			error: err?.message || 'Unknown error' 
		}, { status: 500 });
	}
} 