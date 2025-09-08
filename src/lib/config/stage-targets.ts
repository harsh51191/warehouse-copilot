export interface StageTarget {
  target_lph: number;
  bucket_minutes: number;
  expected_duration_hours: number;
}

export const STAGE_TARGETS: Record<string, StageTarget> = {
  SBL: { 
    target_lph: 120, 
    bucket_minutes: 10, 
    expected_duration_hours: 2.5 
  },
  PTL: { 
    target_lph: 180, 
    bucket_minutes: 10, 
    expected_duration_hours: 2.5 
  },
  SORT: { 
    target_lph: 200, 
    bucket_minutes: 10, 
    expected_duration_hours: 7.25 
  },
  STAGE: { 
    target_lph: 150, 
    bucket_minutes: 10, 
    expected_duration_hours: 7.5 
  },
  LOAD: { 
    target_lph: 100, 
    bucket_minutes: 10, 
    expected_duration_hours: 7.0 
  }
};

export const THRESHOLDS = {
  buffer_floor_minutes_global: 20,
  buffer_floor_minutes_sbl: 15,
  buffer_floor_minutes_ptl: 15,
  buffer_floor_minutes_sort: 20,
  buffer_floor_minutes_stage: 20,
  buffer_floor_minutes_load: 20,
  risk_threshold_trip: 0.6,
  starvation_Lmin_lines: 20,
  starvation_Rmin_factor_of_target: 0.5,
  ptl_shortfall_min_factor: 0.1
};

export const HEALTH_COLORS = {
  green: { threshold: 0.95, description: 'On/above target' },
  amber: { threshold: 0.7, description: '10-30% gap' },
  red: { threshold: 0.0, description: '>30% gap or buffer below floor' }
};
