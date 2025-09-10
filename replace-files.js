#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// This script helps replace the old Excel files with new ones
// Place your new files in a 'new-files' directory and run this script

const dataDir = path.join(__dirname, 'data');
const newFilesDir = path.join(__dirname, 'new-files');

console.log('🔄 File Replacement Script');
console.log('========================');

// Check if new-files directory exists
if (!fs.existsSync(newFilesDir)) {
  console.log('❌ new-files directory not found!');
  console.log('📁 Please create a "new-files" directory and place your new Excel files there.');
  console.log('📋 Expected files:');
  console.log('   - sbl_productivity_*.xlsx');
  console.log('   - sbl_infeed_rate_*.xlsx');
  console.log('   - sbl_table_lines_*.xlsx');
  console.log('   - ptl_productivity_*.xlsx');
  console.log('   - ptl_table_lines_*.xlsx');
  console.log('   - line_completion_2_*.xlsx');
  console.log('   - secondary_sortation_*.xlsx');
  console.log('   - updated_loading_dashboard_query_*.xlsx');
  console.log('   - wave_macros_*.xlsx');
  console.log('   - partial_hus_pending_based_on_gtp_demand_*.xlsx');
  process.exit(1);
}

// List current files
console.log('\n📂 Current files in data directory:');
const currentFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx'));
currentFiles.forEach(file => {
  const stats = fs.statSync(path.join(dataDir, file));
  console.log(`   ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
});

// List new files
console.log('\n📂 New files found:');
const newFiles = fs.readdirSync(newFilesDir).filter(f => f.endsWith('.xlsx'));
if (newFiles.length === 0) {
  console.log('   ❌ No Excel files found in new-files directory');
  process.exit(1);
}

newFiles.forEach(file => {
  const stats = fs.statSync(path.join(newFilesDir, file));
  console.log(`   ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
});

// Backup current files
console.log('\n💾 Creating backup...');
const backupDir = path.join(__dirname, 'backup', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(backupDir, { recursive: true });

currentFiles.forEach(file => {
  const src = path.join(dataDir, file);
  const dest = path.join(backupDir, file);
  fs.copyFileSync(src, dest);
  console.log(`   ✅ Backed up: ${file}`);
});

// Replace files
console.log('\n🔄 Replacing files...');
let replacedCount = 0;

newFiles.forEach(file => {
  const src = path.join(newFilesDir, file);
  const dest = path.join(dataDir, file);
  
  try {
    fs.copyFileSync(src, dest);
    console.log(`   ✅ Replaced: ${file}`);
    replacedCount++;
  } catch (error) {
    console.log(`   ❌ Failed to replace ${file}: ${error.message}`);
  }
});

console.log(`\n✅ Successfully replaced ${replacedCount} files`);
console.log(`📁 Backup created at: ${backupDir}`);
console.log('\n🚀 Next steps:');
console.log('   1. Test the dashboard locally');
console.log('   2. Commit and push to production');
console.log('   3. Verify the dashboard shows new data');

