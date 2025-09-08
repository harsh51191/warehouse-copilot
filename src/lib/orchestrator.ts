import { GoogleGenerativeAI } from "@google/generative-ai";
import { INTENTS, getIntentById, Intent, IntentParam } from "./intents";
import { RecommendationEngine } from "./analytics/recommendation-engine";

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
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);
  
  // Check if question is warehouse-related
  const lowerQuestion = question.toLowerCase();
  const warehouseKeywords = [
    'sbl', 'ptl', 'wave', 'station', 'productivity', 'loading', 'trip', 'lines', 
    'completion', 'warehouse', 'picking', 'sorting', 'staging', 'crates', 
    'skus', 'otif', 'risk', 'buffer', 'capacity', 'shortfall', 'starved',
    'trend', 'performance', 'issues', 'recommendations', 'status'
  ];
  
  const isWarehouseQuestion = warehouseKeywords.some(keyword => lowerQuestion.includes(keyword));
  
  if (!isWarehouseQuestion) {
    return {
      reasoning: "Question is not related to warehouse operations",
      intent: "general",
      parameters: {},
      answer: "I can only answer questions about warehouse operations, SBL/PTL workflows, loading status, productivity, and related metrics. Please ask about warehouse operations like 'What is the SBL productivity?' or 'How is loading going?'",
      uiPatch: {}
    };
  }
  
  // First, try to get analytics-based answer if available
  try {
    console.log('[ORCHESTRATOR] Attempting analytics-based answer for:', question);
    
    // Check if we're on the server side (no window object)
    if (typeof window === 'undefined') {
      // Server side - import and use directly
      const { getProcessedMacros } = await import('../server/datasource/macros-adapter');
      const { ArtifactGenerator } = await import('./analytics/artifact-generator');
      
      const macros = await getProcessedMacros();
      if (macros) {
        console.log('[ORCHESTRATOR] Macros found, generating artifacts...');
        const generator = new ArtifactGenerator();
        const artifacts = await generator.generateDashboardArtifacts(macros);
        
        if (artifacts && artifacts.overall_summary) {
          console.log('[ORCHESTRATOR] Artifacts generated, creating recommendation engine...');
          const recommendationEngine = new RecommendationEngine();
          const factBasedAnswer = await recommendationEngine.generateFactBasedAnswer(question, artifacts);
          
          console.log('[ORCHESTRATOR] Generated answer:', factBasedAnswer);
          
          // Determine UI highlights based on question
          let highlights: string[] = [];
          
          if (lowerQuestion.includes('sbl')) highlights.push('SBLTrend', 'SBLStations');
          if (lowerQuestion.includes('ptl')) highlights.push('PTLTrend', 'PTLTotals');
          if (lowerQuestion.includes('trip') || lowerQuestion.includes('loading')) highlights.push('TripsGrid');
          if (lowerQuestion.includes('otif') || lowerQuestion.includes('overall')) highlights.push('WaveSummary');
          
          return {
            reasoning: 'Analytics-based fact-driven response using dashboard artifacts',
            intent: 'analytics_based',
            parameters: {},
            answer: factBasedAnswer,
            uiPatch: { highlight: highlights }
          };
        } else {
          console.log('[ORCHESTRATOR] No artifacts or overall_summary found');
        }
      } else {
        console.log('[ORCHESTRATOR] No macros found');
      }
    } else {
      // Client side - make API call
      const response = await fetch('/api/analytics/dashboard');
      
      if (response.ok) {
        const data = await response.json();
        const artifacts = data.data;
        
        if (artifacts && artifacts.overall_summary) {
          console.log('[ORCHESTRATOR] Artifacts found, creating recommendation engine...');
          const recommendationEngine = new RecommendationEngine();
          const factBasedAnswer = await recommendationEngine.generateFactBasedAnswer(question, artifacts);
          
          console.log('[ORCHESTRATOR] Generated answer:', factBasedAnswer);
          
          // Determine UI highlights based on question
          let highlights: string[] = [];
          
          if (lowerQuestion.includes('sbl')) highlights.push('SBLTrend', 'SBLStations');
          if (lowerQuestion.includes('ptl')) highlights.push('PTLTrend', 'PTLTotals');
          if (lowerQuestion.includes('trip') || lowerQuestion.includes('loading')) highlights.push('TripsGrid');
          if (lowerQuestion.includes('otif') || lowerQuestion.includes('overall')) highlights.push('WaveSummary');
          
          return {
            reasoning: 'Analytics-based fact-driven response using dashboard artifacts',
            intent: 'analytics_based',
            parameters: {},
            answer: factBasedAnswer,
            uiPatch: { highlight: highlights }
          };
        } else {
          console.log('[ORCHESTRATOR] No artifacts or overall_summary found');
        }
      } else {
        console.log('[ORCHESTRATOR] Dashboard API not available:', response.status);
      }
    }
  } catch (error) {
    console.log('[ORCHESTRATOR] Analytics not available, falling back to LLM:', error);
  }
  
  if (!apiKey) {
    // No API key - provide helpful guidance
    return {
      reasoning: 'No GEMINI_API_KEY set; LLM classification unavailable',
      intent: 'unknown',
      parameters: {},
      answer: 'I can only answer warehouse-related questions based on uploaded data. Please ask about SBL productivity, PTL performance, loading status, wave progress, or station completion. For general questions, I\'m designed specifically for warehouse operations.',
      uiPatch: { highlight: [] }
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
1. Understand the user's intent regardless of how they phrase the question
2. Match the question to the most appropriate data source from the available intents
3. Extract any parameters from the question (wave numbers, thresholds, time periods, etc.)
4. Consider synonyms and variations:
   - "completion" = "completion percentage", "progress", "status"
   - "productivity" = "performance", "output", "efficiency", "rate"
   - "loading" = "loading status", "trip progress", "dockdoor"
   - "SBL" = "sorting", "picking", "warehouse operations"
   - "PTL" = "put-to-light", "packing", "fulfillment"
   - "station" = "workstation", "zone", "area"
   - "average" = "mean", "overall", "across all"
5. If the question asks for "average" or "overall" metrics, choose the intent that provides summary data
6. If the question asks for specific details, choose the intent that provides detailed breakdowns

Respond with JSON:
{
  "intent": "data_source_to_fetch",
  "parameters": {"param_name": "value"},
  "reasoning": "why you chose this approach and how you interpreted the question",
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
    
    // Return error response instead of hardcoded fallback
    return {
      reasoning: `Gemini classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      intent: 'unknown',
      parameters: {},
      answer: 'I encountered an error while trying to understand your question. Please try rephrasing it or check if the GEMINI_API_KEY is valid. You can ask about loading status, SBL productivity, PTL trends, station completion, or other warehouse operations.',
      uiPatch: { highlight: [] }
    };
  }
}

// Removed hardcoded parameter extraction - now handled by LLM 