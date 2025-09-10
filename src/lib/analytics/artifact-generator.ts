import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { DashboardArtifacts, OverallSummary, SBLStation, SBLStream, PTLStream, PTLTotals, TripRisk, SBLInfeedData, SBLInfeedSKU, SBLInfeedHU, getHealthColor, getOTIFRisk, calculateSimpleMovingAverage, calculateSlope } from './dashboard-artifacts';
import { ProcessedMacros } from './macros-processor';
import { getLoadingStatusFromFile, getSBLTimelineFromFile, getPTLTimelineFromFile, getStationCompletionFromFile, getSBLTableLinesFromFile, getPTLTableLinesFromFile, getSecondarySortationFromFile, getSBLSKUsFromFile, getSBLInfeedFromFile } from '../../server/datasource/file-adapter';
import { STAGE_TARGETS, THRESHOLDS } from '../config/stage-targets';

export class ArtifactGenerator {
  private derivedDir: string;
  private logger: AnalyticsLogger;

  constructor() {
    // Use repository data directory for Vercel compatibility
    this.derivedDir = join(process.cwd(), 'data', 'derived');
    this.logger = new AnalyticsLogger();
  }


  async generateDashboardArtifacts(macros: ProcessedMacros): Promise<DashboardArtifacts> {
    this.logger.logCalculation('artifact_generation_start', { macros }, null, { timestamp: new Date().toISOString() });

    try {
      // Ensure derived directory exists
      await mkdir(this.derivedDir, { recursive: true });
      
      // Log which data directory is being used
      const dataDir = join(process.cwd(), 'data');
      console.log('[ARTIFACT_GENERATOR] Using data directory:', dataDir);
      
      // Check what files exist in the data directory
      try {
        const fs = await import('fs');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));
        console.log('[ARTIFACT_GENERATOR] Excel files found in data directory:', files);
      } catch (error) {
        console.log('[ARTIFACT_GENERATOR] Error listing files:', error);
      }

      // Load all data sources (handle missing files gracefully)
      const [loadingData, sblTimeline, ptlTimeline, stationCompletion, sblTableLines, ptlTableLines, secondarySortation, sblInfeedData] = await Promise.all([
        getLoadingStatusFromFile().catch(() => ({ byTrip: [], summary: { totalAssigned: 0, totalLoaded: 0 } })),
        getSBLTimelineFromFile().catch(() => ({ timeline: [], summary: { totalLines: 0, averageProductivity: 0 } })),
        getPTLTimelineFromFile().catch(() => ({ timeline: [], summary: { totalLines: 0, averageProductivity: 0 } })),
        getStationCompletionFromFile().catch(() => ({ stations: [], summary: { totalDemandLines: 0, totalPackedLines: 0 } })),
        getSBLTableLinesFromFile().catch(() => ({ intervals: [], summary: { totalIntervals: 0, totalLines: 0, averageLinesPerInterval: 0 } })),
        getPTLTableLinesFromFile().catch(() => ({ intervals: [], summary: { totalIntervals: 0, totalLines: 0, averageLinesPerInterval: 0 } })),
        getSecondarySortationFromFile().catch(() => ({ records: [], summary: { totalRecords: 0, totalCrates: 0, totalQC: 0 } })),
        getSBLInfeedFromFile().catch(() => ({ skus: [], hus: [] }))
      ]);

      this.logger.logCalculation('data_loaded', { 
        loadingTrips: loadingData.byTrip.length,
        sblIntervals: sblTimeline.timeline.length,
        ptlIntervals: ptlTimeline.timeline.length,
        stations: stationCompletion.stations.length,
        sblTableLinesIntervals: sblTableLines.intervals.length,
        ptlTableLinesIntervals: ptlTableLines.intervals.length,
        secondarySortationRecords: secondarySortation.records.length,
        sblInfeedSKUs: sblInfeedData.skus.length,
        sblInfeedHUs: sblInfeedData.hus.length
      }, null);

      // Generate each artifact
      const overallSummary = await this.generateOverallSummary(macros, loadingData, sblTimeline, ptlTimeline, stationCompletion, sblTableLines, ptlTableLines);
      const sblStations = await this.generateSBLStations(stationCompletion, sblTableLines);
      
      // Calculate SBL coverage from actual SBL stations data
      const sblTotalPacked = sblStations.reduce((sum, station) => sum + station.packed, 0);
      const sblTotalDemand = sblStations.reduce((sum, station) => sum + station.total, 0);
      const sblCoverage = (macros.waveInfo.split_lines_sbl || 0) > 0 ? 
        Math.min(1, sblTotalPacked / (macros.waveInfo.split_lines_sbl || 1)) : 0;
      
      // Update overall summary with correct SBL coverage
      overallSummary.sbl_coverage_pct = sblCoverage;
      const sblStream = await this.generateSBLStream(sblTimeline);
      const ptlStream = await this.generatePTLStream(ptlTimeline);
      const ptlTotals = await this.generatePTLTotals(ptlTableLines);
      const trips = await this.generateTripRisks(loadingData, secondarySortation);
      console.log('[DEBUG] Generating SBL infeed data...');
      let sblInfeed: SBLInfeedData | null = null;
      try {
        console.log('[DEBUG] About to call generateSBLInfeedData');
        sblInfeed = await generateSBLInfeedData();
        console.log('[DEBUG] SBL infeed result:', sblInfeed ? 'Data found' : 'No data');
      } catch (error) {
        console.error('[DEBUG] SBL infeed error:', error instanceof Error ? error.message : String(error));
        console.error('[DEBUG] SBL infeed stack:', error instanceof Error ? error.stack : 'No stack trace');
      }

      // Generate SKU data from SBL infeed
      const sblSKUs = {
        skus: sblInfeed?.skus || [],
        summary: {
          totalSKUs: sblInfeed?.summary?.total_skus || 0,
          pendingSKUs: sblInfeed?.skus?.filter((s: any) => s.pending_qty > 0).length || 0,
          completedSKUs: sblInfeed?.skus?.filter((s: any) => s.pending_qty === 0).length || 0,
          totalLines: sblInfeed?.skus?.reduce((sum: number, s: any) => sum + (s.pending_lines || 0), 0) || 0,
          pendingLines: sblInfeed?.skus?.reduce((sum: number, s: any) => sum + (s.pending_lines || 0), 0) || 0,
          completionRate: sblInfeed?.summary?.total_skus ? 
            (sblInfeed.skus.filter((s: any) => s.pending_qty === 0).length / sblInfeed.summary.total_skus) : 0
        }
      };

      const artifacts: DashboardArtifacts = {
        overall_summary: overallSummary,
        sbl_stations: sblStations,
        sbl_stream: sblStream,
        ptl_stream: ptlStream,
        ptl_totals: ptlTotals,
        trips: trips,
        sbl_skus: sblSKUs,
        sbl_infeed: sblInfeed,
        calculation_timestamp: new Date().toISOString(),
        macros: macros
      };

      // Save artifacts to files
      await this.saveArtifacts(artifacts);

      this.logger.logCalculation('artifact_generation_complete', null, artifacts);
      return artifacts;

    } catch (error) {
      this.logger.logCalculation('artifact_generation_error', { error: error instanceof Error ? error.message : 'Unknown error' }, null);
      throw error;
    }
  }

  private async generateOverallSummary(macros: ProcessedMacros, loadingData: any, sblTimeline: any, ptlTimeline: any, stationCompletion: any, sblTableLines: any, ptlTableLines: any): Promise<OverallSummary> {
    const now = new Date();
    const cutoffTime = macros.cutoffTime;
    
    // Calculate projected finish based on overall wave progress (SBL + PTL lines)
    const totalOrderLines = macros.waveInfo.total_order_lines || 0;
    const sblCompleted = sblTimeline.summary.totalLines || 0;
    const ptlCompleted = ptlTimeline.summary.totalLines || 0;
    const totalCompleted = sblCompleted + ptlCompleted;
    const progress = totalOrderLines > 0 ? totalCompleted / totalOrderLines : 0;
    
    let projectedFinish: Date;
    let bufferMinutes: number;
    
    if (progress > 0 && progress < 1) {
      // Simple projection: if we're X% done, we'll finish in (1-X) * remaining time
      const timeElapsed = (now.getTime() - macros.startTime.getTime()) / (1000 * 60 * 60); // hours
      const projectedTotalTime = timeElapsed / progress;
      projectedFinish = new Date(macros.startTime.getTime() + projectedTotalTime * 60 * 60 * 1000);
    } else if (progress >= 1) {
      // Already completed or over-completed
      projectedFinish = now;
    } else {
      // No progress data - use expected duration from macros
      const expectedDurationMs = macros.expectedDuration.total * 60 * 60 * 1000; // hours to ms
      projectedFinish = new Date(macros.startTime.getTime() + expectedDurationMs);
    }
    
    bufferMinutes = (cutoffTime.getTime() - projectedFinish.getTime()) / (1000 * 60);
    const otifRisk = getOTIFRisk(bufferMinutes);
    
    // Calculate SBL and PTL coverage from actual completion data
    let sblCoverage = 0;
    let ptlCoverage = 0;
    
    // SBL coverage will be calculated after SBL stations are generated
    // For now, use station completion data as fallback
    if (stationCompletion.summary.totalPackedLines > 0) {
      sblCoverage = (macros.waveInfo.split_lines_sbl || 0) > 0 ? 
        Math.min(1, stationCompletion.summary.totalPackedLines / (macros.waveInfo.split_lines_sbl || 1)) : 0;
    }
    
    // PTL coverage based on actual completion from PTL table lines vs planned lines
    if (ptlTableLines.intervals && ptlTableLines.intervals.length > 0) {
      const ptlTotalLines = ptlTableLines.intervals.reduce((sum: number, interval: any) => sum + (interval.line_count || 0), 0);
      ptlCoverage = (macros.waveInfo.split_lines_ptl || 0) > 0 ? 
        Math.min(1, ptlTotalLines / (macros.waveInfo.split_lines_ptl || 1)) : 0;
    }
    
    // Calculate overall line coverage
    const lineCoverage = sblTimeline.summary.totalLines > 0 ? 
      (sblTimeline.summary.totalLines / (macros.waveInfo.total_order_lines || sblTimeline.summary.totalLines)) : 
      (macros.waveInfo.split_lines_sbl || 0) / (macros.waveInfo.total_order_lines || 1);

    const summary: OverallSummary = {
      projected_finish_iso: projectedFinish.toISOString(),
      buffer_minutes: Math.round(bufferMinutes),
      otif_risk: otifRisk,
      line_coverage_pct: Math.min(1, lineCoverage),
      wave_status: otifRisk === 'LOW' ? 'ON_TRACK' : otifRisk === 'MEDIUM' ? 'AT_RISK' : 'LATE',
      // Enhanced coverage data
      sbl_coverage_pct: sblCoverage,
      ptl_coverage_pct: ptlCoverage
    };

    this.logger.logCalculation('overall_summary', { 
      totalOrderLines, totalCompleted, sblCompleted, ptlCompleted, progress, timeElapsed: (now.getTime() - macros.startTime.getTime()) / (1000 * 60 * 60)
    }, summary);

    return summary;
  }

  private async generateSBLStations(stationCompletion: any, sblTableLines: any): Promise<SBLStation[]> {
    const stations: SBLStation[] = [];
    const targetLPH = STAGE_TARGETS.SBL.target_lph;
    const starvationLmin = THRESHOLDS.starvation_Lmin_lines;
    const starvationRmin = targetLPH * THRESHOLDS.starvation_Rmin_factor_of_target;

    // Handle case where no station data is available
    if (!stationCompletion.stations || stationCompletion.stations.length === 0) {
      this.logger.logCalculation('sbl_stations', { stationCount: 0, note: 'No station data available' }, stations);
      return stations;
    }

    // Create lookup maps for productivity and infeed data
    const productivityMap = new Map();
    if (sblTableLines.intervals) {
      // Get unique intervals and take the last 6 intervals
      const uniqueIntervals = [...new Set(sblTableLines.intervals.map((i: any) => i.interval_no))].sort((a: any, b: any) => b - a);
      const last6Intervals = uniqueIntervals.slice(0, 6);
      
      // Calculate recent productivity from SBL table lines (last 6 intervals = 1 hour)
      for (const interval of sblTableLines.intervals) {
        if (last6Intervals.includes(interval.interval_no)) {
          const stationCode = interval.station_code;
          if (!productivityMap.has(stationCode)) {
            productivityMap.set(stationCode, { totalProductivity: 0, intervalCount: 0 });
          }
          const current = productivityMap.get(stationCode);
          current.totalProductivity += interval.productivity || 0;
          current.intervalCount += 1;
        }
      }
    }
    
    const infeedMap = new Map();
    if (sblTableLines.intervals) {
      // Get unique intervals and take the last 6 intervals
      const uniqueIntervals = [...new Set(sblTableLines.intervals.map((i: any) => i.interval_no))].sort((a: any, b: any) => b - a);
      const last6Intervals = uniqueIntervals.slice(0, 6);
      
      // Calculate recent infeed (last 6 intervals = 1 hour)
      for (const interval of sblTableLines.intervals) {
        if (last6Intervals.includes(interval.interval_no)) {
          const stationCode = interval.station_code;
          if (!infeedMap.has(stationCode)) {
            infeedMap.set(stationCode, { totalLines: 0, intervalCount: 0 });
          }
          const current = infeedMap.get(stationCode);
          current.totalLines += interval.line_count;
          current.intervalCount += 1;
        }
      }
    }

    for (const station of stationCompletion.stations) {
      const remaining = station.totalDemandLines - station.totalPackedLines;
      const completionPct = station.completionPercentage / 100; // Convert percentage to decimal (98.5 -> 0.985)
      
      // Get productivity data from sbl_table_lines
      const productivityData = productivityMap.get(station.code) || { totalProductivity: 0, intervalCount: 0 };
      const recentLPH = productivityData.intervalCount > 0 ? (productivityData.totalProductivity / productivityData.intervalCount) * 6 : 0; // Convert to hourly rate
      
      // Get infeed data (lines per hour)
      const infeedData = infeedMap.get(station.code) || { totalLines: 0, intervalCount: 0 };
      const recentInfeedLPH = infeedData.intervalCount > 0 ? (infeedData.totalLines / infeedData.intervalCount) * 6 : 0; // Convert to hourly rate
      
      const starved = remaining > starvationLmin && recentLPH < starvationRmin;
      const healthColor = getHealthColor(recentLPH, targetLPH);
      
      // Determine if issue is productivity vs infeed
      const isProductivityIssue = recentLPH < (targetLPH * 0.7); // Below 70% of target
      const isInfeedIssue = recentInfeedLPH < (targetLPH * 0.5); // Below 50% of target infeed

      stations.push({
        station_code: station.code,
        total: station.totalDemandLines,
        packed: station.totalPackedLines,
        remaining: remaining,
        completion_pct: completionPct,
        last10_lph: recentLPH,
        target_lph: targetLPH,
        starved: starved,
        health_color: healthColor,
        // Enhanced insights
        recent_infeed_lph: recentInfeedLPH,
        is_productivity_issue: isProductivityIssue,
        is_infeed_issue: isInfeedIssue,
        issue_type: isInfeedIssue ? 'infeed' : isProductivityIssue ? 'productivity' : 'none',
        // Value completion data
        total_value: station.totalValue || 0,
        completed_value: station.completedValue || 0,
        pending_value: station.pendingValue || 0,
        value_completion_pct: (station.valueCompletionPercentage || 0) / 100
      });
    }

    this.logger.logCalculation('sbl_stations', { stationCount: stations.length }, stations);
    return stations;
  }

  private async generateSBLStream(sblTimeline: any): Promise<SBLStream> {
    const productivities = sblTimeline.timeline && sblTimeline.timeline.length > 0 
      ? sblTimeline.timeline.map((t: any) => t.productivity) 
      : [];
    
    const emaLPH = productivities.length > 0 ? calculateSimpleMovingAverage(productivities) : 0;
    const lastHourAvg = productivities.length > 0 ? calculateSimpleMovingAverage(productivities, 6) : 0;
    const slope = productivities.length > 0 ? calculateSlope(productivities) : 0;
    
    const trend = slope > 5 ? 'up' : slope < -5 ? 'down' : 'stable';
    const healthColor = getHealthColor(emaLPH, STAGE_TARGETS.SBL.target_lph);

    const stream: SBLStream = {
      ema_lph: Math.round(emaLPH),
      last_hour_avg: Math.round(lastHourAvg),
      slope: Math.round(slope * 100) / 100,
      trend: trend,
      health_color: healthColor
    };

    this.logger.logCalculation('sbl_stream', { productivities, emaLPH, lastHourAvg, slope }, stream);
    return stream;
  }

  private async generatePTLStream(ptlTimeline: any): Promise<PTLStream> {
    const productivities = ptlTimeline.timeline && ptlTimeline.timeline.length > 0 
      ? ptlTimeline.timeline.map((t: any) => t.productivity) 
      : [];
    
    const emaLPH = productivities.length > 0 ? calculateSimpleMovingAverage(productivities) : 0;
    const lastHourAvg = productivities.length > 0 ? calculateSimpleMovingAverage(productivities, 6) : 0;
    const slope = productivities.length > 0 ? calculateSlope(productivities) : 0;
    
    const trend = slope > 5 ? 'up' : slope < -5 ? 'down' : 'stable';
    const targetLPH = STAGE_TARGETS.PTL.target_lph;
    const shortfallFactor = targetLPH > 0 ? (targetLPH - emaLPH) / targetLPH : 0;
    const shortfall = shortfallFactor > THRESHOLDS.ptl_shortfall_min_factor;
    const healthColor = getHealthColor(emaLPH, targetLPH);

    const stream: PTLStream = {
      ema_lph: Math.round(emaLPH),
      last_hour_avg: Math.round(lastHourAvg),
      slope: Math.round(slope * 100) / 100,
      trend: trend,
      shortfall: shortfall,
      shortfall_factor: Math.round(shortfallFactor * 100) / 100,
      health_color: healthColor
    };

    this.logger.logCalculation('ptl_stream', { productivities, emaLPH, shortfallFactor }, stream);
    return stream;
  }

  private async generatePTLTotals(ptlTableLines: any): Promise<PTLTotals> {
    // Get unique intervals and take the last 6 intervals (1 hour)
    const uniqueIntervals = [...new Set(ptlTableLines.intervals.map((i: any) => i.interval_no))].sort((a: any, b: any) => b - a);
    const last6Intervals = uniqueIntervals.slice(0, 6);
    
    // Calculate total lines and last hour totals from PTL table lines
    let totalLines = 0;
    let lastHourLines = 0;
    const stationMap = new Map();
    
    for (const interval of ptlTableLines.intervals) {
      const station = interval.station_code;
      const lineCount = interval.line_count || 0;
      
      // Add to total lines (all intervals)
      totalLines += lineCount;
      
      // Add to last hour lines (only last 6 intervals)
      if (last6Intervals.includes(interval.interval_no)) {
        lastHourLines += lineCount;
        
        if (!stationMap.has(station)) {
          stationMap.set(station, { lines: 0, productivity: 0, count: 0 });
        }
        const current = stationMap.get(station);
        current.lines += lineCount;
        current.productivity += interval.productivity || 0;
        current.count += 1;
      }
    }
    
    const byStation = Array.from(stationMap.entries()).map(([station, data]) => ({
      station_code: station,
      lines_last_hour: data.lines,
      productivity: data.count > 0 ? data.productivity / data.count : 0
    })).sort((a, b) => b.lines_last_hour - a.lines_last_hour);
    
    const leaderboard = {
      top: byStation.slice(0, 3),
      bottom: byStation.slice(-3)
    };
    
    const totals: PTLTotals = {
      total_lines: totalLines,
      last_hour_lines: lastHourLines,
      by_station: byStation,
      leaderboard: leaderboard
    };

    this.logger.logCalculation('ptl_totals', { totalLines, lastHourLines, stationCount: byStation.length }, totals);
    return totals;
  }

  private async generateTripRisks(loadingData: any, secondarySortation: any): Promise<TripRisk[]> {
    const trips: TripRisk[] = [];

    // Handle case where no trip data is available
    if (!loadingData.byTrip || loadingData.byTrip.length === 0) {
      this.logger.logCalculation('trip_risks', { tripCount: 0, note: 'No trip data available' }, trips);
      return trips;
    }

    // Create QC lookup map from secondary sortation
    const qcMap = new Map();
    if (secondarySortation.records) {
      for (const record of secondarySortation.records) {
        qcMap.set(record.mm_trip, record.number_of_chu_at_qc || 0);
      }
    }

    for (const trip of loadingData.byTrip) {
      const sortedPct = trip.total > 0 ? trip.sorted / trip.total : 0;
      const stagedPct = trip.total > 0 ? trip.staged / trip.total : 0;
      const loadedPct = trip.total > 0 ? trip.loaded / trip.total : 0;
      
      // Get QC data from secondary sortation
      const qcCount = qcMap.get(trip.trip) || 0;
      
      // Calculate risk factors
      const behindSorted = 1 - sortedPct;
      const qcRatio = trip.total > 0 ? qcCount / trip.total : 0;
      const doorNorm = (trip.dockdoorQueue || 0) / 10;
      const trendDown = 0; // Would need historical data for this
      
      const risk = 0.4 * behindSorted + 0.3 * qcRatio + 0.2 * doorNorm + 0.1 * trendDown;
      
      const healthColor = risk < 0.3 ? 'green' : risk < 0.6 ? 'amber' : 'red';

      trips.push({
        mm_trip: trip.trip,
        total: trip.total || 0,
        sorted: trip.sorted || 0,
        staged: trip.staged || 0,
        loaded: trip.loaded || 0,
        sorted_pct: Math.round(sortedPct * 100) / 100,
        staged_pct: Math.round(stagedPct * 100) / 100,
        loaded_pct: Math.round(loadedPct * 100) / 100,
        qc_ratio: Math.round(qcRatio * 100) / 100,
        dockdoorQueue: trip.dockdoorQueue || 0,
        risk: Math.round(risk * 100) / 100,
        risk_factors: {
          behind_sorted: Math.round(behindSorted * 100) / 100,
          qc_ratio: Math.round(qcRatio * 100) / 100,
          door_norm: Math.round(doorNorm * 100) / 100,
          trend_down: trendDown
        },
        health_color: healthColor
      });
    }

    this.logger.logCalculation('trip_risks', { tripCount: trips.length }, trips);
    return trips;
  }

  private async saveArtifacts(artifacts: DashboardArtifacts): Promise<void> {
    // Ensure derived directory exists
    try {
      await mkdir(this.derivedDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create derived directory:', error);
    }

    const files = [
      { name: 'overall_summary.json', data: artifacts.overall_summary },
      { name: 'sbl_stations.json', data: artifacts.sbl_stations },
      { name: 'sbl_stream.json', data: artifacts.sbl_stream },
      { name: 'ptl_stream.json', data: artifacts.ptl_stream },
      { name: 'ptl_totals.json', data: artifacts.ptl_totals },
      { name: 'trips.json', data: artifacts.trips },
      { name: 'macros.json', data: artifacts.macros },
      { name: 'dashboard_artifacts.json', data: artifacts }
    ];

    for (const file of files) {
      const filePath = join(this.derivedDir, file.name);
      await writeFile(filePath, JSON.stringify(file.data, null, 2));
    }

    this.logger.logCalculation('artifacts_saved', { fileCount: files.length }, null);
  }
}

export class AnalyticsLogger {
  private logFile: string;

  constructor() {
    // Use /tmp for Vercel compatibility in production
    const derivedDir = join(process.cwd(), 'data', 'derived');
    this.logFile = join(derivedDir, 'calculation_log.json');
  }

  async logCalculation(step: string, input: any, output: any, metadata?: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      step,
      input,
      output,
      metadata
    };

    try {
      // In a real implementation, you'd append to the log file
      // For now, we'll just console.log for debugging
      console.log(`[ANALYTICS] ${step}:`, { input, output, metadata });
    } catch (error) {
      console.error('Failed to log calculation:', error);
    }
  }
}

export async function generateSBLInfeedData(): Promise<SBLInfeedData | null> {
    console.log('[DEBUG] generateSBLInfeedData called');
    try {
      const { skus: rawSkus, hus: rawHus } = await getSBLInfeedFromFile();
      
      if (rawSkus.length === 0 || rawHus.length === 0) {
        return null;
      }

      // Aggregate SKUs by sku_code
      const skuMap = new Map<string, SBLInfeedSKU>();
      
      for (const rawSku of rawSkus) {
        const skuCode = rawSku.sku_code;
        if (!skuMap.has(skuCode)) {
          skuMap.set(skuCode, {
            sku_code: skuCode,
            batch: rawSku.batch,
            pending_qty: rawSku.pending_qty,
            pending_lines: rawSku.pending_lines,
            hu_available_count: 0,
            available_qty: 0,
            coverage_pct: 0,
            blocked_hu_count: 0,
            stale_hu_count: 0,
            top_bins: [],
            top_hus: [],
            value_pending: rawSku.value_pending,
            dq_flags: {
              sku_mismatch_on_hu: false,
              inactive_bins: false,
              blocked_but_needed: false
            }
          });
        }
      }

      // Process HUs and aggregate by SKU
      const processedHUs: SBLInfeedHU[] = [];
      const INFEED_STALE_MINUTES = 30;
      
      for (const rawHu of rawHus) {
        const hu: SBLInfeedHU = {
          hu_code: rawHu.hu_code,
          sku_code: rawHu.sku_code,
          qty: rawHu.qty,
          bin_code: rawHu.bin_code,
          feed_status: rawHu.feed_status,
          blocked_status: rawHu.blocked_status,
          inclusionStatus: rawHu.inclusionStatus,
          updatedAt: rawHu.updatedAt,
          age_minutes: rawHu.age_minutes,
          bin_status: rawHu.bin_status
        };
        
        processedHUs.push(hu);
        
        // Update SKU aggregates
        const sku = skuMap.get(rawHu.sku_code);
        if (sku) {
          // Check if HU is available for feeding
          const isAvailable = hu.feed_status === 'NOT_FED' && 
                             hu.inclusionStatus === 'INCLUDED' && 
                             !hu.blocked_status && 
                             hu.bin_status === 'ACTIVE';
          
          if (isAvailable) {
            sku.hu_available_count++;
            sku.available_qty += hu.qty;
            
            // Add to top HUs (limit to 3)
            if (sku.top_hus.length < 3) {
              sku.top_hus.push({
                hu_code: hu.hu_code,
                qty: hu.qty,
                bin_code: hu.bin_code
              });
            }
          }
          
          // Count blocked HUs
          if (hu.blocked_status) {
            sku.blocked_hu_count++;
          }
          
          // Count stale HUs
          if (hu.age_minutes > INFEED_STALE_MINUTES) {
            sku.stale_hu_count++;
          }
          
          // Track top bins
          if (!sku.top_bins.includes(hu.bin_code)) {
            sku.top_bins.push(hu.bin_code);
          }
          
          // DQ flags
          if (rawHu.sku_code_1 && rawHu.sku_code_1 !== rawHu.sku_code) {
            sku.dq_flags.sku_mismatch_on_hu = true;
          }
          if (hu.bin_status !== 'ACTIVE') {
            sku.dq_flags.inactive_bins = true;
          }
          if (hu.blocked_status && sku.pending_qty > 0) {
            sku.dq_flags.blocked_but_needed = true;
          }
        }
      }
      
      // Calculate coverage percentages and finalize SKUs
      const finalSkus: SBLInfeedSKU[] = [];
      for (const sku of skuMap.values()) {
        sku.coverage_pct = sku.pending_qty > 0 ? 
          Math.min(sku.available_qty, sku.pending_qty) / sku.pending_qty * 100 : 0;
        
        // Limit top_bins to 3
        sku.top_bins = sku.top_bins.slice(0, 3);
        
        finalSkus.push(sku);
      }
      
      // Sort SKUs by coverage percentage (lowest first)
      finalSkus.sort((a, b) => a.coverage_pct - b.coverage_pct);
      
      // Calculate summary
      const totalSkus = finalSkus.length;
      const totalHus = processedHUs.length;
      const avgCoveragePct = totalSkus > 0 ? 
        finalSkus.reduce((sum, s) => sum + s.coverage_pct, 0) / totalSkus : 0;
      const lowCoverageSkus = finalSkus.filter(s => s.coverage_pct < 50).length;
      const blockedHus = processedHUs.filter(h => h.blocked_status).length;
      const staleHus = processedHUs.filter(h => h.age_minutes > INFEED_STALE_MINUTES).length;
      
      return {
        skus: finalSkus,
        hus: processedHUs,
        summary: {
          total_skus: totalSkus,
          total_hus: totalHus,
          avg_coverage_pct: Math.round(avgCoveragePct * 100) / 100,
          low_coverage_skus: lowCoverageSkus,
          blocked_hus: blockedHus,
          stale_hus: staleHus
        }
      };
      
    } catch (error) {
      console.error('Error generating SBL infeed data:', error);
      return null;
    }
  }
