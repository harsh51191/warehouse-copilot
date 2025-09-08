// Comprehensive test for all 60 queries
const testQueries = [
  // 📊 Wave & Overall Status Questions
  "What are the total lines in the wave?",
  "What is the overall wave status?",
  "How is the wave progressing?",
  "What is the line coverage percentage?",
  "What is the projected finish time?",
  "What is the OTIF risk level?",
  
  // 🏭 SBL (Single Bin Line) Questions
  "What are the total SBL lines?",
  "How many SBL stations are active?",
  "What is the average SBL productivity in the last hour?",
  "Which SBL station has the lowest productivity?",
  "Which SBL station has the highest productivity?",
  "What is the SBL trend?",
  "Why is SBL productivity low?",
  "How many SBL stations are starved?",
  "What SBL SKUs are pending?",
  "What SBL SKUs need feeding?",
  
  // PTL (Pick to Light) Questions
  "What is the PTL productivity in the last hour?",
  "How is PTL performing?",
  "Why is PTL productivity low?",
  "Does PTL have capacity shortfall?",
  "How many PTL stations are active?",
  
  // 🚛 Loading & Trip Questions
  "What is the loading status?",
  "What is happening with loading?",
  "How's loading going?",
  "Show me trip progress",
  "Which trips are at risk?",
  "What trips block OTIF?",
  "Show me trip details",
  "How many trips are loaded?",
  "What is the trip-level loading status?",
  
  // 📈 Productivity & Performance Questions
  "What is the SBL productivity trend?",
  "What is the PTL productivity trend?",
  "Which stations are performing well?",
  "Which stations need attention?",
  "What is the overall productivity?",
  
  // ⚠️ Issues & Recommendations Questions
  "What issues do we have?",
  "What recommendations do you have?",
  "What should I focus on?",
  "What are the main problems?",
  "What actions should I take?",
  
  // 📋 Station-Specific Questions
  "How is station V001 performing?",
  "Which stations are starved?",
  "How many stations are 95%+ complete?",
  "What is the average completion rate?",
  
  // 🎯 Risk & Alerts Questions
  "What is the OTIF risk?",
  "Which trips are at high risk?",
  "What is the buffer time?",
  "Are we on track to finish on time?",
  
  // 📊 Data & Metrics Questions
  "What is the line coverage?",
  "How many crates are loaded?",
  "What is the completion percentage?",
  "What are the key metrics?",
  
  // 🔍 Specific Analysis Questions
  "Why is productivity declining?",
  "What is causing delays?",
  "Which areas need immediate attention?",
  "What is the root cause of issues?",
  
  // 💡 Actionable Questions
  "What should I do next?",
  "How can I improve productivity?",
  "What resources do I need?",
  "What is the priority order?"
];

console.log("🧪 Testing All 60 Queries");
console.log("=".repeat(60));
console.log("");

// Categorize queries for better testing
const categories = {
  "Wave & Overall Status": testQueries.slice(0, 6),
  "SBL Questions": testQueries.slice(6, 16),
  "PTL Questions": testQueries.slice(16, 21),
  "Loading & Trip Questions": testQueries.slice(21, 30),
  "Productivity & Performance": testQueries.slice(30, 35),
  "Issues & Recommendations": testQueries.slice(35, 40),
  "Station-Specific": testQueries.slice(40, 44),
  "Risk & Alerts": testQueries.slice(44, 48),
  "Data & Metrics": testQueries.slice(48, 52),
  "Specific Analysis": testQueries.slice(52, 56),
  "Actionable Questions": testQueries.slice(56, 60)
};

Object.entries(categories).forEach(([category, queries]) => {
  console.log(`📂 ${category} (${queries.length} queries)`);
  queries.forEach((query, index) => {
    console.log(`   ${index + 1}. "${query}"`);
  });
  console.log("");
});

console.log("🔧 Testing Instructions:");
console.log("1. Server should be running: npm run dev");
console.log("2. Open: http://localhost:3001");
console.log("3. Test each category systematically");
console.log("4. Look for generic OTIF risk responses (these need fixing)");
console.log("5. Verify specific, data-driven answers");
console.log("");
console.log("🚨 Common Issues to Watch For:");
console.log("- Generic 'OTIF risk' responses instead of specific answers");
console.log("- 'Cannot answer' responses when data is available");
console.log("- Missing specific metrics or station details");
console.log("- Inconsistent formatting or incomplete information");
