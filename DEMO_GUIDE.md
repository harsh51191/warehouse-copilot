# Warehouse Copilot - Investor Demo Guide

## **Demo Overview (5-7 minutes)**

**Key Message:** "This is a Decision Support System that eliminates the need to sift through 100s of data points. It provides instant insights and actionable recommendations."

---

## **Demo Flow**

### **1. Upload & Analytics Generation (1 minute)**
- **Action:** Upload Excel files including `wave_macros_sample.xlsx`
- **Show:** "Uploading Excel files... Generating analytics..."
- **Highlight:** 
  - Automatic file validation
  - Real-time analytics computation
  - Dashboard artifacts generation
- **Key Point:** "No more manual data analysis - everything is computed automatically"

### **2. Dashboard Overview (1 minute)**
- **Show:** Overall wave status, OTIF risk, line coverage
- **Highlight:**
  - Real-time projected finish time
  - Color-coded risk indicators (green/amber/red)
  - Key metrics at a glance
- **Key Point:** "Instant visibility into wave performance"

### **3. AI Recommendations Panel (1 minute)**
- **Show:** AI-generated recommendations with priorities
- **Highlight:**
  - Fact-based recommendations (not generic advice)
  - Priority levels (HIGH/MEDIUM/LOW)
  - Confidence scores
  - Impact estimates
- **Key Point:** "AI analyzes data and tells you exactly what to do"

### **4. Conversational Copilot (2-3 minutes)**
**Demo Questions:**

#### **Question 1: "Why is SBL completion low?"**
- **Expected Response:** "SBL completion is low because 2 stations are starved (V031, V032). This is due to insufficient infeed, not slow pickers. Focus on improving infeed rates rather than adding SBL staff."
- **UI Highlight:** SBL stations panel highlights starved stations
- **Key Point:** "AI identifies root cause, not just symptoms"

#### **Question 2: "Which trips are at risk?"**
- **Expected Response:** "2 trips at high risk. TR619119640474865664 has 75% risk due to sorting delays, QC backlog. Recommend resequencing or opening extra dock."
- **UI Highlight:** Trip grid highlights high-risk trips
- **Key Point:** "Proactive risk identification with specific actions"

#### **Question 3: "What should we do to improve?"**
- **Expected Response:** "Retask feeder to starved SBL stations: 2 SBL stations are starved (V031, V032). Low infeed is causing productivity drops. +30 LPH expected improvement"
- **UI Highlight:** Recommendations panel highlights relevant actions
- **Key Point:** "Actionable recommendations with quantified impact"

#### **Question 4: "Are we going to hit cutoff?"**
- **Expected Response:** "MEDIUM OTIF RISK: 15 minutes buffer remaining. Monitor closely and implement key recommendations."
- **UI Highlight:** Overall summary highlights OTIF risk
- **Key Point:** "Real-time OTIF tracking with buffer calculations"

### **5. Technical Deep Dive (1 minute)**
- **Show:** Derived values in `/data/derived/` folder
- **Highlight:**
  - Comprehensive logging of all calculations
  - Transparent analytics (no black box)
  - JSON artifacts for fast retrieval
- **Key Point:** "Full transparency and auditability"

---

## **Key Talking Points**

### **For Investors:**
1. **"Decision Support System"** - Eliminates manual data analysis
2. **"Fact-Based Intelligence"** - Not generic advice, but data-driven recommendations
3. **"Real-Time Analytics"** - Upload Excel → Instant insights
4. **"Actionable Intelligence"** - Tells you what to do, not just what's happening
5. **"Scalable Architecture"** - Ready for production deployment

### **Technical Highlights:**
1. **Analytics Engine First** - Solid foundation before UI
2. **Dashboard-First Artifacts** - Fast UI rendering
3. **Comprehensive Logging** - Full transparency
4. **Modular Architecture** - Easy to extend and maintain
5. **Production Ready** - Built for Vercel deployment

---

## **Demo Data Setup**

### **Files to Upload:**
1. `wave_macros_sample.xlsx` - Wave parameters
2. All existing Excel files in `/data/` folder

### **Expected Results:**
- **SBL Stations:** 2-3 starved stations
- **PTL Stream:** Capacity shortfall detected
- **Trip Risks:** 1-2 high-risk trips
- **OTIF Risk:** MEDIUM level
- **Recommendations:** 3-5 actionable recommendations

---

## **Troubleshooting**

### **If Analytics Don't Generate:**
1. Check console for errors
2. Verify `wave_macros_sample.xlsx` is uploaded
3. Check `/data/derived/` folder for artifacts

### **If Copilot Doesn't Respond:**
1. Check if GEMINI_API_KEY is set
2. Verify analytics artifacts are available
3. Check network requests in browser dev tools

### **If UI Doesn't Update:**
1. Refresh the page after upload
2. Check for JavaScript errors in console
3. Verify API endpoints are responding

---

## **Success Metrics for Demo**

✅ **Upload completes successfully**  
✅ **Analytics generate without errors**  
✅ **Dashboard shows real data**  
✅ **Recommendations panel appears**  
✅ **Copilot answers questions intelligently**  
✅ **UI highlighting works**  
✅ **All calculations are logged**  

---

## **Post-Demo Questions to Expect**

### **Technical Questions:**
- "How does the analytics engine work?"
- "Can this scale to multiple warehouses?"
- "What's the deployment architecture?"
- "How do you ensure data accuracy?"

### **Business Questions:**
- "What's the ROI of this system?"
- "How does this compare to existing solutions?"
- "What's the implementation timeline?"
- "What are the ongoing costs?"

### **Prepared Answers:**
- **Scalability:** "Modular architecture supports multiple warehouses"
- **ROI:** "Reduces decision time from hours to minutes"
- **Implementation:** "2-4 weeks for full deployment"
- **Costs:** "SaaS model with per-warehouse pricing"

---

## **Demo Environment**

- **URL:** `http://localhost:3000`
- **Environment:** Development mode
- **Data:** Static Excel files (realistic but controlled)
- **AI:** Google Gemini API
- **Deployment:** Ready for Vercel

---

**Remember:** The goal is to show that this is a **Decision Support System**, not just a dashboard. The AI provides **actionable intelligence** that eliminates the need to manually analyze data.
