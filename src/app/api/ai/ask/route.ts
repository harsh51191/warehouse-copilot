import { NextResponse } from "next/server";
import { analyseQuery } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		const { question } = await req.json();
		const result = await analyseQuery(String(question || ""));
		return NextResponse.json({ ok: true, data: result });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
	}
} 