const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dataDir = './data';

function analyzeExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (data.length === 0) {
      return { columns: [], sampleData: [] };
    }
    
    const columns = Object.keys(data[0]);
    const sampleData = data.slice(0, 3); // First 3 rows as sample
    
    return {
      columns,
      sampleData,
      rowCount: data.length
    };
  } catch (error) {
    return { error: error.message };
  }
}

function analyzeAllFiles() {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));
  
  console.log('=== EXCEL FILE ANALYSIS ===\n');
  
  files.forEach(fileName => {
    const filePath = path.join(dataDir, fileName);
    console.log(`📁 ${fileName}`);
    console.log('─'.repeat(80));
    
    const result = analyzeExcelFile(filePath);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}\n`);
      return;
    }
    
    console.log(`📊 Rows: ${result.rowCount}`);
    console.log(`📋 Columns (${result.columns.length}):`);
    result.columns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col}`);
    });
    
    if (result.sampleData.length > 0) {
      console.log('\n📝 Sample Data (first 3 rows):');
      result.sampleData.forEach((row, index) => {
        console.log(`   Row ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}=${row[key]}`).join(', '));
      });
    }
    
    console.log('\n');
  });
}

analyzeAllFiles();
