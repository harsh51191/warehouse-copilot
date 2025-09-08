import { STAGE_TARGETS, THRESHOLDS } from '../config/stage-targets';

export interface WaveMacros {
  wave_id: string;
  start_time_iso: string;
  cutoff_time_iso: string;
  total_orders: number;
  total_order_lines: number;
  total_order_value?: number;
  split_lines_sbl?: number;
  split_lines_ptl?: number;
  split_lines_fc?: number;
}

export interface ProcessedMacros {
  waveInfo: WaveMacros;
  stageTargets: typeof STAGE_TARGETS;
  thresholds: typeof THRESHOLDS;
  startTime: Date;
  cutoffTime: Date;
  expectedDuration: {
    sbl: number; // hours
    ptl: number; // hours
    total: number; // hours
  };
}

export function processMacros(macros: WaveMacros): ProcessedMacros {
  const startTime = new Date(macros.start_time_iso);
  const cutoffTime = new Date(macros.cutoff_time_iso);
  
  // Calculate expected durations based on stage targets
  const sblDuration = STAGE_TARGETS.SBL.expected_duration_hours;
  const ptlDuration = STAGE_TARGETS.PTL.expected_duration_hours;
  const totalDuration = Math.max(sblDuration, ptlDuration, 7.5); // Max of all stages
  
  return {
    waveInfo: macros,
    stageTargets: STAGE_TARGETS,
    thresholds: THRESHOLDS,
    startTime,
    cutoffTime,
    expectedDuration: {
      sbl: sblDuration,
      ptl: ptlDuration,
      total: totalDuration
    }
  };
}

export function validateMacros(macros: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!macros.wave_id) errors.push('Missing wave_id');
  if (!macros.start_time_iso) errors.push('Missing start_time_iso');
  if (!macros.cutoff_time_iso) errors.push('Missing cutoff_time_iso');
  if (!macros.total_orders || macros.total_orders <= 0) errors.push('Invalid total_orders');
  if (!macros.total_order_lines || macros.total_order_lines <= 0) errors.push('Invalid total_order_lines');
  
  // Validate ISO dates
  try {
    new Date(macros.start_time_iso);
  } catch {
    errors.push('Invalid start_time_iso format');
  }
  
  try {
    new Date(macros.cutoff_time_iso);
  } catch {
    errors.push('Invalid cutoff_time_iso format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
