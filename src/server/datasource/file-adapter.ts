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
		vehicleNo?: string;
		casesLoaded?: number;
		casesStaged?: number;
		xdock?: boolean;
		dockdoorQueue?: string;
	}>;
};

export type SBLTimeline = {
	timeline: Array<{
		interval: string;
		productivity: number;
		lines: number;
		stations: number;
	}>;
	summary: {
		peakProductivity: number;
		peakInterval: string;
		averageProductivity: number;
		totalLines: number;
	};
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

export async function getSBLTimelineFromFile(parameters: Record<string, any> = {}): Promise<SBLTimeline> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "sbl_productivity_withtime_")
		|| findLatestMatchingFile(fallbackDir, "sbl_productivity_withtime_");
	
	if (!filePath) {
		return {
			timeline: [],
			summary: {
				peakProductivity: 0,
				peakInterval: "",
				averageProductivity: 0,
				totalLines: 0
			}
		};
	}
	
	const rows = readFirstSheetAsJson(filePath);
	const timeline: SBLTimeline["timeline"] = [];
	let totalLines = 0;
	let peakProductivity = 0;
	let peakInterval = "";
	
	for (const r of rows as any[]) {
		// Use actual column names from Excel file
		const interval = String(r.interval_no || "").trim();
		const productivity = Number(r.productivity || 0) || 0;
		const lines = Number(r.total_line_count || 0) || 0;
		const stations = Number(r.wave_number || 8) || 8; // Using wave_number as station count
		
		if (!interval) continue;
		
		timeline.push({ interval, productivity, lines, stations });
		totalLines += lines;
		
		if (productivity > peakProductivity) {
			peakProductivity = productivity;
			peakInterval = interval;
		}
	}
	
	const averageProductivity = timeline.length > 0 
		? timeline.reduce((sum, t) => sum + t.productivity, 0) / timeline.length 
		: 0;
	
	return {
		timeline,
		summary: {
			peakProductivity,
			peakInterval,
			averageProductivity: Math.round(averageProductivity * 100) / 100,
			totalLines
		}
	};
}

export async function getPTLTimelineFromFile(parameters: Record<string, any> = {}): Promise<SBLTimeline> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "ptl_productivity_")
		|| findLatestMatchingFile(fallbackDir, "ptl_productivity_");
	
	if (!filePath) {
		return {
			timeline: [],
			summary: {
				peakProductivity: 0,
				peakInterval: "",
				averageProductivity: 0,
				totalLines: 0
			}
		};
	}
	
	const rows = readFirstSheetAsJson(filePath);
	const timeline: SBLTimeline["timeline"] = [];
	let totalLines = 0;
	let peakProductivity = 0;
	let peakInterval = "";
	
	for (const r of rows as any[]) {
		// Use actual column names from PTL Excel file
		const interval = String(r.interval_no || "").trim();
		const productivity = Number(r.productivity || 0) || 0;
		const lines = Number(r.first_scan_time || 0) || 0; // Using first_scan_time as line count
		const stations = 8; // Default station count for PTL
		
		if (!interval) continue;
		
		timeline.push({ interval, productivity, lines, stations });
		totalLines += lines;
		
		if (productivity > peakProductivity) {
			peakProductivity = productivity;
			peakInterval = interval;
		}
	}
	
	const averageProductivity = timeline.length > 0 
		? timeline.reduce((sum, t) => sum + t.productivity, 0) / timeline.length 
		: 0;
	
	return {
		timeline,
		summary: {
			peakProductivity,
			peakInterval,
			averageProductivity: Math.round(averageProductivity * 100) / 100,
			totalLines
		}
	};
}

export async function getStationCompletionFromFile(parameters: Record<string, any> = {}): Promise<any> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "line_completion_2_")
		|| findLatestMatchingFile(fallbackDir, "line_completion_2_");
	
	if (!filePath) {
		return {
			stations: [],
			summary: {
				totalStations: 0,
				averageCompletion: 0,
				completedStations: 0
			}
		};
	}
	
	const rows = readFirstSheetAsJson(filePath);
	const stations: any[] = [];
	let totalCompletion = 0;
	let completedStations = 0;
	
	for (const r of rows as any[]) {
		// Use actual column names from line completion Excel file
		const code = String(r.code || "").trim();
		const totalDemandLines = Number(r.total_demand_lines || 0) || 0;
		const totalPackedLines = Number(r.total_demand_packed_lines || 0) || 0;
		const completionPercentage = parseFloat(String(r.completion_percentage || "0").replace('%', '')) || 0;
		
		if (!code) continue;
		
		stations.push({
			code,
			totalDemandLines,
			totalPackedLines,
			completionPercentage,
			pendingLines: totalDemandLines - totalPackedLines
		});
		
		totalCompletion += completionPercentage;
		if (completionPercentage >= 100) completedStations++;
	}
	
	const averageCompletion = stations.length > 0 ? totalCompletion / stations.length : 0;
	
	return {
		stations,
		summary: {
			totalStations: stations.length,
			averageCompletion: Math.round(averageCompletion * 100) / 100,
			completedStations
		}
	};
} 