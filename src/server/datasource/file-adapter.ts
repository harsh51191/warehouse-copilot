import path from "path";
import { getDataDir, findLatestMatchingFile, readFirstSheetAsJson } from "@/lib/xlsx";

export type LoadingStatus = {
	summary: {
		totalAssigned: number;
		totalLoaded: number;
		totalPending: number;
	};
	byTrip: Array<{
		trip: string;
		sorted: number;
		staged: number;
		loaded: number;
		total: number;
		qc: number;
	}>;
};

export async function getLoadingStatusFromFile(): Promise<LoadingStatus> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "updated_loading_dashboard_query_")
		|| findLatestMatchingFile(fallbackDir, "updated_loading_dashboard_query_");
	if (!filePath) {
		return {
			summary: { totalAssigned: 0, totalLoaded: 0, totalPending: 0 },
			byTrip: []
		};
	}
	const rows = readFirstSheetAsJson(filePath);
	// Attempt to infer columns: expect columns like Trip, Sorted, Staged, Loaded, Total, QC
	let totalAssigned = 0, totalLoaded = 0;
	const byTrip: LoadingStatus["byTrip"] = [];
	for (const r of rows as any[]) {
		const trip = String(r.Trip || r.trip || r["trip_code"] || r["MM Trip"] || "").trim();
		if (!trip) continue;
		const sorted = Number(r.Sorted ?? r.sorted ?? r["sorted_crates"] ?? 0) || 0;
		const staged = Number(r.Staged ?? r.staged ?? r["staged_crates"] ?? 0) || 0;
		const loaded = Number(r.Loaded ?? r.loaded ?? r["closed_crates"] ?? 0) || 0;
		const total = Number(r.Total ?? r.total ?? r["planned_crates"] ?? r["total_crates"] ?? 0) || 0;
		const qc = Number(r.QC ?? r.qc ?? r["qc_pending"] ?? 0) || 0;
		byTrip.push({ trip, sorted, staged, loaded, total, qc });
		totalAssigned += total;
		totalLoaded += loaded;
	}
	return {
		summary: {
			totalAssigned,
			totalLoaded,
			totalPending: Math.max(0, totalAssigned - totalLoaded)
		},
		byTrip
	};
} 