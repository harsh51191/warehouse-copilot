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
		
		// On Vercel, ensure artifacts exist by calling dashboard API logic once
		if (process.env.VERCEL === '1') {
			console.log('[AI API] Running Vercel setup logic...');
			try {
				const fs = await import('fs');
				const tmpDataDir = '/tmp/data';
				const repoDataDir = join(process.cwd(), 'data');
				
				console.log('[AI API] Checking if /tmp/data exists...');
				// Check if /tmp/data exists and has Excel files
				const tmpDataExists = fs.existsSync(tmpDataDir);
				const tmpDataFiles = tmpDataExists ? fs.readdirSync(tmpDataDir).filter(f => f.endsWith('.xlsx')) : [];
				
				console.log('[AI API] /tmp/data exists:', tmpDataExists);
				console.log('[AI API] Excel files in /tmp/data:', tmpDataFiles.length);
				console.log('[AI API] Excel files in /tmp/data:', tmpDataFiles);
				
				// Always use /tmp/data if it has files, otherwise fall back to repository
				if (tmpDataFiles.length > 0) {
					console.log('[AI API] Using uploaded files from /tmp/data');
					// Use the uploaded files directly
				} else {
					console.log('[AI API] No uploaded files found, copying from repository to /tmp/data...');
					
					// Ensure /tmp/data exists
					fs.mkdirSync(tmpDataDir, { recursive: true });
					
					// Copy Excel files from repository
					const repoFiles = fs.readdirSync(repoDataDir).filter(f => f.endsWith('.xlsx'));
					console.log('[AI API] Found Excel files in repo:', repoFiles);
					
					for (const file of repoFiles) {
						const srcPath = join(repoDataDir, file);
						const destPath = join(tmpDataDir, file);
						fs.copyFileSync(srcPath, destPath);
						console.log('[AI API] Copied:', file);
					}
				}
				
				// Always regenerate artifacts to ensure they're up to date
				console.log('[AI API] Regenerating artifacts...');
				const { ArtifactGenerator } = await import('@/lib/analytics/artifact-generator');
				const { getProcessedMacros } = await import('@/server/datasource/macros-adapter');
				
				const macros = await getProcessedMacros();
				if (macros) {
					const generator = new ArtifactGenerator();
					await generator.generateDashboardArtifacts(macros);
					console.log('[AI API] Artifacts regenerated successfully');
				} else {
					console.log('[AI API] No macros found, skipping artifact generation');
				}
			} catch (e) {
				console.log('[AI API] Error setting up data:', e);
			}
		} else {
			console.log('[AI API] Not on Vercel, skipping setup logic');
		}
		
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
			const answer = await recommendationEngine.generateFactBasedAnswer(question, artifacts);
			
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
			console.log('[AI API] File error:', fileError);
			
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