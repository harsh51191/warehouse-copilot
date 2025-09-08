import path from "path";
import { getDataDir, findLatestMatchingFile, readFirstSheetAsJson } from "@/lib/xlsx";
import { WaveMacros, processMacros, validateMacros } from "@/lib/analytics/macros-processor";

export async function getMacrosFromFile(): Promise<WaveMacros | null> {
  const dir = getDataDir();
  const fallbackDir = path.join(process.cwd(), "..");
  const filePath = findLatestMatchingFile(dir, "wave_macros_")
    || findLatestMatchingFile(fallbackDir, "wave_macros_");
  
  if (!filePath) {
    console.log('No wave_macros file found');
    return null;
  }

  try {
    const rows = readFirstSheetAsJson(filePath);
    if (!rows || rows.length === 0) {
      console.log('Wave macros file is empty');
      return null;
    }

    // Take the first row as wave macros (should be single row)
    const macros = rows[0] as any;
    
    // Validate the macros
    const validation = validateMacros(macros);
    if (!validation.isValid) {
      console.error('Invalid macros data:', validation.errors);
      return null;
    }

    // Convert Excel dates to ISO strings
    const convertExcelDate = (excelDate: any): string => {
      if (typeof excelDate === 'number') {
        // Excel date serial number - convert to JavaScript Date
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString();
      }
      return String(excelDate);
    };

    // Convert to proper format
    const waveMacros: WaveMacros = {
      wave_id: String(macros.wave_id),
      start_time_iso: convertExcelDate(macros.start_time_iso),
      cutoff_time_iso: convertExcelDate(macros.cutoff_time_iso),
      total_orders: Number(macros.total_orders) || 0,
      total_order_lines: Number(macros.total_order_lines) || 0,
      total_order_value: macros.total_order_value ? Number(macros.total_order_value) : undefined,
      split_lines_sbl: macros.split_lines_sbl ? Number(macros.split_lines_sbl) : undefined,
      split_lines_ptl: macros.split_lines_ptl ? Number(macros.split_lines_ptl) : undefined,
      split_lines_fc: macros.split_lines_fc ? Number(macros.split_lines_fc) : undefined
    };

    console.log('Successfully loaded wave macros:', waveMacros);
    return waveMacros;
  } catch (error) {
    console.error('Error reading wave macros file:', error);
    return null;
  }
}

export async function getProcessedMacros(): Promise<ReturnType<typeof processMacros> | null> {
  const macros = await getMacrosFromFile();
  if (!macros) {
    return null;
  }

  return processMacros(macros);
}
