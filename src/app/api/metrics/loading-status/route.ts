import { NextResponse } from "next/server";
import { getLoadingStatus } from "@/server/datasource";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const data = await getLoadingStatus();
		return NextResponse.json({ ok: true, data });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
	}
} 