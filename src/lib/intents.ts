export interface IntentParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: any;
  description: string;
}

export interface Intent {
  id: string;
  description: string;
  examples?: string[]; // Made optional for dynamic approach
  parameters: IntentParam[];
  excelGlob: string;
  uiHints: {
    highlight?: string[];
    focus?: string;
  };
}

export const INTENTS: Record<string, Intent> = {
  loading_status: {
    id: 'loading_status',
    description: 'Get loading status and trip progress information',
    examples: [],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid', 'WaveSummary']
    }
  },
  
  sbl_prod_timeline: {
    id: 'sbl_prod_timeline',
    description: 'Get SBL productivity timeline data',
    examples: [
      'SBL trend for wave 3',
      'Show SBL productivity over time',
      'How is SBL performing?',
      'SBL productivity timeline'
    ],
    parameters: [
      {
        name: 'wave_id',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      },
      {
        name: 'interval',
        type: 'string',
        required: false,
        default: '10min',
        description: 'Time interval for data points'
      }
    ],
    excelGlob: 'sbl_productivity_withtime_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend', 'ProductivityChart']
    }
  },

  ptl_prod_timeline: {
    id: 'ptl_prod_timeline',
    description: 'Get PTL productivity timeline data',
    examples: [
      'PTL trend for wave 3',
      'Show PTL productivity over time',
      'How is PTL performing?',
      'PTL productivity timeline'
    ],
    parameters: [
      {
        name: 'wave_id',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend', 'ProductivityChart']
    }
  },

  ptl_picking_status: {
    id: 'ptl_picking_status',
    description: 'Get PTL picking status and productivity',
    examples: [
      'Did PTL start picking?',
      'PTL picking status',
      'Is PTL picking?',
      'PTL productivity status',
      'How is PTL performing?'
    ],
    parameters: [
      {
        name: 'wave_id',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend', 'ProductivityChart']
    }
  },

  // Loading Progress Questions
  loading_progress_by_trip: {
    id: 'loading_progress_by_trip',
    description: 'Get loading progress by MM trip with crates sorted/staged/loaded percentages',
    examples: [
      'What\'s loading progress by MM trip right now?',
      'Show trip progress',
      'Which trips are loading?',
      'Trip loading status'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid', 'WaveSummary']
    }
  },

  dockdoor_progress: {
    id: 'dockdoor_progress',
    description: 'Get loading progress by dockdoor to identify slowest progress',
    examples: [
      'Which dockdoor has the slowest progress?',
      'Dockdoor performance',
      'Show dockdoor progress',
      'Slowest dockdoor'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  trips_below_threshold: {
    id: 'trips_below_threshold',
    description: 'List trips below 60% loaded with vehicle numbers',
    examples: [
      'List trips below 60% loaded and their vehicle numbers',
      'Which trips are behind?',
      'Show slow trips',
      'Trips below threshold'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      },
      {
        name: 'threshold',
        type: 'number',
        required: false,
        default: 60,
        description: 'Progress threshold percentage'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  case_vs_crate_progress: {
    id: 'case_vs_crate_progress',
    description: 'Compare case vs crate progress for each trip',
    examples: [
      'What\'s case vs crate progress for each trip?',
      'Show case and crate progress',
      'Compare case crate progress',
      'Case vs crate status'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  xdock_trips_eta_risk: {
    id: 'xdock_trips_eta_risk',
    description: 'Show crossdock trips and their loading ETA risk',
    examples: [
      'Show xdock trips and their loading ETA risk',
      'Crossdock ETA risk',
      'Which xdock trips are at risk?',
      'Xdock risk analysis'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  zero_crates_staged: {
    id: 'zero_crates_staged',
    description: 'Find trips with zero crates staged yet',
    examples: [
      'Which trips have zero crates staged yet?',
      'Show trips with no staging',
      'Zero staged trips',
      'Trips not staged'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  dockdoor_queue_priority: {
    id: 'dockdoor_queue_priority',
    description: 'Sort trips by dockdoor queue priority',
    examples: [
      'Sort trips by dockdoor queue priority',
      'Dockdoor queue order',
      'Show queue priority',
      'Priority trips'
    ],
    parameters: [
      {
        name: 'outbound_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Outbound session code'
      }
    ],
    excelGlob: 'updated_loading_dashboard_query_*.xlsx',
    uiHints: {
      highlight: ['TripsGrid']
    }
  },

  // SBL Productivity Questions
  sbl_wave_start_time: {
    id: 'sbl_wave_start_time',
    description: 'Get when the wave started',
    examples: [
      'When did the wave start?',
      'Wave start time',
      'When did SBL start?',
      'Wave start timestamp'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      },
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'sbl_productivity_withtime_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  sbl_active_stations: {
    id: 'sbl_active_stations',
    description: 'Get number of active SBL stations this wave',
    examples: [
      'How many active SBL stations this wave?',
      'SBL station count',
      'Active stations',
      'Station count'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      },
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'sbl_productivity_withtime_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  sbl_peak_interval: {
    id: 'sbl_peak_interval',
    description: 'Find which 10-min interval had peak SBL output',
    examples: [
      'Which 10-min interval had the peak SBL output?',
      'Peak SBL interval',
      'Best SBL performance',
      'SBL peak time'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      },
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'sbl_productivity_withtime_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  // Station Performance Questions
  sbl_station_ranking: {
    id: 'sbl_station_ranking',
    description: 'Get top/bottom SBL stations by productivity',
    examples: [
      'Who are my top SBL stations today?',
      'Who are my bottom SBL stations today?',
      'SBL station ranking',
      'Best SBL stations',
      'Worst SBL stations'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'Station Wise SBL productivity.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  station_completion_percentage: {
    id: 'station_completion_percentage',
    description: 'Get completion percentage by station',
    examples: [
      'What\'s completion % by station?',
      'Station completion rates',
      'Show completion by station',
      'Station progress'
    ],
    parameters: [
      {
        name: 'outbound',
        type: 'string',
        required: false,
        default: 'OUTBOUND',
        description: 'Outbound identifier'
      },
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'line_completion_2_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend', 'PTLTrend']
    }
  },

  stations_with_pending_lines: {
    id: 'stations_with_pending_lines',
    description: 'Find stations with more than X pending lines',
    examples: [
      'Which stations have >10 pending lines?',
      'Stations with high backlog',
      'Show pending lines by station',
      'Station backlog'
    ],
    parameters: [
      {
        name: 'outbound',
        type: 'string',
        required: false,
        default: 'OUTBOUND',
        description: 'Outbound identifier'
      },
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      },
      {
        name: 'threshold',
        type: 'number',
        required: false,
        default: 10,
        description: 'Pending lines threshold'
      }
    ],
    excelGlob: 'line_completion_2_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend', 'PTLTrend']
    }
  },

  // SBL Infeed Questions
  sbl_infeed_rate: {
    id: 'sbl_infeed_rate',
    description: 'Get SBL infeed rate over time',
    examples: [
      'What\'s our SBL infeed rate over time?',
      'SBL infeed trend',
      'Show infeed rate',
      'Infeed performance'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'sbl_infeed_rate_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  zero_feed_intervals: {
    id: 'zero_feed_intervals',
    description: 'Find intervals with zero infeed',
    examples: [
      'Which intervals had zero feed?',
      'Zero infeed intervals',
      'Show feed gaps',
      'Infeed problems'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'sbl_infeed_rate_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  infeed_starving_sbl: {
    id: 'infeed_starving_sbl',
    description: 'Check if infeed is starving SBL stations',
    examples: [
      'Is infeed starving SBL?',
      'Infeed bottleneck',
      'SBL starvation check',
      'Feed vs productivity'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'sbl_infeed_rate_*.xlsx',
    uiHints: {
      highlight: ['SBLTrend']
    }
  },

  // PTL Productivity Questions
  ptl_zone_productivity: {
    id: 'ptl_zone_productivity',
    description: 'Get PTL average productivity by zone',
    examples: [
      'What\'s PTL average productivity by zone?',
      'PTL zone performance',
      'Show PTL by zone',
      'PTL zone ranking'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  ptl_last_ten_min: {
    id: 'ptl_last_ten_min',
    description: 'Get last 10-min productivity by zone',
    examples: [
      'What\'s last 10-min productivity by zone?',
      'Recent PTL performance',
      'Last 10-min PTL',
      'Current PTL rate'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  ptl_zones_below_target: {
    id: 'ptl_zones_below_target',
    description: 'Find PTL zones below target LPH',
    examples: [
      'Which PTL zones are below target 150 LPH?',
      'PTL zones below target',
      'Underperforming PTL zones',
      'PTL target gaps'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      },
      {
        name: 'target_lph',
        type: 'number',
        required: false,
        default: 150,
        description: 'Target lines per hour'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  ptl_productivity_timeline: {
    id: 'ptl_productivity_timeline',
    description: 'Get PTL productivity over time for all zones',
    examples: [
      'PTL productivity over time (all zones)',
      'PTL timeline trend',
      'Show PTL over time',
      'PTL performance timeline'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      },
      {
        name: 'zone_code',
        type: 'string',
        required: false,
        default: '',
        description: 'Specific zone code (optional)'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  ptl_start_time: {
    id: 'ptl_start_time',
    description: 'Get when PTL started picking',
    examples: [
      'When did PTL start picking?',
      'PTL start time',
      'When did PTL begin?',
      'PTL first scan time'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  station_addition_impact: {
    id: 'station_addition_impact',
    description: 'Analyze impact of adding stations on output',
    examples: [
      'Did adding a station increase output?',
      'Station addition impact',
      'Show station effect',
      'Station productivity gain'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'ptl_productivity_*.xlsx',
    uiHints: {
      highlight: ['PTLTrend']
    }
  },

  // Crossdock ASN Questions
  asn_trip_mapping: {
    id: 'asn_trip_mapping',
    description: 'Get ASNs that drive each MM trip and their received/GRN status',
    examples: [
      'Which ASNs drive each MM trip and their received/GRN?',
      'ASN trip mapping',
      'Show ASN status by trip',
      'ASN progress'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'inbound_asn___level_progress_*.xlsx',
    uiHints: {
      highlight: ['ASNProgress']
    }
  },

  asn_lagging_receiving: {
    id: 'asn_lagging_receiving',
    description: 'Find ASNs lagging in receiving and risking outbound',
    examples: [
      'Which ASNs are lagging receiving and risk outbound?',
      'ASN receiving delays',
      'Show ASN risks',
      'Lagging ASNs'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'inbound_asn___level_progress_*.xlsx',
    uiHints: {
      highlight: ['ASNProgress']
    }
  },

  inbound_received_sufficiency: {
    id: 'inbound_received_sufficiency',
    description: 'Check if we have enough inbound received for each MM trip',
    examples: [
      'For each MM trip, do we have enough inbound received?',
      'Inbound sufficiency check',
      'Show inbound gaps',
      'Received vs required'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'inbound_progress_*.xlsx',
    uiHints: {
      highlight: ['ASNProgress']
    }
  },

  xdock_inbound_gap: {
    id: 'xdock_inbound_gap',
    description: 'Find xdock code with largest inbound gap',
    examples: [
      'Which xdock code has largest inbound gap?',
      'Xdock inbound gaps',
      'Show xdock problems',
      'Largest inbound gap'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'inbound_progress_*.xlsx',
    uiHints: {
      highlight: ['ASNProgress']
    }
  },

  // Composite Questions
  otif_tracking: {
    id: 'otif_tracking',
    description: 'Check if we are on track for OTIF for a wave',
    examples: [
      'Are we on track for OTIF for Wave 3?',
      'OTIF status check',
      'On-time delivery risk',
      'OTIF tracking'
    ],
    parameters: [
      {
        name: 'wave',
        type: 'string',
        required: false,
        default: '3',
        description: 'Wave identifier'
      }
    ],
    excelGlob: 'multiple',
    uiHints: {
      highlight: ['WaveSummary', 'SBLTrend', 'PTLTrend', 'TripsGrid']
    }
  },

  current_bottleneck: {
    id: 'current_bottleneck',
    description: 'Identify the current bottleneck in operations',
    examples: [
      'What\'s the current bottleneck?',
      'Show bottlenecks',
      'Identify constraints',
      'Current issues'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'multiple',
    uiHints: {
      highlight: ['SBLTrend', 'PTLTrend', 'TripsGrid']
    }
  },

  picker_addition_impact: {
    id: 'picker_addition_impact',
    description: 'Analyze impact of adding pickers to specific loops',
    examples: [
      'If we add 1 picker to Loop 2, what improves?',
      'Picker addition impact',
      'Staffing optimization',
      'Resource planning'
    ],
    parameters: [
      {
        name: 'loop',
        type: 'string',
        required: false,
        default: '2',
        description: 'Loop identifier'
      },
      {
        name: 'pickers',
        type: 'number',
        required: false,
        default: 1,
        description: 'Number of pickers to add'
      }
    ],
    excelGlob: 'multiple',
    uiHints: {
      highlight: ['PTLTrend', 'SBLTrend']
    }
  },

  completion_actions: {
    id: 'completion_actions',
    description: 'Suggest actions to improve completion in 30 minutes',
    examples: [
      'Which three actions get us +20% completion in 30 min?',
      'Show improvement actions',
      'Quick wins',
      'Completion boost'
    ],
    parameters: [
      {
        name: 'target_improvement',
        type: 'number',
        required: false,
        default: 20,
        description: 'Target improvement percentage'
      },
      {
        name: 'timeframe',
        type: 'number',
        required: false,
        default: 30,
        description: 'Timeframe in minutes'
      }
    ],
    excelGlob: 'multiple',
    uiHints: {
      highlight: ['WaveSummary', 'SBLTrend', 'PTLTrend', 'TripsGrid']
    }
  },

  crossdock_asn: {
    id: 'crossdock_asn',
    description: 'Get crossdock ASN level progress',
    examples: [
      'Crossdock ASN status',
      'Show ASN progress',
      'How are ASNs doing?'
    ],
    parameters: [
      {
        name: 'session_code',
        type: 'string',
        required: false,
        default: 'OUTBOUND_TODAY',
        description: 'Session code for the wave'
      }
    ],
    excelGlob: 'inbound_asn___level_progress_*.xlsx',
    uiHints: {
      highlight: ['ASNProgress', 'CrossdockStatus']
    }
  }
};

export function getIntentById(id: string): Intent | undefined {
  return INTENTS[id];
}

export function getAllIntents(): Intent[] {
  return Object.values(INTENTS);
}

export function findIntentByKeywords(question: string): Intent | undefined {
  const lower = question.toLowerCase();
  
  // Loading Progress Questions
  if (lower.includes('loading') && (lower.includes('progress') || lower.includes('trip'))) {
    if (lower.includes('dockdoor') || lower.includes('slowest')) {
      return INTENTS.dockdoor_progress;
    }
    if (lower.includes('below') || lower.includes('60%') || lower.includes('behind') || lower.includes('slow')) {
      return INTENTS.trips_below_threshold;
    }
    if (lower.includes('case') && lower.includes('crate')) {
      return INTENTS.case_vs_crate_progress;
    }
    if (lower.includes('xdock') || lower.includes('crossdock')) {
      return INTENTS.xdock_trips_eta_risk;
    }
    if (lower.includes('zero') || lower.includes('staged') || lower.includes('staging')) {
      return INTENTS.zero_crates_staged;
    }
    if (lower.includes('queue') || lower.includes('priority')) {
      return INTENTS.dockdoor_queue_priority;
    }
    return INTENTS.loading_progress_by_trip;
  }
  
  // SBL Productivity Questions
  if (lower.includes('sbl')) {
    if (lower.includes('start') || lower.includes('when did')) {
      return INTENTS.sbl_wave_start_time;
    }
    if (lower.includes('station') && (lower.includes('count') || lower.includes('active'))) {
      return INTENTS.sbl_active_stations;
    }
    if (lower.includes('peak') || lower.includes('best') || lower.includes('highest')) {
      return INTENTS.sbl_peak_interval;
    }
    if (lower.includes('ranking') || lower.includes('top') || lower.includes('bottom') || lower.includes('best') || lower.includes('worst')) {
      return INTENTS.sbl_station_ranking;
    }
    if (lower.includes('infeed') || lower.includes('feed')) {
      if (lower.includes('zero') || lower.includes('gap')) {
        return INTENTS.zero_feed_intervals;
      }
      if (lower.includes('starving') || lower.includes('bottleneck')) {
        return INTENTS.infeed_starving_sbl;
      }
      return INTENTS.sbl_infeed_rate;
    }
    if (lower.includes('trend') || lower.includes('productivity') || lower.includes('timeline')) {
      return INTENTS.sbl_prod_timeline;
    }
  }
  
  // Station Performance Questions
  if (lower.includes('station') && (lower.includes('completion') || lower.includes('%'))) {
    return INTENTS.station_completion_percentage;
  }
  if (lower.includes('pending') || lower.includes('backlog')) {
    return INTENTS.stations_with_pending_lines;
  }
  
  // PTL Productivity Questions
  if (lower.includes('ptl')) {
    if (lower.includes('start') || lower.includes('when did') || lower.includes('begin')) {
      return INTENTS.ptl_start_time;
    }
    if (lower.includes('zone') || lower.includes('average')) {
      return INTENTS.ptl_zone_productivity;
    }
    if (lower.includes('last') || lower.includes('recent') || lower.includes('current')) {
      return INTENTS.ptl_last_ten_min;
    }
    if (lower.includes('below') || lower.includes('target') || lower.includes('underperforming')) {
      return INTENTS.ptl_zones_below_target;
    }
    if (lower.includes('over time') || lower.includes('timeline') || lower.includes('trend')) {
      return INTENTS.ptl_productivity_timeline;
    }
    if (lower.includes('station') && (lower.includes('add') || lower.includes('increase'))) {
      return INTENTS.station_addition_impact;
    }
    if (lower.includes('start') || lower.includes('picking') || lower.includes('status') || lower.includes('performing')) {
      return INTENTS.ptl_picking_status;
    }
    if (lower.includes('trend') || lower.includes('productivity') || lower.includes('timeline')) {
      return INTENTS.ptl_prod_timeline;
    }
  }
  
  // Crossdock ASN Questions
  if (lower.includes('asn')) {
    if (lower.includes('trip') || lower.includes('mapping')) {
      return INTENTS.asn_trip_mapping;
    }
    if (lower.includes('lagging') || lower.includes('delay') || lower.includes('risk')) {
      return INTENTS.asn_lagging_receiving;
    }
    return INTENTS.crossdock_asn;
  }
  
  if (lower.includes('inbound') && (lower.includes('sufficient') || lower.includes('enough') || lower.includes('gap'))) {
    if (lower.includes('xdock')) {
      return INTENTS.xdock_inbound_gap;
    }
    return INTENTS.inbound_received_sufficiency;
  }
  
  // Composite Questions
  if (lower.includes('otif') || lower.includes('on track')) {
    return INTENTS.otif_tracking;
  }
  if (lower.includes('bottleneck') || lower.includes('constraint') || lower.includes('issue')) {
    return INTENTS.current_bottleneck;
  }
  if (lower.includes('picker') && (lower.includes('add') || lower.includes('loop'))) {
    return INTENTS.picker_addition_impact;
  }
  if (lower.includes('action') || lower.includes('improve') || lower.includes('completion') || lower.includes('quick win')) {
    return INTENTS.completion_actions;
  }
  
  // Fallback to basic intents
  if (lower.includes('loading') || lower.includes('trip') || lower.includes('progress')) {
    return INTENTS.loading_status;
  }
  
  if (lower.includes('asn') || lower.includes('crossdock')) {
    return INTENTS.crossdock_asn;
  }
  
  return undefined;
}
