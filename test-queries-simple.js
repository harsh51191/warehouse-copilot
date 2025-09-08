// Simple test script to validate copilot queries
const testQueries = [
  // Wave & Overall Status
  "What are the total lines in the wave?",
  "What is the overall wave status?",
  "How is the wave progressing?",
  "What is the line coverage percentage?",
  "What is the projected finish time?",
  "What is the OTIF risk level?",
  
  // SBL Questions
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
  
  // PTL Questions
  "What is the PTL productivity in the last hour?",
  "How is PTL performing?",
  "Why is PTL productivity low?",
  "Does PTL have capacity shortfall?",
  "How many PTL stations are active?",
  
  // Loading & Trip Questions
  "What is the loading status?",
  "What is happening with loading?",
  "How's loading going?",
  "Show me trip progress",
  "Which trips are at risk?",
  "What trips block OTIF?",
  "Show me trip details",
  "How many trips are loaded?",
  "What is the trip-level loading status?",
  
  // Productivity & Performance
  "What is the SBL productivity trend?",
  "What is the PTL productivity trend?",
  "Which stations are performing well?",
  "Which stations need attention?",
  "What is the overall productivity?",
  
  // Issues & Recommendations
  "What issues do we have?",
  "What recommendations do you have?",
  "What should I focus on?",
  "What are the main problems?",
  "What actions should I take?",
  
  // Station-Specific
  "How is station V001 performing?",
  "Which stations are starved?",
  "How many stations are 95%+ complete?",
  "What is the average completion rate?",
  
  // Risk & Alerts
  "What is the OTIF risk?",
  "Which trips are at high risk?",
  "What is the buffer time?",
  "Are we on track to finish on time?",
  
  // Data & Metrics
  "What is the line coverage?",
  "How many crates are loaded?",
  "What is the completion percentage?",
  "What are the key metrics?",
  
  // Specific Analysis
  "Why is productivity declining?",
  "What is causing delays?",
  "Which areas need immediate attention?",
  "What is the root cause of issues?",
  
  // Actionable
  "What should I do next?",
  "How can I improve productivity?",
  "What resources do I need?",
  "What is the priority order?"
];

console.log("🧪 Testing Copilot Queries");
console.log("=".repeat(50));
console.log(`Total queries to test: ${testQueries.length}`);
console.log("\nTo test these queries:");
console.log("1. Start the dev server: npm run dev");
console.log("2. Open http://localhost:3001");
console.log("3. Test each query in the copilot panel");
console.log("\nKey queries to focus on first:");
console.log("- 'What is the overall wave status?'");
console.log("- 'How many SBL stations are active?'");
console.log("- 'What is the loading status?'");
console.log("- 'Which stations need attention?'");
console.log("- 'What recommendations do you have?'");
console.log("\nExpected issues to fix:");
console.log("- Some queries may return generic responses");
console.log("- Station-specific queries need better handling");
console.log("- SKU-related queries need data validation");
console.log("- Trend analysis queries need improvement");
