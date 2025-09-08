import { ProcessedMacros } from './macros-processor';
import { STAGE_TARGETS, THRESHOLDS, HEALTH_COLORS } from '../config/stage-targets';

// Dashboard-first artifacts - computed on upload for fast UI rendering
export interface OverallSummary {
  projected_finish_iso: string;
  buffer_minutes: number;
  otif_risk: 'LOW' | 'MEDIUM' | 'HIGH';
  line_coverage_pct: number;
  value_coverage_pct?: number;
  wave_status: 'ON_TRACK' | 'AT_RISK' | 'LATE';
  // Enhanced coverage data
  sbl_coverage_pct?: number;
  ptl_coverage_pct?: number;
}

export interface SBLStation {
  station_code: string;
  total: number;
  packed: number;
  remaining: number;
  completion_pct: number;
  last10_lph: number;
  target_lph: number;
  starved: boolean;
  health_color: 'green' | 'amber' | 'red';
  // Enhanced infeed analysis
  recent_infeed_lph?: number;
  is_productivity_issue?: boolean;
  is_infeed_issue?: boolean;
  issue_type?: 'infeed' | 'productivity' | 'none';
}

export interface SBLStream {
  ema_lph: number;
  last_hour_avg: number;
  slope: number;
  trend: 'up' | 'down' | 'stable';
  health_color: 'green' | 'amber' | 'red';
}

export interface PTLStream {
  ema_lph: number;
  last_hour_avg: number;
  slope: number;
  trend: 'up' | 'down' | 'stable';
  shortfall: boolean;
  shortfall_factor: number;
  health_color: 'green' | 'amber' | 'red';
}

export interface PTLTotals {
  last_hour_lines: number;
  by_station: Array<{
    station_code: string;
    lines_last_hour: number;
    productivity: number;
  }>;
  leaderboard: {
    top: Array<{ station_code: string; lines_last_hour: number; productivity: number }>;
    bottom: Array<{ station_code: string; lines_last_hour: number; productivity: number }>;
  };
}

export interface TripRisk {
  mm_trip: string;
  sorted_pct: number;
  staged_pct: number;
  loaded_pct: number;
  qc_ratio: number;
  dockdoorQueue: number;
  risk: number;
  risk_factors: {
    behind_sorted: number;
    qc_ratio: number;
    door_norm: number;
    trend_down: number;
  };
  health_color: 'green' | 'amber' | 'red';
}

export interface DashboardArtifacts {
  overall_summary: OverallSummary;
  sbl_stations: SBLStation[];
  sbl_stream: SBLStream;
  ptl_stream: PTLStream;
  ptl_totals: PTLTotals;
  trips: TripRisk[];
  sbl_skus: any;
  calculation_timestamp: string;
  macros: ProcessedMacros;
}

// Helper functions for health color determination
export function getHealthColor(value: number, target: number, thresholds = HEALTH_COLORS): 'green' | 'amber' | 'red' {
  const ratio = value / target;
  if (ratio >= thresholds.green.threshold) return 'green';
  if (ratio >= thresholds.amber.threshold) return 'amber';
  return 'red';
}

export function getOTIFRisk(bufferMinutes: number, thresholds = THRESHOLDS): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (bufferMinutes >= thresholds.buffer_floor_minutes_global) return 'LOW';
  if (bufferMinutes >= thresholds.buffer_floor_minutes_global * 0.5) return 'MEDIUM';
  return 'HIGH';
}

export function calculateSimpleMovingAverage(values: number[], window: number = 6): number {
  if (values.length === 0) return 0;
  const recentValues = values.slice(-window);
  return recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
}

export function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const recent = values.slice(-3); // Last 3 points
  if (recent.length < 2) return 0;
  
  const first = recent[0];
  const last = recent[recent.length - 1];
  return (last - first) / (recent.length - 1);
}
