import { GoogleGenerativeAI } from "@google/generative-ai";
import { INTENTS, getIntentById, findIntentByKeywords, Intent, IntentParam } from "./intents";

export interface ToolResult { 
  type: string; 
  data: unknown;
  uiPatch?: {
    highlight?: string[];
    focus?: string;
  };
}

export interface AnalysisResult {
  reasoning: string;
  intent: string;
  parameters: Record<string, any>;
  answer: string;
  uiPatch?: {
    highlight?: string[];
    focus?: string;
  };
}

export async function analyseQuery(question: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback to keyword-based routing
    const intent = findIntentByKeywords(question);
    if (!intent) {
      return {
        reasoning: 'No GEMINI_API_KEY set; keyword fallback failed',
        intent: 'unknown',
        parameters: {},
        answer: 'I couldn\'t understand your question. Try asking about loading status, SBL trends, or PTL productivity.'
      };
    }
    
    const parameters = extractParametersFromQuestion(question, intent);
    return {
      reasoning: 'No GEMINI_API_KEY set; keyword-based routing',
      intent: intent.id,
      parameters,
      answer: `I'll check ${intent.description.toLowerCase()} for you.`,
      uiPatch: intent.uiHints
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Create intent classification prompt
    const availableIntents = Object.values(INTENTS).map(intent => ({
      id: intent.id,
      description: intent.description,
      examples: intent.examples || [],
      parameters: intent.parameters.map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        default: p.default,
        description: p.description
      }))
    }));

    const prompt = `You are an AI assistant for a warehouse management system. Analyze this question and determine what data to fetch and how to answer it naturally.

Question: "${question}"

Available data sources:
${JSON.stringify(availableIntents, null, 2)}

Instructions:
1. Determine what data needs to be fetched (loading status, SBL productivity, PTL data, etc.)
2. Extract any parameters from the question (wave numbers, thresholds, time periods, etc.)
3. Generate a natural, conversational answer approach
4. Suggest which UI components should be highlighted

Respond with JSON:
{
  "intent": "data_source_to_fetch",
  "parameters": {"param_name": "value"},
  "reasoning": "why you chose this approach",
  "answer_approach": "how to structure the answer naturally",
  "ui_highlight": ["component1", "component2"]
}`;

    const resp = await model.generateContent(prompt);
    const text = resp.response.text();
    
    // Parse Gemini response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    const intent = getIntentById(result.intent);
    
    if (!intent) {
      throw new Error(`Unknown intent: ${result.intent}`);
    }
    
    // Apply defaults for missing parameters
    const parameters = { ...result.parameters };
    for (const param of intent.parameters) {
      if (!(param.name in parameters) && param.default !== undefined) {
        parameters[param.name] = param.default;
      }
    }
    
    return {
      reasoning: result.reasoning || `Gemini analyzed the question and determined intent: ${intent.id}`,
      intent: intent.id,
      parameters,
      answer: `I'll analyze ${intent.description.toLowerCase()} and provide you with a detailed answer based on the current data.`,
      uiPatch: { highlight: result.ui_highlight || intent.uiHints.highlight }
    };
    
  } catch (error) {
    console.error('Gemini classification failed:', error);
    
    // Fallback to keyword routing
    const intent = findIntentByKeywords(question);
    if (!intent) {
      return {
        reasoning: 'Gemini failed; keyword fallback failed',
        intent: 'unknown',
        parameters: {},
        answer: 'I couldn\'t understand your question. Try asking about loading status, SBL trends, or PTL productivity.'
      };
    }
    
    const parameters = extractParametersFromQuestion(question, intent);
    return {
      reasoning: 'Gemini failed; keyword-based routing',
      intent: intent.id,
      parameters,
      answer: `I'll check ${intent.description.toLowerCase()} for you.`,
      uiPatch: intent.uiHints
    };
  }
}

function extractParametersFromQuestion(question: string, intent: Intent): Record<string, any> {
  const parameters: Record<string, any> = {};
  const lower = question.toLowerCase();
  
  for (const param of intent.parameters) {
    if (param.default !== undefined) {
      parameters[param.name] = param.default;
    }
    
    // Simple keyword extraction
    if (param.name === 'wave_id') {
      const waveMatch = lower.match(/wave\s+(\d+)/);
      if (waveMatch) {
        parameters[param.name] = waveMatch[1];
      }
    }
    
    if (param.name === 'session_code') {
      const sessionMatch = lower.match(/session\s+([a-zA-Z0-9_]+)/);
      if (sessionMatch) {
        parameters[param.name] = sessionMatch[1];
      }
    }
  }
  
  return parameters;
} 