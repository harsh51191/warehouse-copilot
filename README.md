# Warehouse Copilot - AI-Powered Warehouse Management System

A comprehensive Next.js 14 + TypeScript application that provides AI-powered insights and recommendations for warehouse operations, specifically designed for SBL (Single Bin Line) and PTL (Pick to Light) workflows.

## 🚀 Features

### 🤖 AI-Powered Copilot
- **60+ Specific Query Handlers** for comprehensive warehouse operations support
- **Natural Language Processing** for intuitive question answering
- **Real-time Analytics** with instant responses
- **Contextual Recommendations** based on current operational data

### 📊 Dashboard & Analytics
- **3-Panel Unified Layout** with real-time data visualization
- **Wave Progress Tracking** with SBL/PTL completion monitoring
- **Issue Summary Widgets** with detailed modal views
- **Productivity Monitoring** with trend analysis
- **Loading Status Tracking** with trip-level insights

### 📈 Data Processing
- **Excel File Integration** for seamless data upload
- **Real-time Artifact Generation** with precomputed analytics
- **Comprehensive Metrics** including SMA, Trip Risk, Starvation analysis
- **SBL SKUs Tracking** with pending/completed status

### 🎯 Key Capabilities
- **Wave Management**: Track overall wave progress and completion
- **Station Performance**: Monitor individual SBL/PTL station productivity
- **Trip Risk Analysis**: Identify and prioritize at-risk shipments
- **Capacity Planning**: Detect shortfalls and recommend resource allocation
- **Issue Resolution**: Categorize and provide actionable solutions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **Charts**: Recharts for data visualization
- **AI**: Google Gemini API for natural language processing
- **Data Processing**: xlsx library for Excel file handling
- **Deployment**: Vercel-ready with optimized build

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API endpoints
│   │   ├── ai/ask/        # AI query processing
│   │   ├── analytics/     # Dashboard data APIs
│   │   ├── metrics/       # Metrics-specific APIs
│   │   └── upload/        # File upload handling
│   └── page.tsx           # Main dashboard page
├── components/            # React components
│   ├── ExcelUpload.tsx    # File upload interface
│   └── VapiWaveCopilot.tsx # Main dashboard component
├── lib/                   # Core business logic
│   ├── analytics/         # Analytics and artifact generation
│   ├── config/           # Configuration and thresholds
│   └── orchestrator.ts   # AI query orchestration
└── server/               # Server-side data adapters
    └── datasource/       # Excel file processing
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vapi-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Add your Google Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to `http://localhost:3001`

## 📊 Data Files

The system processes the following Excel files:

- **`wave_macros.xlsx`** - Wave configuration and targets
- **`updated_loading_dashboard_query.xlsx`** - Trip and loading data
- **`sbl_summary.xlsx`** - SBL station productivity
- **`sbl_table_lines.xlsx`** - SBL station-level line data
- **`ptl_productivity.xlsx`** - PTL productivity metrics
- **`ptl_table_lines.xlsx`** - PTL station-level data
- **`line_completion_2.xlsx`** - Line completion tracking
- **`secondary_sortation.xlsx`** - Sorting and QC data
- **`sbl_skus.xlsx`** - SBL SKU tracking (optional)

## 🤖 Copilot Queries

The AI copilot can answer questions across these categories:

### 📊 Wave & Overall Status
- "What is the overall wave status?"
- "How is the wave progressing?"
- "What is the projected finish time?"
- "What is the OTIF risk level?"

### 🏭 SBL Operations
- "How many SBL stations are active?"
- "Which SBL station has the lowest productivity?"
- "What is the SBL productivity trend?"
- "How many SBL stations are starved?"

### 🟢 PTL Operations
- "What is the PTL productivity in the last hour?"
- "How is PTL performing?"
- "Does PTL have capacity shortfall?"
- "How many PTL stations are active?"

### 🚛 Loading & Trips
- "What is the loading status?"
- "Which trips are at risk?"
- "Show me trip details"
- "How many trips are loaded?"

### 📈 Performance & Issues
- "Which stations need attention?"
- "What issues do we have?"
- "What recommendations do you have?"
- "What should I focus on?"

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/warehouse-copilot.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically on push

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 📋 Configuration

### Thresholds and Targets
Configure operational thresholds in `src/lib/config/stage-targets.ts`:

- **SBL Target**: 120 LPH (Lines Per Hour)
- **PTL Target**: 180 LPH
- **Health Thresholds**: Green ≥95%, Amber 70-95%, Red <70%
- **Buffer Times**: Configurable per operation type

### Stage Targets
Modify expected durations and targets in the configuration file to match your warehouse operations.

## 🧪 Testing

### Query Testing
Use the provided test scripts to verify copilot responses:

```bash
# Test all 60 queries
node test-all-60-queries.js

# Test specific query categories
node test-specific-queries.js
```

### Manual Testing
Follow the `QUERY_TEST_GUIDE.md` for comprehensive testing procedures.

## 📚 Documentation

- **`COMPREHENSIVE_LLM_PROMPT.md`** - LLM testing context
- **`QUERY_TEST_GUIDE.md`** - Query testing procedures
- **`DEPLOYMENT.md`** - Deployment instructions
- **`THRESHOLD_CONFIGURATION.md`** - Configuration guide

## 🔧 Development

### Adding New Query Handlers

1. Add handler in `src/lib/analytics/recommendation-engine.ts`
2. Test with specific queries
3. Update documentation

### Adding New Data Sources

1. Create adapter in `src/server/datasource/`
2. Update artifact generator
3. Add to dashboard interface

## 📄 License

This project is proprietary software developed for warehouse management operations.

## 🤝 Support

For technical support or feature requests, please contact the development team.

---

**Built with ❤️ for efficient warehouse operations**
