// Quick test for specific queries that were failing
const testQueries = [
  "What is the SBL productivity trend?",
  "What is the projected finish time?",
  "What is the overall wave status?",
  "How many SBL stations are active?",
  "What is the loading status?",
  "Which stations need attention?"
];

console.log("🧪 Testing Specific Queries");
console.log("=".repeat(50));
console.log("These queries should now return specific answers instead of generic OTIF risk responses:");
console.log("");

testQueries.forEach((query, index) => {
  console.log(`${index + 1}. "${query}"`);
});

console.log("");
console.log("To test:");
console.log("1. Run: npm run dev");
console.log("2. Open: http://localhost:3001");
console.log("3. Ask each query in the copilot panel");
console.log("4. Verify you get specific, data-driven responses");
console.log("");
console.log("Expected fixes:");
console.log("✅ 'SBL productivity trend' → Should show trend analysis with LPH values");
console.log("✅ 'Projected finish time' → Should show specific finish time and buffer");
console.log("✅ 'Overall wave status' → Should show comprehensive status");
console.log("✅ 'SBL stations active' → Should show station count with health breakdown");
console.log("✅ 'Loading status' → Should show detailed loading overview");
console.log("✅ 'Stations need attention' → Should show categorized issues");
