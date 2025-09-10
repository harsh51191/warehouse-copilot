import { DataStorage } from './storage';
import { readFirstSheetAsJsonFromBuffer } from './xlsx';

export class StorageAdapter {
  private storage: DataStorage;

  constructor() {
    this.storage = DataStorage.getInstance();
  }

  async getLoadingStatus(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'updated_loading_dashboard_query');
    if (!file) return { byTrip: [], summary: { totalAssigned: 0, totalLoaded: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process loading status data
    return {
      byTrip: data.map((row: any) => ({
        trip: row.mm_trip,
        sorted: row.sorted || 0,
        staged: row.staged || 0,
        loaded: row.loaded || 0,
        total: row.total || 0,
        qc: row.qc || 0,
        vehicleNo: row.vehicle_no,
        casesLoaded: row.cases_loaded,
        casesStaged: row.cases_staged,
        xdock: row.xdock,
        dockdoorQueue: row.dockdoor_queue
      })),
      summary: {
        totalAssigned: data.reduce((sum: number, row: any) => sum + (row.total || 0), 0),
        totalLoaded: data.reduce((sum: number, row: any) => sum + (row.loaded || 0), 0),
        totalPending: data.reduce((sum: number, row: any) => sum + ((row.total || 0) - (row.loaded || 0)), 0)
      }
    };
  }

  async getSBLTimeline(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'sbl_productivity');
    if (!file) return { timeline: [], summary: { totalLines: 0, averageProductivity: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process SBL timeline data
    const timeline = data.map((row: any) => ({
      interval: row.interval_no,
      productivity: row.productivity || 0,
      lines: row.lines || 0,
      stations: row.stations || 0
    }));

    const totalLines = timeline.reduce((sum: number, row: any) => sum + row.lines, 0);
    const averageProductivity = timeline.reduce((sum: number, row: any) => sum + row.productivity, 0) / timeline.length;

    return {
      timeline,
      summary: {
        peakProductivity: Math.max(...timeline.map((row: any) => row.productivity)),
        peakInterval: timeline.find((row: any) => row.productivity === Math.max(...timeline.map((r: any) => r.productivity)))?.interval || '',
        averageProductivity,
        totalLines
      }
    };
  }

  async getPTLTimeline(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'ptl_productivity');
    if (!file) return { timeline: [], summary: { totalLines: 0, averageProductivity: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process PTL timeline data
    const timeline = data.map((row: any) => ({
      interval: row.interval_no,
      productivity: row.productivity || 0,
      lines: row.lines || 0,
      stations: row.stations || 0
    }));

    const totalLines = timeline.reduce((sum: number, row: any) => sum + row.lines, 0);
    const averageProductivity = timeline.reduce((sum: number, row: any) => sum + row.productivity, 0) / timeline.length;

    return {
      timeline,
      summary: {
        peakProductivity: Math.max(...timeline.map((row: any) => row.productivity)),
        peakInterval: timeline.find((row: any) => row.productivity === Math.max(...timeline.map((r: any) => r.productivity)))?.interval || '',
        averageProductivity,
        totalLines
      }
    };
  }

  async getStationCompletion(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'sbl_productivity');
    if (!file) return { stations: [], summary: { totalDemandLines: 0, totalPackedLines: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process station completion data
    const stations = data.map((row: any) => ({
      station_code: row.station_code,
      total: row.total || 0,
      packed: row.packed || 0,
      remaining: (row.total || 0) - (row.packed || 0),
      completion_pct: (row.packed || 0) / (row.total || 1)
    }));

    const totalDemandLines = stations.reduce((sum: number, row: any) => sum + row.total, 0);
    const totalPackedLines = stations.reduce((sum: number, row: any) => sum + row.packed, 0);

    return {
      stations,
      summary: {
        totalDemandLines,
        totalPackedLines
      }
    };
  }

  async getSBLTableLines(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'sbl_table_lines');
    if (!file) return { intervals: [], summary: { totalIntervals: 0, totalLines: 0, averageLinesPerInterval: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process SBL table lines data
    const intervals = data.map((row: any) => ({
      interval: row.interval_no,
      lines: row.lines || 0,
      stations: row.stations || 0
    }));

    const totalLines = intervals.reduce((sum: number, row: any) => sum + row.lines, 0);
    const averageLinesPerInterval = totalLines / intervals.length;

    return {
      intervals,
      summary: {
        totalIntervals: intervals.length,
        totalLines,
        averageLinesPerInterval
      }
    };
  }

  async getPTLTableLines(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'ptl_table_lines');
    if (!file) return { intervals: [], summary: { totalIntervals: 0, totalLines: 0, averageLinesPerInterval: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process PTL table lines data
    const intervals = data.map((row: any) => ({
      interval: row.interval_no,
      lines: row.lines || 0,
      stations: row.stations || 0
    }));

    const totalLines = intervals.reduce((sum: number, row: any) => sum + row.lines, 0);
    const averageLinesPerInterval = totalLines / intervals.length;

    return {
      intervals,
      summary: {
        totalIntervals: intervals.length,
        totalLines,
        averageLinesPerInterval
      }
    };
  }

  async getSecondarySortation(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'secondary_sortation');
    if (!file) return { records: [], summary: { totalRecords: 0, totalCrates: 0, totalQC: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process secondary sortation data
    const records = data.map((row: any) => ({
      record: row,
      // Add any specific processing needed
    }));

    const totalCrates = records.reduce((sum: number, row: any) => sum + (row.record.crates || 0), 0);
    const totalQC = records.reduce((sum: number, row: any) => sum + (row.record.qc || 0), 0);

    return {
      records,
      summary: {
        totalRecords: records.length,
        totalCrates,
        totalQC
      }
    };
  }

  async getSBLSKUs(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'sbl_productivity');
    if (!file) return { skus: [], summary: { totalSKUs: 0, pendingSKUs: 0, completedSKUs: 0, totalLines: 0, pendingLines: 0, completionRate: 0 } };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process SBL SKUs data
    const skus = data.map((row: any) => ({
      sku_code: row.sku_code,
      total: row.total || 0,
      packed: row.packed || 0,
      remaining: (row.total || 0) - (row.packed || 0)
    }));

    const totalSKUs = skus.length;
    const pendingSKUs = skus.filter((row: any) => row.remaining > 0).length;
    const completedSKUs = skus.filter((row: any) => row.remaining === 0).length;
    const totalLines = skus.reduce((sum: number, row: any) => sum + row.total, 0);
    const pendingLines = skus.reduce((sum: number, row: any) => sum + row.remaining, 0);
    const completionRate = totalLines > 0 ? (totalLines - pendingLines) / totalLines : 0;

    return {
      skus,
      summary: {
        totalSKUs,
        pendingSKUs,
        completedSKUs,
        totalLines,
        pendingLines,
        completionRate
      }
    };
  }

  async getSBLInfeed(): Promise<any> {
    const files = await this.storage.getBestAvailableFiles();
    const file = files.find(f => f.detectedType === 'partial_hus_pending_based_on_gtp_demand');
    if (!file) return { skus: [], hus: [] };

    const data = await readFirstSheetAsJsonFromBuffer(file.buffer);
    // Process SBL infeed data
    const skus = data.map((row: any) => ({
      sku_code: row.sku_code,
      batch: row.batch,
      demand_qty: row.demand_qty || 0,
      packed_qty: row.packed_qty || 0,
      pending_qty: row.pending_qty || 0,
      total_demand_lines: row.total_demand_lines || 0,
      demand_packed_lines: row.demand_packed_lines || 0,
      pending_lines: row.pending_lines || 0,
      value_pending: row.value_pending || 0
    }));

    const hus = data.map((row: any) => ({
      hu_code: row.hu_code,
      bin_code: row.bin_code,
      sku_code: row.sku_code,
      uom: row.uom,
      bucket: row.bucket,
      batch: row.batch,
      qty: row.qty || 0,
      bin_status: row.bin_status,
      inclusionStatus: row.inclusionStatus,
      updatedAt: row.updatedAt,
      blocked_status: row.blocked_status,
      timestamp: row.timestamp,
      feed_status: row.feed_status
    }));

    return { skus, hus };
  }
}
