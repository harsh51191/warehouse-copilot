import { GoogleGenerativeAI } from "@google/generative-ai";

export type ToolResult = { type: string; data: unknown };

export const tools = {
	loadingStatus: async () => ({ type: 'loading-status', data: { /* TODO wire */ } })
};

export async function analyseQuery(question: string): Promise<{ reasoning: string; toolCalls: any[]; answer: string }>{
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		const lower = question.toLowerCase();
		const answer = lower.includes('sbl') && lower.includes('ptl')
			? 'SBL and PTL productivity comparison coming from latest buckets.'
			: 'Analysing question against available tools...';
		return { reasoning: 'No GEMINI_API_KEY set; heuristic route', toolCalls: [], answer };
	}
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
	const prompt = `You are a tool router. Tools: loading-status. Question: ${question}. Decide which tool to call and a brief answer.`;
	const resp = await model.generateContent(prompt);
	const text = resp.response.text();
	return { reasoning: 'Gemini analysed the query', toolCalls: [], answer: text };
} 