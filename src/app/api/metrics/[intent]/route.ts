import { NextResponse } from "next/server";
import { getRunner } from "@/server/datasource";
import { getIntentById } from "@/lib/intents";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { intent: string } }
) {
  try {
    const { intent } = params;
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Convert search params to parameters object
    const parameters: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      parameters[key] = value;
    }
    
    // Validate intent exists
    const intentConfig = getIntentById(intent);
    if (!intentConfig) {
      return NextResponse.json(
        { ok: false, error: `Unknown intent: ${intent}` },
        { status: 400 }
      );
    }
    
    // Get the appropriate runner
    const runner = getRunner(intent);
    if (!runner) {
      return NextResponse.json(
        { ok: false, error: `No runner available for intent: ${intent}` },
        { status: 501 }
      );
    }
    
    // Execute the runner with parameters
    const data = await runner(parameters);
    
    return NextResponse.json({ 
      ok: true, 
      data,
      intent,
      parameters 
    });
    
  } catch (err: any) {
    console.error(`Error in /api/metrics/${params.intent}:`, err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
