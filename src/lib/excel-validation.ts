export interface ExcelValidationSchema {
  filename: string;
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
}

export const EXCEL_SCHEMAS: Record<string, ExcelValidationSchema> = {
  'wave_macros': {
    filename: 'wave_macros',
    requiredColumns: [
      'wave_id', 'start_time_iso', 'cutoff_time_iso', 'total_orders', 'total_order_lines'
    ],
    optionalColumns: [
      'total_order_value', 'split_lines_sbl', 'split_lines_ptl', 'split_lines_fc'
    ],
    description: 'Wave Macros - Single source of truth for wave parameters'
  },
  'updated_loading_dashboard_query': {
    filename: 'updated_loading_dashboard_query',
    requiredColumns: [
      'mm_trip', 'vehicleNo', 'vehicleType', 'dockdoor', 'dockdoorQueue', 
      'xdock', 'total_crate_count', 'crates_sorted', 'crates_staged', 'crates_loaded'
    ],
    optionalColumns: [
      'progress', 'cases_staged', 'cases_loaded', 'case_progress'
    ],
    description: 'Loading Dashboard Query'
  },
  'inbound_asn_level_progress': {
    filename: 'inbound_asn_level_progress',
    requiredColumns: [
      'ts.mm_trip', 'xdock_code', 'ts.dockdoor', 'ts.vehicle_no', 'asn_no', 
      'sku_count', 'asn_quantity', 'received_qty', 'grnd_quantity'
    ],
    optionalColumns: [],
    description: 'Cross-dock Progress'
  },
  'inbound_progress': {
    filename: 'inbound_progress',
    requiredColumns: [
      'ts.mm_trip', 'xdock_code', 'ts.dockdoor', 'ts.vehicle_no', 'asn_count', 
      'asn_quantity', 'received_qty', 'grnd_quantity'
    ],
    optionalColumns: [],
    description: 'Cross-dock Progress (MM Trip Level)'
  },
  'line_completion_2': {
    filename: 'line_completion_2',
    requiredColumns: [
      'code', 'total_demand_lines', 'total_demand_packed_lines'
    ],
    optionalColumns: [
      'completion_percentage'
    ],
    description: 'SBL line completion'
  },
  'ptl_productivity': {
    filename: 'ptl_productivity',
    requiredColumns: [
      'interval_no', 'productivity'
    ],
    optionalColumns: [
      'first_scan_time'
    ],
    description: 'Overall PTL Productivity in lines per hour for every 10 minutes interval'
  },
  'ptl_table_lines': {
    filename: 'ptl_table_lines',
    requiredColumns: [
      'interval_no', 'zone_code', 'line_count', 'productivity'
    ],
    optionalColumns: [],
    description: 'PTL Productivity in lines per hour for every 10 minutes interval per station'
  },
  'sbl_infeed_rate': {
    filename: 'sbl_infeed_rate',
    requiredColumns: [
      'Interval (10 Mins)', 'Cartons'
    ],
    optionalColumns: [],
    description: 'SBL Infeed Rate'
  },
  'sbl_productivity': {
    filename: 'sbl_productivity',
    requiredColumns: [
      'interval_no', 'total_line_count', 'productivity'
    ],
    optionalColumns: [
      'wave_number'
    ],
    description: 'SBL Productivity in lines per hour for every 10 minutes interval'
  },
  'station_wise_sbl_productivity': {
    filename: 'station_wise_sbl_productivity',
    requiredColumns: [
      'interval_no', 'zone_code', 'total_line_count', 'productivity'
    ],
    optionalColumns: [],
    description: 'Station Wise SBL Productivity per hour over every 10 minutes interval'
  },
  'sbl_table_lines': {
    filename: 'sbl_table_lines',
    requiredColumns: [
      'interval_no', 'zone_code', 'total_line_count', 'productivity'
    ],
    optionalColumns: [],
    description: 'SBL station-wise picks done in 10-minute intervals with productivity'
  },
  'secondary_sortation': {
    filename: 'secondary_sortation',
    requiredColumns: [
      'arm', 'bin_code', 'mm_trip', 'lm_trip',
      'total_crate_count', 'palletized_crate_count',
      'closed_crate_count', 'packing_crate_count',
      'number_of_chu_at_qc', 'expected_crate_count',
      'lm_trip_palletization_progress'
    ],
    optionalColumns: [],
    description: 'Secondary Sortation Query'
  },
  'partial_hus_pending_based_on_gtp_demand': {
    filename: 'partial_hus_pending_based_on_gtp_demand',
    requiredColumns: [
      'sku_code', 'demand_qty', 'packed_qty', 'pending_qty', 'total_demand_lines', 
      'demand_packed_lines', 'pending_lines', 'hu_code', 'bin_code', 'qty', 
      'feed_status', 'updatedAt'
    ],
    optionalColumns: [
      'batch', 'value_pending', 'sku_code.1', 'uom', 'bucket', 'batch.1', 
      'bin_status', 'inclusionStatus', 'blocked_status', 'timestamp'
    ],
    description: 'Partial HUs Pending Based on GTP Demand - SKU coverage and HU availability'
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType: string | null;
}

export function validateExcelFile(file: File, content: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!content || content.length === 0) {
    return {
      isValid: false,
      errors: ['File is empty or could not be read'],
      warnings: [],
      detectedType: null
    };
  }

  // Get column names from first row
  const columns = Object.keys(content[0] || {});
  
  // Try to detect file type based on filename FIRST
  const detectedType = detectFileType(file.name);
  if (!detectedType) {
    const availableTypes = Object.keys(EXCEL_SCHEMAS).map(key => EXCEL_SCHEMAS[key].filename).join(', ');
    return {
      isValid: false,
      errors: [`File name does not match any expected pattern: ${file.name}. Expected patterns: ${availableTypes}`],
      warnings: [],
      detectedType: null
    };
  }

  // Handle ignored file types
  if (detectedType === 'ignored') {
    return {
      isValid: true,
      errors: [],
      warnings: [`File ${file.name} is ignored and will not be processed`],
      detectedType: 'ignored'
    };
  }

  const schema = EXCEL_SCHEMAS[detectedType];
  
  // Check required columns
  for (const requiredCol of schema.requiredColumns) {
    if (!columns.includes(requiredCol)) {
      errors.push(`Missing required column: ${requiredCol}`);
    }
  }

  // Check for optional columns and warn if missing
  for (const optionalCol of schema.optionalColumns) {
    if (!columns.includes(optionalCol)) {
      warnings.push(`Missing optional column: ${optionalCol}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    detectedType
  };
}

function detectFileType(filename: string): string | null {
  const lowerName = filename.toLowerCase();
  
  // Ignore these file types completely
  if (lowerName.includes('ptl_summary') || lowerName.includes('sbl_summary')) {
    return 'ignored';
  }
  
  // Check for exact matches first
  for (const [key, schema] of Object.entries(EXCEL_SCHEMAS)) {
    if (lowerName.includes(schema.filename)) {
      return key;
    }
  }
  
  // Check for wave_macros specifically
  if (lowerName.includes('wave_macros') || lowerName.includes('macros')) {
    return 'wave_macros';
  }
  
  // Check for variations and patterns
  if (lowerName.includes('loading_dashboard')) return 'updated_loading_dashboard_query';
  if (lowerName.includes('inbound_asn') && lowerName.includes('level')) return 'inbound_asn_level_progress';
  if (lowerName.includes('inbound_progress') && !lowerName.includes('asn')) return 'inbound_progress';
  if (lowerName.includes('line_completion')) return 'line_completion_2';
  if (lowerName.includes('ptl_productivity') && !lowerName.includes('table')) return 'ptl_productivity';
  if (lowerName.includes('ptl_table') && lowerName.includes('lines')) return 'ptl_table_lines';
  if (lowerName.includes('sbl_infeed_rate')) return 'sbl_infeed_rate';
  if (lowerName.includes('sbl_productivity') && !lowerName.includes('table') && !lowerName.includes('station')) return 'sbl_productivity';
  if (lowerName.includes('sbl_table') && lowerName.includes('lines')) return 'sbl_table_lines';
  if (lowerName.includes('station') && lowerName.includes('wise') && lowerName.includes('sbl')) return 'station_wise_sbl_productivity';
  if (lowerName.includes('secondary_sortation')) return 'secondary_sortation';
  if (lowerName.includes('partial_hus_pending_based_on_gtp_demand') || lowerName.includes('partial_hus_pending') || lowerName.includes('infeed')) return 'partial_hus_pending_based_on_gtp_demand';
  
  return null;
}
