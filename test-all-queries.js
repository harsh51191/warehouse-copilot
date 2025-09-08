const { generateFactBasedAnswer } = require('./src/lib/analytics/recommendation-engine');

// Load the dashboard artifacts
const fs = require('fs');
const path = require('path');

const artifactsPath = path.join(__dirname, 'data/derived/dashboard_artifacts.json');
const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));

// Test queries organized by category
const testQueries = {
  "📊 Wave & Overall Status Questions": [
    "What are the total lines in the wave?",
    "What is the overall wave status?",
    "How is the wave progressing?",
    "What is the line coverage percentage?",
    "What is the projected finish time?",
    "What is the OTIF risk level?"
  ],
  "🏭 SBL (Single Bin Line) Questions": [
    "What are the total SBL lines?",
    "How many SBL stations are active?",
    "What is the average SBL productivity in the last hour?",
    "Which SBL station has the lowest productivity?",
    "Which SBL station has the highest productivity?",
    "What is the SBL trend?",
    "Why is SBL productivity low?",
    "How many SBL stations are starved?",
    "What SBL SKUs are pending?",
    "What SBL SKUs need feeding?"
  ],
  "🟢 PTL (Pick to Light) Questions": [
    "What is the PTL productivity in the last hour?",
    "How is PTL performing?",
    "Why is PTL productivity low?",
    "Does PTL have capacity shortfall?",
    "How many PTL stations are active?"
  ],
  "🚛 Loading & Trip Questions": [
    "What is the loading status?",
    "What is happening with loading?",
    "How's loading going?",
    "Show me trip progress",
    "Which trips are at risk?",
    "What trips block OTIF?",
    "Show me trip details",
    "How many trips are loaded?",
    "What is the trip-level loading status?"
  ],
  "📈 Productivity & Performance Questions": [
    "What is the SBL productivity trend?",
    "What is the PTL productivity trend?",
    "Which stations are performing well?",
    "Which stations need attention?",
    "What is the overall productivity?"
  ],
  "⚠️ Issues & Recommendations Questions": [
    "What issues do we have?",
    "What recommendations do you have?",
    "What should I focus on?",
    "What are the main problems?",
    "What actions should I take?"
  ],
  "📋 Station-Specific Questions": [
    "How is station V001 performing?",
    "Which stations are starved?",
    "How many stations are 95%+ complete?",
    "What is the average completion rate?"
  ],
  "🎯 Risk & Alerts Questions": [
    "What is the OTIF risk?",
    "Which trips are at high risk?",
    "What is the buffer time?",
    "Are we on track to finish on time?"
  ],
  "📊 Data & Metrics Questions": [
    "What is the line coverage?",
    "How many crates are loaded?",
    "What is the completion percentage?",
    "What are the key metrics?"
  ],
  "🔍 Specific Analysis Questions": [
    "Why is productivity declining?",
    "What is causing delays?",
    "Which areas need immediate attention?",
    "What is the root cause of issues?"
  ],
  "💡 Actionable Questions": [
    "What should I do next?",
    "How can I improve productivity?",
    "What resources do I need?",
    "What is the priority order?"
  ]
};

// Test function
async function testAllQueries() {
  console.log("🧪 Testing All Copilot Queries\n");
  console.log("=".repeat(80));
  
  let totalQueries = 0;
  let passedQueries = 0;
  let failedQueries = [];
  
  for (const [category, queries] of Object.entries(testQueries)) {
    console.log(`\n${category}`);
    console.log("-".repeat(50));
    
    for (const query of queries) {
      totalQueries++;
      try {
        const response = await generateFactBasedAnswer(query, artifacts);
        
        // Check if response is valid (not empty, not generic error)
        const isValid = response && 
                       response.length > 10 && 
                       !response.includes("I don't understand") &&
                       !response.includes("I cannot answer");
        
        if (isValid) {
          console.log(`✅ "${query}"`);
          console.log(`   Response: ${response.substring(0, 100)}...`);
          passedQueries++;
        } else {
          console.log(`❌ "${query}"`);
          console.log(`   Response: ${response}`);
          failedQueries.push({ query, response });
        }
      } catch (error) {
        console.log(`💥 "${query}" - ERROR: ${error.message}`);
        failedQueries.push({ query, error: error.message });
      }
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log(`📊 TEST RESULTS:`);
  console.log(`Total Queries: ${totalQueries}`);
  console.log(`Passed: ${passedQueries} (${Math.round(passedQueries/totalQueries*100)}%)`);
  console.log(`Failed: ${failedQueries.length} (${Math.round(failedQueries.length/totalQueries*100)}%)`);
  
  if (failedQueries.length > 0) {
    console.log(`\n❌ FAILED QUERIES:`);
    failedQueries.forEach(({ query, response, error }) => {
      console.log(`\n"${query}"`);
      if (error) {
        console.log(`   ERROR: ${error}`);
      } else {
        console.log(`   RESPONSE: ${response}`);
      }
    });
  }
  
  return { totalQueries, passedQueries, failedQueries };
}

// Run the test
testAllQueries().then(results => {
  console.log(`\n🎯 Test completed! ${results.passedQueries}/${results.totalQueries} queries passed.`);
  process.exit(results.failedQueries.length > 0 ? 1 : 0);
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});
