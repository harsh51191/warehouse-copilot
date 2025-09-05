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

    const prompt = `You are a warehouse management AI assistant. Based on the user's question and the actual data, provide a natural, conversational answer.

User Question: "${question}"
Intent: ${intent}
Data: ${JSON.stringify(data, null, 2)}

Instructions:
1. Answer the user's question directly and naturally - NO JSON or technical jargon
2. Use the actual data values in your response but explain them in plain English
3. Provide insights and context based on the data
4. Suggest specific actions if there are issues or opportunities
5. Be conversational, helpful, and easy to understand
6. Format your response as a natural conversation, not a data dump
7. Use bullet points or numbered lists only when helpful for clarity
8. Never show raw JSON or technical data structures

Generate a helpful, natural response that a warehouse manager would want to read:`;

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
        let response = `I've identified the main bottleneck: **${primary.area}** (${primary.severity} severity). `;
        response += `${primary.impact}. `;
        response += `Recommended action: ${primary.action}.`;
        
        if (data.bottlenecks.length > 1) {
          response += `\n\nOther issues to monitor: `;
          data.bottlenecks.slice(1).forEach((b: any, i: number) => {
            response += `${b.area} (${b.severity})`;
            if (i < data.bottlenecks.length - 2) response += ', ';
            else if (i === data.bottlenecks.length - 2) response += ' and ';
          });
          response += '.';
        }
        return response;
      }
      return "I'm analyzing the current operational status to identify bottlenecks...";
      
    case 'loading_status':
      if (data.summary) {
        const progress = Math.round((data.summary.totalLoaded / data.summary.totalAssigned) * 100);
        return `Loading progress: ${data.summary.totalLoaded}/${data.summary.totalAssigned} crates loaded (${progress}% complete). ` +
               `QC queue has ${data.summary.totalPending} pending crates.`;
      }
      return "I'm checking the current loading status...";
      
    case 'sbl_prod_timeline':
      if (data.summary) {
        return `SBL productivity: Peak at ${data.summary.peakInterval} with ${data.summary.peakProductivity} lines/hour. ` +
               `Average: ${data.summary.averageProductivity} lines/hour. Total processed: ${data.summary.totalLines} lines.`;
      }
      return "I'm analyzing SBL productivity trends...";
      
    case 'ptl_picking_status':
      if (data.isPicking !== undefined) {
        return `PTL is ${data.isPicking ? 'actively picking' : 'not picking'}. ` +
               `Current productivity: ${data.currentProductivity} lines/hour per station (${data.performance}% of target).`;
      }
      return "I'm checking PTL picking status...";
      
    default:
      return `I'm analyzing the ${intent.replace('_', ' ')} data to answer your question...`;
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