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
		xdock?: string;
		dockdoorQueue?: number;
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
		const trip = String(r.mm_trip || r.Trip || r.trip || r["trip_code"] || r["MM Trip"] || "").trim();
		if (!trip) continue;
		
		// Handle the "876/876" format for sorted/staged/loaded
		const parseCrateCount = (value: any): number => {
			if (typeof value === 'string' && value.includes('/')) {
				const parts = value.split('/');
				return Number(parts[0]) || 0;
			}
			return Number(value) || 0;
		};
		
		const sorted = parseCrateCount(r.crates_sorted ?? r.Sorted ?? r.sorted ?? r["sorted_crates"] ?? 0);
		const staged = parseCrateCount(r.crates_staged ?? r.Staged ?? r.staged ?? r["staged_crates"] ?? 0);
		const loaded = parseCrateCount(r.crates_loaded ?? r.Loaded ?? r.loaded ?? r["closed_crates"] ?? 0);
		const total = Number(r.total_crate_count ?? r.Total ?? r.total ?? r["planned_crates"] ?? r["total_crates"] ?? 0) || 0;
		const qc = Number(r.dockdoorQueue ?? r.QC ?? r.qc ?? r["qc_pending"] ?? 0) || 0;
		
		byTrip.push({ 
			trip, 
			sorted, 
			staged, 
			loaded, 
			total, 
			qc,
			vehicleNo: r.vehicleNo,
			dockdoorQueue: r.dockdoorQueue,
			xdock: r.xdock
		});
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
	const filePath = findLatestMatchingFile(dir, "sbl_productivity_")
		|| findLatestMatchingFile(fallbackDir, "sbl_productivity_");
	
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


export async function getSBLTableLinesFromFile(): Promise<any> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "sbl_table_lines_")
		|| findLatestMatchingFile(fallbackDir, "sbl_table_lines_");
	
	if (!filePath) {
		return {
			intervals: [],
			summary: {
				totalIntervals: 0,
				totalLines: 0,
				averageLinesPerInterval: 0
			}
		};
	}
	
	const rows = readFirstSheetAsJson(filePath);
	const intervals: any[] = [];
	let totalLines = 0;
	
	for (const r of rows as any[]) {
		const interval = String(r.interval_no || "").trim();
		const stationCode = String(r.zone_code || r.station_code || "").trim();
		const lineCount = Number(r.total_line_count || r.line_count || 0) || 0;
		const productivity = Number(r.productivity || 0) || 0;
		
		if (!interval || !stationCode) continue;
		
		intervals.push({
			interval_no: interval,
			station_code: stationCode,
			line_count: lineCount,
			productivity: productivity
		});
		
		totalLines += lineCount;
	}
	
	const averageLinesPerInterval = intervals.length > 0 ? totalLines / intervals.length : 0;
	
	return {
		intervals,
		summary: {
			totalIntervals: intervals.length,
			totalLines,
			averageLinesPerInterval: Math.round(averageLinesPerInterval * 100) / 100
		}
	};
}

export async function getPTLTableLinesFromFile(): Promise<any> {
  const dir = getDataDir();
  const fallbackDir = path.join(process.cwd(), "..");
  const filePath = findLatestMatchingFile(dir, "ptl_table_lines_")
    || findLatestMatchingFile(fallbackDir, "ptl_table_lines_");
  
  if (!filePath) {
    return {
      intervals: [],
      summary: {
        totalIntervals: 0,
        totalLines: 0,
        averageLinesPerInterval: 0
      }
    };
  }

  const rows = readFirstSheetAsJson(filePath);
  const intervals: any[] = [];
  let totalLines = 0;

  for (const r of rows as any[]) {
    const interval = String(r.interval_no || "").trim();
    const stationCode = String(r.zone_code || r.station_code || "").trim();
    const lineCount = Number(r.total_line_count || r.line_count || 0) || 0;
    const productivity = Number(r.productivity || 0) || 0;

    if (!interval || !stationCode) continue;

    intervals.push({
      interval_no: interval,
      station_code: stationCode,
      line_count: lineCount,
      productivity: productivity
    });

    totalLines += lineCount;
  }

  const averageLinesPerInterval = intervals.length > 0 ? totalLines / intervals.length : 0;

  return {
    intervals,
    summary: {
      totalIntervals: intervals.length,
      totalLines,
      averageLinesPerInterval: Math.round(averageLinesPerInterval * 100) / 100
    }
  };
}

export async function getSBLSKUsFromFile(): Promise<any> {
  const dir = getDataDir();
  const fallbackDir = path.join(process.cwd(), "..");
  const filePath = findLatestMatchingFile(dir, "sbl_skus_")
    || findLatestMatchingFile(fallbackDir, "sbl_skus_");
  
  if (!filePath) {
    return {
      skus: [],
      summary: {
        totalSKUs: 0,
        pendingSKUs: 0,
        completedSKUs: 0,
        totalLines: 0,
        pendingLines: 0
      }
    };
  }

  const rows = readFirstSheetAsJson(filePath);
  const skus: any[] = [];
  let totalSKUs = 0;
  let pendingSKUs = 0;
  let completedSKUs = 0;
  let totalLines = 0;
  let pendingLines = 0;

  for (const r of rows as any[]) {
    const sku = String(r.sku || r.SKU || "").trim();
    const stationCode = String(r.station_code || r.station || "").trim();
    const totalLinesForSKU = Number(r.total_lines || r.total_line_count || 0) || 0;
    const pendingLinesForSKU = Number(r.pending_lines || r.pending_line_count || 0) || 0;
    const completedLinesForSKU = totalLinesForSKU - pendingLinesForSKU;
    const status = String(r.status || "pending").toLowerCase();

    if (!sku || !stationCode) continue;

    const isCompleted = status === 'completed' || pendingLinesForSKU === 0;
    const isPending = !isCompleted;

    skus.push({
      sku: sku,
      station_code: stationCode,
      total_lines: totalLinesForSKU,
      pending_lines: pendingLinesForSKU,
      completed_lines: completedLinesForSKU,
      completion_pct: totalLinesForSKU > 0 ? completedLinesForSKU / totalLinesForSKU : 0,
      status: isCompleted ? 'completed' : 'pending',
      priority: String(r.priority || r.Priority || "normal").toLowerCase()
    });

    totalSKUs++;
    if (isCompleted) completedSKUs++;
    if (isPending) pendingSKUs++;
    totalLines += totalLinesForSKU;
    pendingLines += pendingLinesForSKU;
  }

  return {
    skus,
    summary: {
      totalSKUs,
      pendingSKUs,
      completedSKUs,
      totalLines,
      pendingLines,
      completionRate: totalSKUs > 0 ? completedSKUs / totalSKUs : 0
    }
  };
}

export async function getSecondarySortationFromFile(): Promise<any> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "secondary_sortation_")
		|| findLatestMatchingFile(fallbackDir, "secondary_sortation_");
	
	if (!filePath) {
		return {
			records: [],
			summary: {
				totalRecords: 0,
				totalCrates: 0,
				totalQC: 0
			}
		};
	}
	
	const rows = readFirstSheetAsJson(filePath);
	const records: any[] = [];
	let totalCrates = 0;
	let totalQC = 0;
	
	for (const r of rows as any[]) {
		const mmTrip = String(r.mm_trip || "").trim();
		const totalCrateCount = Number(r.total_crate_count || 0) || 0;
		const palletizedCrateCount = Number(r.palletized_crate_count || 0) || 0;
		const qcCount = Number(r.number_of_chu_at_qc || 0) || 0;
		
		if (!mmTrip) continue;
		
		records.push({
			mm_trip: mmTrip,
			total_crate_count: totalCrateCount,
			palletized_crate_count: palletizedCrateCount,
			number_of_chu_at_qc: qcCount
		});
		
		totalCrates += totalCrateCount;
		totalQC += qcCount;
	}
	
	return {
		records,
		summary: {
			totalRecords: records.length,
			totalCrates,
			totalQC
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
	let totalValue = 0;
	let completedValue = 0;
	let totalValueCompletion = 0;
	
	for (const r of rows as any[]) {
		// Use actual column names from line completion Excel file
		const code = String(r.code || "").trim();
		const totalDemandLines = Number(r.total_demand_lines || 0) || 0;
		const totalPackedLines = Number(r.total_demand_packed_lines || 0) || 0;
		const completionPercentage = parseFloat(String(r.line_completion_percentage || "0").replace('%', '')) || 0;
		
		// New value-related columns
		const stationTotalValue = Number(r.total_value || 0) || 0;
		const stationCompletedValue = Number(r.completed_value || 0) || 0;
		const valueCompletionPercentage = parseFloat(String(r.value_completion_percentage || "0").replace('%', '')) || 0;
		
		if (!code) continue;
		
		stations.push({
			code,
			totalDemandLines,
			totalPackedLines,
			completionPercentage,
			pendingLines: totalDemandLines - totalPackedLines,
			totalValue: stationTotalValue,
			completedValue: stationCompletedValue,
			valueCompletionPercentage,
			pendingValue: stationTotalValue - stationCompletedValue
		});
		
		totalCompletion += completionPercentage;
		totalValue += stationTotalValue;
		completedValue += stationCompletedValue;
		totalValueCompletion += valueCompletionPercentage;
		if (completionPercentage >= 100) completedStations++;
	}
	
	const averageCompletion = stations.length > 0 ? totalCompletion / stations.length : 0;
	const averageValueCompletion = stations.length > 0 ? totalValueCompletion / stations.length : 0;
	
	return {
		stations,
		summary: {
			totalStations: stations.length,
			averageCompletion: Math.round(averageCompletion * 100) / 100,
			completedStations,
			totalValue: Math.round(totalValue * 100) / 100,
			completedValue: Math.round(completedValue * 100) / 100,
			pendingValue: Math.round((totalValue - completedValue) * 100) / 100,
			averageValueCompletion: Math.round(averageValueCompletion * 100) / 100,
			valueCompletionPercentage: totalValue > 0 ? Math.round((completedValue / totalValue) * 100 * 100) / 100 : 0
		}
	};
}

export async function getSBLInfeedFromFile(): Promise<{ skus: any[], hus: any[] }> {
	const dir = getDataDir();
	const fallbackDir = path.join(process.cwd(), "..");
	const filePath = findLatestMatchingFile(dir, "partial_hus_pending_based_on_gtp_demand")
		|| findLatestMatchingFile(dir, "partial_hus_pending")
		|| findLatestMatchingFile(dir, "sbl_infeed")
		|| findLatestMatchingFile(dir, "infeed")
		|| findLatestMatchingFile(fallbackDir, "partial_hus_pending_based_on_gtp_demand")
		|| findLatestMatchingFile(fallbackDir, "partial_hus_pending")
		|| findLatestMatchingFile(fallbackDir, "sbl_infeed")
		|| findLatestMatchingFile(fallbackDir, "infeed");
	
	console.log('[DEBUG] SBL Infeed file path:', filePath);
	
	if (!filePath) {
		console.log('[DEBUG] No SBL infeed file found');
		return { skus: [], hus: [] };
	}
	
	const rows = readFirstSheetAsJson(filePath);
	console.log('[DEBUG] SBL Infeed rows count:', rows.length);
	console.log('[DEBUG] SBL Infeed first row keys:', rows.length > 0 ? Object.keys(rows[0]) : 'No rows');
	
	const skus: any[] = [];
	const hus: any[] = [];
	
	for (const r of rows as any[]) {
		const skuCode = String(r.sku_code || "").trim();
		const huCode = String(r.hu_code || "").trim();
		
		if (!skuCode || !huCode) continue;
		
		// Normalize feed status
		const feedStatus = String(r.feed_status || "").toUpperCase();
		const normalizedFeedStatus = feedStatus === 'FED' ? 'FED' : 'NOT_FED';
		
		// Normalize inclusion status
		const inclusionStatus = String(r.inclusionStatus || "").toUpperCase();
		const normalizedInclusionStatus = inclusionStatus === 'INCLUDED' ? 'INCLUDED' : 
			inclusionStatus === 'LOCKED' ? 'LOCKED' : 
			inclusionStatus === 'BLOCKED' ? 'BLOCKED' : 'EXCLUDED';
		
		// Normalize bin status
		const binStatus = String(r.bin_status || "").toUpperCase();
		const normalizedBinStatus = binStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
		
		// Calculate age in minutes
		let updatedAt = r.updatedAt || r.timestamp || new Date().toISOString();
		
		// Handle Excel date serial numbers
		if (typeof updatedAt === 'number') {
			// Convert Excel date serial number to JavaScript Date
			const excelEpoch = new Date(1900, 0, 1);
			const excelDate = new Date(excelEpoch.getTime() + (updatedAt - 2) * 24 * 60 * 60 * 1000);
			updatedAt = excelDate.toISOString();
		}
		
		const ageMinutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60));
		
		// Add HU data
		hus.push({
			hu_code: huCode,
			sku_code: skuCode,
			qty: Number(r.qty || 0),
			bin_code: String(r.bin_code || ""),
			feed_status: normalizedFeedStatus,
			blocked_status: Boolean(r.blocked_status),
			inclusionStatus: normalizedInclusionStatus,
			updatedAt: updatedAt,
			age_minutes: ageMinutes,
			bin_status: normalizedBinStatus,
			// Additional fields for reference
			sku_code_1: String(r['sku_code.1'] || ""),
			batch: String(r.batch || ""),
			batch_1: String(r['batch.1'] || ""),
			uom: String(r.uom || ""),
			bucket: String(r.bucket || ""),
			value_pending: Number(r.value_pending || 0)
		});
		
		// Add SKU data (we'll aggregate this later)
		skus.push({
			sku_code: skuCode,
			batch: String(r.batch || ""),
			demand_qty: Number(r.demand_qty || 0),
			packed_qty: Number(r.packed_qty || 0),
			pending_qty: Number(r.pending_qty || 0),
			total_demand_lines: Number(r.total_demand_lines || 0),
			demand_packed_lines: Number(r.demand_packed_lines || 0),
			pending_lines: Number(r.pending_lines || 0),
			value_pending: Number(r.value_pending || 0),
			// Additional fields for reference
			sku_code_1: String(r['sku_code.1'] || ""),
			uom: String(r.uom || ""),
			bucket: String(r.bucket || "")
		});
	}
	
	console.log('[DEBUG] SBL Infeed processed - SKUs:', skus.length, 'HUs:', hus.length);
	return { skus, hus };
}