export interface ExcelValidationSchema {
  filename: string;
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
}

export const EXCEL_SCHEMAS: Record<string, ExcelValidationSchema> = {
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
    description: 'Cross-dock Progress (ASN Level)'
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
    description: 'Station Backlog'
  },
  'ptl_productivity': {
    filename: 'ptl_productivity',
    requiredColumns: [
      'interval_no', 'productivity'
    ],
    optionalColumns: [
      'first_scan_time'
    ],
    description: 'PTL Productivity Over Time'
  },
  'ptl_table_lines': {
    filename: 'ptl_table_lines',
    requiredColumns: [
      'interval_no', 'zone_code', 'line_count', 'productivity'
    ],
    optionalColumns: [],
    description: 'PTL Table Lines'
  },
  'sbl_infeed_rate': {
    filename: 'sbl_infeed_rate',
    requiredColumns: [
      'Interval (10 Mins)', 'Cartons'
    ],
    optionalColumns: [],
    description: 'SBL Infeed Rate'
  },
  'sbl_productivity_withtime': {
    filename: 'sbl_productivity_withtime',
    requiredColumns: [
      'interval_no', 'total_line_count', 'productivity'
    ],
    optionalColumns: [
      'wave_number'
    ],
    description: 'SBL Productivity Over Time'
  },
  'station_wise_sbl_productivity': {
    filename: 'station_wise_sbl_productivity',
    requiredColumns: [
      'interval_no', 'zone_code', 'total_line_count', 'productivity'
    ],
    optionalColumns: [],
    description: 'Station Wise SBL Productivity'
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
  
  // Check for exact matches first
  for (const [key, schema] of Object.entries(EXCEL_SCHEMAS)) {
    if (lowerName.includes(schema.filename)) {
      return key;
    }
  }
  
  // Check for variations and patterns
  if (lowerName.includes('loading_dashboard')) return 'updated_loading_dashboard_query';
  if (lowerName.includes('inbound_asn') && lowerName.includes('level')) return 'inbound_asn_level_progress';
  if (lowerName.includes('inbound_progress') && !lowerName.includes('asn')) return 'inbound_progress';
  if (lowerName.includes('line_completion')) return 'line_completion_2';
  if (lowerName.includes('ptl_productivity') && !lowerName.includes('table')) return 'ptl_productivity';
  if (lowerName.includes('ptl_table') && lowerName.includes('lines')) return 'ptl_table_lines';
  if (lowerName.includes('sbl_infeed_rate')) return 'sbl_infeed_rate';
  if (lowerName.includes('sbl_productivity') && lowerName.includes('withtime')) return 'sbl_productivity_withtime';
  if (lowerName.includes('station') && lowerName.includes('wise') && lowerName.includes('sbl')) return 'station_wise_sbl_productivity';
  
  return null;
}
