import { NextResponse } from "next/server";
import { RecommendationEngine } from "@/lib/analytics/recommendation-engine";
import { getProcessedMacros } from "@/server/datasource/macros-adapter";
import { ArtifactGenerator } from "@/lib/analytics/artifact-generator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		const { question } = await req.json();
		console.log('[AI API] Processing question:', question);
		
		// Get the actual warehouse data
		const macros = await getProcessedMacros();
		if (!macros) {
			return NextResponse.json({
				ok: true,
				data: {
					reasoning: 'No warehouse data available',
					intent: 'no_data',
					parameters: {},
					answer: 'No warehouse data is available. Please upload Excel files to get started.',
					uiPatch: { highlight: [] }
				}
			});
		}

		// Generate dashboard artifacts
		const generator = new ArtifactGenerator();
		const artifacts = await generator.generateDashboardArtifacts(macros);
		
		if (!artifacts || !artifacts.overall_summary) {
			return NextResponse.json({
				ok: true,
				data: {
					reasoning: 'Dashboard artifacts not available',
					intent: 'no_artifacts',
					parameters: {},
					answer: 'Dashboard data is not ready. Please try again in a moment.',
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
				reasoning: 'Direct analytics-based response using warehouse data',
				intent: 'analytics_based',
				parameters: {},
				answer: answer,
				uiPatch: { highlight: highlights }
			}
		});
		
	} catch (err: any) {
		console.error('[AI API] Error:', err);
		return NextResponse.json({ 
			ok: false, 
			error: err?.message || 'Unknown error' 
		}, { status: 500 });
	}
} 