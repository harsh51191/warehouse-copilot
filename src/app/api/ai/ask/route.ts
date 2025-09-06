import { NextResponse } from "next/server";
import { analyseQuery } from "@/lib/orchestrator";
import { getRunner } from "@/server/datasource";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

async function generateDynamicAnswer(question: string, data: any, intent: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback to natural language summary
    return generateNaturalFallback(question, data, intent);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a warehouse management AI assistant. Provide a concise, direct answer.

User Question: "${question}"
Intent: ${intent}
Data: ${JSON.stringify(data, null, 2)}

Instructions:
1. Answer in 1-2 sentences maximum
2. Use actual data values but keep it brief
3. Focus on the key insight or number
4. No bullet points, lists, or verbose explanations
5. Be direct and actionable
6. Avoid technical jargon

Generate a short, clear response:`;

    const response = await model.generateContent(prompt);
    return response.response.text();
  } catch (error) {
    console.error('Dynamic answer generation failed:', error);
    // Fallback to natural language summary
    return generateNaturalFallback(question, data, intent);
  }
}

function generateNaturalFallback(question: string, data: any, intent: string): string {
  // Generate natural language responses based on intent and data
  switch (intent) {
    case 'current_bottleneck':
      if (data.bottlenecks && data.bottlenecks.length > 0) {
        const primary = data.bottlenecks[0];
        return `Main bottleneck: ${primary.area} (${primary.severity}). ${primary.action}.`;
      }
      return "Analyzing bottlenecks...";
      
    case 'loading_status':
      if (data.summary) {
        const progress = Math.round((data.summary.totalLoaded / data.summary.totalAssigned) * 100);
        return `${progress}% loading complete (${data.summary.totalLoaded}/${data.summary.totalAssigned} crates). ${data.summary.totalPending} pending in QC.`;
      }
      return "Checking loading status...";
      
    case 'sbl_prod_timeline':
      if (data.summary) {
        return `SBL productivity: ${data.summary.averageProductivity} lines/hour average, peak ${data.summary.peakProductivity} at interval ${data.summary.peakInterval}.`;
      }
      return "Analyzing SBL trends...";
      
    case 'ptl_picking_status':
      if (data.isPicking !== undefined) {
        return `PTL is ${data.isPicking ? 'active' : 'inactive'}. ${data.currentProductivity} lines/hour (${data.performance}% of target).`;
      }
      return "Checking PTL status...";
      
    default:
      return `Analyzing ${intent.replace('_', ' ')} data...`;
  }
}

export async function POST(req: Request) {
	try {
		const { question } = await req.json();
		const analysis = await analyseQuery(String(question || ""));

		// If we have a valid intent, call the appropriate runner and generate dynamic answer
		if (analysis.intent !== 'unknown') {
			const runner = getRunner(analysis.intent);
			if (runner) {
				try {
					const runnerResult = await runner(analysis.parameters);
					
					// Use AI to generate a natural answer based on the actual data
					const dynamicAnswer = await generateDynamicAnswer(question, runnerResult.data, analysis.intent);
					
					return NextResponse.json({ 
						ok: true, 
						data: {
							...analysis,
							answer: dynamicAnswer,
							uiPatch: runnerResult.uiPatch || analysis.uiPatch,
							metricsData: runnerResult.data
						}
					});
				} catch (runnerError: any) {
					console.error('Runner error:', runnerError);
					return NextResponse.json({
						ok: true,
						data: {
							...analysis,
							answer: `I found the intent (${analysis.intent}) but encountered an error processing the data: ${runnerError.message}`,
							uiPatch: analysis.uiPatch
						}
					});
				}
			}
		}
		
		// Return analysis without runner data
		return NextResponse.json({ ok: true, data: analysis });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
	}
} 