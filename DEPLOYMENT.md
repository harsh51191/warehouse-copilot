# Vercel Deployment Guide

## Prerequisites
1. Vercel account (free tier available)
2. GitHub repository with your code
3. Gemini API key

## Deployment Steps

### 1. Prepare Environment Variables
Create a `.env.local` file with:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? vapi-copilot (or your preferred name)
# - Directory? ./
# - Override settings? N
```

#### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set environment variables in project settings
5. Deploy

### 3. Configure Environment Variables
In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `GEMINI_API_KEY` with your API key
3. Redeploy if needed

### 4. Domain Configuration
- Vercel provides a free `.vercel.app` domain
- Custom domain can be added in project settings
- SSL is automatically configured

## File Structure for Deployment
```
/
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── data/
│   └── derived/
├── package.json
├── next.config.js
├── vercel.json
└── .env.local (not committed)
```

## Important Notes
- The `data/` directory with Excel files should be uploaded via the web interface
- The `data/derived/` directory will be created automatically after first Excel upload
- All API endpoints are serverless functions with 30-second timeout
- Static files are served from Vercel's CDN

## Troubleshooting
- If build fails, check environment variables
- If Excel upload fails, ensure file size is under 50MB
- If API calls fail, check Gemini API key and rate limits
