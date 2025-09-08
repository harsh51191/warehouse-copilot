'use client'

import React, { useMemo, useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, Activity, Layers, Truck, Bot, Info, Sparkles, SlidersHorizontal, Loader2, TrendingDown, CheckCircle, Users, Package, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import ExcelUpload from "./ExcelUpload";

/**
 * Vapi Wave Copilot – Unified 3-Panel Layout:
 * Left: Wave Progress Funnel & Drum-Buffer-Rope
 * Middle: Comprehensive Analytics (Wave Header, AI Recommendations, Productivity Trends, Conveyor FEED, Trip Progress)
 * Right: Fixed Chat Panel (Copilot)
 *
 * Features:
 * - Real-time data from Excel uploads
 * - AI-powered recommendations and Q&A
 * - Dynamic UI highlighting based on chat queries
 * - Color semantics: green (good), amber (watch), red (risk)
 * - Hybrid system: specific handlers + LLM fallback for flexible responses
 */

// ---------- Mock Data (HUL Vapi – Wave 3) ----------
const cutoff = new Date();
cutoff.setHours(15, 30, 0, 0); // 3:30 PM

function makeInitialState() {
  return {
    waveId: 3,
    startTime: new Date(2025, 7, 2, 13, 5),
    totalLines: 1500,
    status: "AT_RISK", // ON_TRACK | AT_RISK | LATE
    now: new Date(2025, 7, 2, 14, 45),
    projectedFinish: new Date(2025, 7, 2, 16, 15), // late by 45m
    lineCoveragePct: 0.88,
    valueCoveragePct: 0.97,
    prod: {
      sbl: { current: 92, target: 120, stations: 8 },
      ptl: { current: 165, target: 180, stations: 6 },
      fullcase: { current: 210, target: 240, stations: 3 },
    },
    rootCauses: [
      { kind: "PTL Shortage", detail: "SKU XYZ below PTL min; packed tapering from 14:20" },
      { kind: "QC Queue", detail: "14 crates waiting for QC (threshold 10)" },
    ],
    trips: [
      { trip: "MM-101", xdock: "XD-01", dock: "D1", sorted: 12, staged: 10, loaded: 8, total: 16, qc: 2 },
      { trip: "MM-102", xdock: "XD-02", dock: "D3", sorted: 10, staged: 7, loaded: 5, total: 14, qc: 5 },
      { trip: "MM-103", xdock: "XD-01", dock: "D2", sorted: 15, staged: 15, loaded: 12, total: 18, qc: 1 },
    ],
    conveyorBuckets: [
      { t: "14:00", cartons: 120 },
      { t: "14:10", cartons: 115 },
      { t: "14:20", cartons: 78 },
      { t: "14:30", cartons: 82 },
      { t: "14:40", cartons: 88 },
    ],
    sblBuckets: [
      { t: "14:00", lines: 140 },
      { t: "14:10", lines: 128 },
      { t: "14:20", lines: 95 },
      { t: "14:30", lines: 92 },
      { t: "14:40", lines: 96 },
    ],
    ptlBuckets: [
      { t: "14:00", lines: 190 },
      { t: "14:10", lines: 182 },
      { t: "14:20", lines: 150 },
      { t: "14:30", lines: 152 },
      { t: "14:40", lines: 165 },
    ],
    highlight: null as null | "SBL" | "PTL" | "FULLCASE" | "FUNNEL" | "BOTTLENECK",
  };
}

// ---- UI helpers
const pct = (x:number) => `${Math.round(x * 100)}%`;
const fmtTime = (d:Date) => d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const colorTone = (kind:"good"|"warn"|"bad") => ({
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad:  "bg-rose-50 text-rose-700 border-rose-200"
}[kind]);

const getHighlightClass = (componentId: string, highlights: string[]) => {
  return highlights.includes(componentId) ? 'ring-2 ring-blue-400 ring-opacity-75 shadow-lg' : '';
};

function Badge({tone, children}:{tone:"good"|"warn"|"bad"; children:React.ReactNode}){
  return <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${colorTone(tone)}`}>{tone==='good'?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>} {children}</span>
}

function Stat({title, value, tone, sub}:{title:string; value:string; tone:"good"|"warn"|"bad"; sub?:string}){
  const border = tone==='good'? 'border-emerald-200' : tone==='warn'? 'border-amber-200' : 'border-rose-200';
  const ring = tone==='good'? 'ring-emerald-50' : tone==='warn'? 'ring-amber-50' : 'ring-rose-50';
  return (
    <div className={`flex-1 rounded-2xl border ${border} p-4 shadow-sm bg-white ring-1 ${ring}`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs mt-1 text-slate-400">{sub}</div>}
    </div>
  )
}

function Progress({value}:{value:number}){
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-slate-800" style={{width:`${Math.min(100, Math.max(0, value))}%`}}/>
    </div>
  )
}

function Trend({data, label, highlight, componentId, uiHighlights, isLoading}:{data:{t:string, lines:number}[]; label:string; highlight?:boolean; componentId?: string; uiHighlights?: string[]; isLoading?: boolean}){
  const highlightClass = componentId ? getHighlightClass(componentId, uiHighlights || []) : '';
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${highlight? 'ring-2 ring-amber-300': ''} ${highlightClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{label}</div>
        {isLoading && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            Loading...
          </div>
        )}
      </div>
      <div className="h-40">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-slate-400 text-sm">Loading data from Excel...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{left:8, right:8, top:10, bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:12}}/>
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="lines" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function Funnel({trips, highlight, componentId, uiHighlights}:{trips:any[]; highlight?:boolean; componentId?: string; uiHighlights?: string[]}){
  const rows = trips.map(tr=>({
    trip: tr.trip,
    sortedPct: tr.total? Math.round((tr.sorted / tr.total)*100):0,
    stagedPct: tr.total? Math.round((tr.staged / tr.total)*100):0,
    loadedPct: tr.total? Math.round((tr.loaded / tr.total)*100):0,
    qc: tr.qc
  }))
  const highlightClass = componentId ? getHighlightClass(componentId, uiHighlights || []) : '';
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${highlight? 'ring-2 ring-amber-300': ''} ${highlightClass}`}>
      <div className="font-medium mb-3 flex items-center gap-2"><Layers size={16}/> Trip Progress (Funnel)</div>
      <div className="space-y-3">
        {rows.map(r=> (
          <div key={r.trip} className="">
            <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium">{r.trip}</span><span className="text-slate-500">QC queue: {r.qc}</span></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">Sorted</div>
                <Progress value={r.sortedPct} />
                <div className="text-xs text-slate-500 mt-1">{r.sortedPct}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Staged</div>
                <Progress value={r.stagedPct} />
                <div className="text-xs text-slate-500 mt-1">{r.stagedPct}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Loaded</div>
                <Progress value={r.loadedPct} />
                <div className="text-xs text-slate-500 mt-1">{r.loadedPct}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Prescription({title, deltas, onApply, variant}:{title:string; deltas:{label:string, before:string, after:string}[]; onApply:()=>void; variant:"otif"|"infull" }){
  const isA = variant==='otif';
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${isA? 'ring-1 ring-emerald-50':'ring-1 ring-slate-100'}`}>
      <div className="flex items-center gap-2 mb-2">{isA? <Clock size={16}/> : <Truck size={16}/> } <div className="font-medium">{title}</div></div>
      <div className="divide-y">
        {deltas.map((d,idx)=> (
          <div key={idx} className="flex items-center justify-between py-2">
            <div className="text-sm text-slate-600">{d.label}</div>
            <div className="text-sm"><span className="line-through text-slate-400 mr-2">{d.before}</span><span className="font-semibold">{d.after}</span></div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-slate-500">Simulated. Writes disabled in prototype.</div>
        <button onClick={onApply} className={`px-3 py-2 rounded-xl text-sm font-medium border hover:shadow ${isA? "bg-emerald-600 text-white border-emerald-700" : "bg-slate-900 text-white border-slate-950"}`}>Simulate</button>
      </div>
    </div>
  )
}

function RecommendationCard({recommendation, componentId, uiHighlights}:{recommendation:any; componentId?: string; uiHighlights?: string[]}){
  const highlightClass = componentId ? getHighlightClass(componentId, uiHighlights || []) : '';
  const priorityColor = recommendation.priority === 'HIGH' ? 'border-red-200 bg-red-50' : 
                       recommendation.priority === 'MEDIUM' ? 'border-amber-200 bg-amber-50' : 
                       'border-blue-200 bg-blue-50';
  
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${priorityColor} ${highlightClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm">{recommendation.title}</div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          recommendation.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
          recommendation.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {recommendation.priority}
        </div>
      </div>
      <div className="text-xs text-slate-600 mb-2">{recommendation.rationale}</div>
      <div className="text-xs font-medium text-slate-700 mb-2">Impact: {recommendation.impact_estimate}</div>
      <div className="text-xs text-slate-500">
        Confidence: {Math.round(recommendation.confidence * 100)}%
      </div>
    </div>
  )
}

function CopilotPanel({onQuery}:{onQuery:(q:string, uiPatch?:any)=>void}){
  const [messages, setMessages] = useState<any[]>([
    { role: "ai", text: "Hi! Ask about your SBL, PTL waves, or tap a suggestion below."},
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const suggestions = [
    "How's loading going?",
    "SBL trend for wave 3",
    "Show me trip progress",
    "Which trips block OTIF?",
  ];
  
  const send = async (txt?:string) => {
    const q = (txt ?? input).trim();
    if(!q || isLoading) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, {role:'user', text:q}]);
    setInput("");
    
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        const aiMessage = {
          role: 'ai',
          text: result.data.answer,
          uiPatch: result.data.uiPatch,
          reasoning: result.data.reasoning
        };
        setMessages(prev => [...prev, aiMessage]);
        onQuery(q, result.data.uiPatch);
      } else {
        setMessages(prev => [...prev, {role:'ai', text: `Error: ${result.error}`}]);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, {role:'ai', text: 'Sorry, I encountered an error. Please try again.'}]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Bot size={18}/> Copilot
          {isLoading && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin"/>
              Processing...
            </div>
          )}
        </div>
      </div>
      
      {/* Chat messages area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((m,idx)=> (
          <div key={idx} className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role==='ai'? 'bg-slate-100':'bg-slate-900 text-white ml-auto'}`}>
            <div className="text-sm leading-relaxed">{m.text}</div>
          </div>
        ))}
        
        {/* Loading message */}
        {isLoading && (
          <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-slate-100 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-slate-500"/>
            <span className="text-slate-600 text-sm">Analyzing your question...</span>
          </div>
        )}
        
        {/* Show suggestions only when not loading */}
        {!isLoading && (
          <div className="flex gap-2 flex-wrap pt-2">
            {messages.length === 1 ? (
              // Initial welcome suggestions
              suggestions.map(s => (
                <button 
                  key={s} 
                  onClick={()=>send(s)} 
                  className="text-xs border rounded-full px-3 py-1 hover:bg-slate-50 transition-colors"
                  disabled={isLoading}
                >
                  {s}
                </button>
              ))
            ) : (
              // Follow-up suggestions after interaction
              <>
                <span className="text-xs text-slate-500 w-full mb-1">Try asking:</span>
                {suggestions.map(s => (
                  <button 
                    key={s} 
                    onClick={()=>send(s)} 
                    className="text-xs border rounded-full px-3 py-1 hover:bg-slate-50 transition-colors"
                    disabled={isLoading}
                  >
                    {s}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Fixed input area at bottom */}
      <div className="p-3 border-t flex items-center gap-2 flex-shrink-0 bg-white">
        <input 
          value={input} 
          onChange={e=>setInput(e.target.value)} 
          placeholder={isLoading ? "Processing your question..." : "Type a question…"} 
          className="flex-1 border rounded-xl px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400 text-sm" 
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading && input.trim()) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button 
          onClick={()=>send()} 
          className="px-3 py-2 rounded-xl bg-slate-900 text-white disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm" 
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin"/>
              Processing
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}

function routeQueryToReply(q:string){
  const t = q.toLowerCase();
  if(t.includes('why') || t.includes('risk')){
    return "PTL stock short on SKU XYZ; QC queue at 14 crates; FEED dropped at 14:20 → staging starvation. Option A lifts ETA by ~47 min with 5% value deferral.";
  }
  if(t.includes('sbl') && t.includes('ptl')){
    return "SBL running at 92/h/stn vs 120 target (−23%); PTL at 165/h/stn vs 180 (−8%). Focus SBL staffing or reduce PTL conflicts.";
  }
  if(t.includes('add 1 picker')){
    return "Adding 1 picker to Loop 2 increases SBL by ~12% based on last week’s elasticity; ETA improves by ~18 min.";
  }
  if(t.includes('which trips') || t.includes('block')){
    return "Trips MM-102 and MM-101 lag loaded%; QC backlog mainly on MM-102 (5 crates pending).";
  }
  return "Let me compute that from the latest buckets…";
}

// ---------- Data Fetching ----------
async function fetchDashboardArtifacts() {
  try {
    const response = await fetch('/api/analytics/dashboard');
    if (!response.ok) throw new Error('Failed to fetch dashboard artifacts');
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching dashboard artifacts:', error);
    return null;
  }
}

async function fetchRecommendations() {
  try {
    const response = await fetch('/api/analytics/recommendations');
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    const data = await response.json();
    return data.data?.recommendations || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

async function fetchSBLTimeline() {
  try {
    const response = await fetch('/api/metrics/sbl-timeline');
    if (!response.ok) throw new Error('Failed to fetch SBL timeline');
    const data = await response.json();
    return data.data?.timeline || [];
  } catch (error) {
    console.error('Error fetching SBL timeline:', error);
    return [];
  }
}

async function fetchPTLTimeline() {
  try {
    const response = await fetch('/api/metrics/ptl-timeline');
    if (!response.ok) throw new Error('Failed to fetch PTL timeline');
    const data = await response.json();
    return data.data?.timeline || [];
  } catch (error) {
    console.error('Error fetching PTL timeline:', error);
    return [];
  }
}

// Transform timeline data to chart format
function transformTimelineToChart(timeline: any[]) {
  return timeline.map(item => ({
    t: item.interval,
    lines: Math.round(item.productivity)
  }));
}

// ---------- Main Component ----------
export default function VapiWaveCopilotDual() {
  const [state, setState] = useState(makeInitialState());
  const [uiHighlights, setUiHighlights] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dashboardArtifacts, setDashboardArtifacts] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [modalOpen]);

  // Fetch real data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      try {
        const [artifacts, recs, sblTimeline, ptlTimeline] = await Promise.all([
          fetchDashboardArtifacts(),
          fetchRecommendations(),
          fetchSBLTimeline(),
          fetchPTLTimeline()
        ]);
        
        setDashboardArtifacts(artifacts);
        setRecommendations(recs);
        
        setState(prev => ({
          ...prev,
          sblBuckets: transformTimelineToChart(sblTimeline),
          ptlBuckets: transformTimelineToChart(ptlTimeline)
        }));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    loadData();
  }, []);

  const minutesLate = useMemo(()=> Math.round((state.projectedFinish.getTime() - cutoff.getTime())/60000), [state.projectedFinish]);
  const riskTone: 'good'|'warn'|'bad' = minutesLate <= -5 ? 'good' : minutesLate <= 0 ? 'warn' : 'bad';
  const riskLabel = minutesLate <= -5 ? 'LOW' : minutesLate <= 0 ? 'MEDIUM' : 'HIGH';
  const coverageTone = (p:number):'good'|'warn'|'bad' => p>=0.95? 'good' : p>=0.85? 'warn':'bad';
  const prodTone = (cur:number, tgt:number):'good'|'warn'|'bad' => cur>=tgt? 'good' : cur>=0.9*tgt? 'warn':'bad';

  const applyOTIF = () => {
    const newFinish = new Date(state.projectedFinish.getTime());
    newFinish.setMinutes(newFinish.getMinutes() - 47);
    setState(s => ({...s, projectedFinish: newFinish, valueCoveragePct: 0.92, lineCoveragePct: 0.82, highlight:'BOTTLENECK', prod: {...s.prod, sbl: {...s.prod.sbl, current: Math.min(s.prod.sbl.target, s.prod.sbl.current+18)}} }));
  };
  const applyInFull = () => {
    const newFinish = new Date(cutoff.getTime());
    newFinish.setMinutes(newFinish.getMinutes() + 35);
    setState(s => ({...s, projectedFinish: newFinish, valueCoveragePct: 1.0, lineCoveragePct: 0.98, highlight:'FUNNEL'}));
  };

  const handleQuery = (q:string, uiPatch?:any) => {
    // Handle UI patches from AI responses
    if (uiPatch?.highlight) {
      setUiHighlights(uiPatch.highlight);
      // Clear highlights after 3 seconds
      setTimeout(() => setUiHighlights([]), 3000);
    }
    
    // Legacy keyword-based highlighting (fallback)
    const t = q.toLowerCase();
    if(t.includes('sbl') && t.includes('ptl')){
      setState(s => ({...s, highlight:'SBL'}));
    } else if(t.includes('add 1 picker')){
      const jump = Math.round(state.prod.sbl.current * 0.12);
      const newFinish = new Date(state.projectedFinish.getTime());
      newFinish.setMinutes(newFinish.getMinutes() - 18);
      setState(s => ({...s, projectedFinish:newFinish, prod:{...s.prod, sbl:{...s.prod.sbl, current: s.prod.sbl.current + jump}}, highlight:'SBL'}));
    } else if(t.includes('which trips')){
      setState(s => ({...s, highlight:'FUNNEL'}));
    } else if(t.includes('why') || t.includes('risk')){
      setState(s => ({...s, highlight:'BOTTLENECK'}));
    } else {
      setState(s => ({...s, highlight:null}));
    }
  };

  const deltasOTIF = [
    { label: "ETA", before: fmtTime(state.projectedFinish), after: "15:32" },
    { label: "Value Coverage", before: pct(state.valueCoveragePct), after: "92%" },
    { label: "Line Coverage", before: pct(state.lineCoveragePct), after: "82%" },
  ];
  const deltasInFull = [
    { label: "ETA", before: fmtTime(state.projectedFinish), after: "16:05" },
    { label: "Value Coverage", before: pct(state.valueCoveragePct), after: "100%" },
    { label: "Line Coverage", before: pct(state.lineCoveragePct), after: "98%" },
  ];

  const basics = (
    <div className="flex items-center gap-6 text-sm text-slate-600">
      <div><span className="font-medium">Wave</span> #{state.waveId}</div>
      <div><span className="font-medium">Start</span> {fmtTime(state.startTime)}</div>
      <div><span className="font-medium">Total Lines</span> {state.totalLines}</div>
      <div><span className="font-medium">Cutoff</span> {fmtTime(cutoff)}</div>
    </div>
  );

  const WaveHeader = (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('WaveSummary', uiHighlights)}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm text-slate-500">Projected Finish</div>
          <div className="text-2xl font-semibold">{fmtTime(state.projectedFinish)} <span className="text-slate-400 text-base font-normal">(Cutoff {fmtTime(cutoff)})</span></div>
          <div className="mt-2">{basics}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto md:min-w-[520px]">
          <Stat title="OTIF Risk" value={riskLabel} tone={riskTone} sub="Detect→Decide→Do < 60s"/>
          <Stat title="Line Coverage" value={pct(state.lineCoveragePct)} tone={coverageTone(state.lineCoveragePct)} sub="across SBL/PTL/Full"/>
          <Stat title="Value Coverage" value={pct(state.valueCoveragePct)} tone={coverageTone(state.valueCoveragePct)} sub="proxy = crates"/>
          <Stat title="SBL Prod" value={`${state.prod.sbl.current}/h/stn`} tone={prodTone(state.prod.sbl.current, state.prod.sbl.target)} sub={`target ${state.prod.sbl.target}`}/>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-slate-50 border text-sm flex items-start gap-2"><Info size={16} className="mt-0.5"/> <div>Root cause: <b>{state.rootCauses[0].kind}</b> — {state.rootCauses[0].detail}. Secondary: {state.rootCauses[1].kind}.</div></div>
    </div>
  );

  const sblTrend = <Trend data={isDataLoading ? [] : state.sblBuckets} label="SBL · lines/10 min (per station)" highlight={state.highlight==='SBL'} componentId="SBLTrend" uiHighlights={uiHighlights} isLoading={isDataLoading} />;
  const ptlTrend = <Trend data={isDataLoading ? [] : state.ptlBuckets} label="PTL · lines/10 min (per station)" highlight={state.highlight==='PTL'} componentId="PTLTrend" uiHighlights={uiHighlights} isLoading={isDataLoading} />;

  // Unified 3-Panel Layout
  const UnifiedThreePanel = (
    <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {/* Left Panel: Wave Summary & Progress Funnel */}
      <div className="lg:col-span-1">
        {/* Wave Summary */}
        <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('WaveSummary', uiHighlights)}`}>
          <div className="font-semibold mb-3 flex items-center gap-2"><Activity size={16}/> Wave Summary</div>
          {dashboardArtifacts ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">Wave ID</div>
                  <div className="font-semibold">{dashboardArtifacts.macros?.waveInfo?.wave_id || 'N/A'}</div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">Total Lines</div>
                  <div className="font-semibold">{dashboardArtifacts.macros?.waveInfo?.total_order_lines || 0}</div>
                </div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">Projected Finish</div>
                <div className="font-semibold text-lg">
                  {dashboardArtifacts.overall_summary?.projected_finish_iso 
                    ? new Date(dashboardArtifacts.overall_summary.projected_finish_iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                    : 'N/A'
                  }
                </div>
                <div className="text-xs text-slate-500">
                  {dashboardArtifacts.overall_summary?.buffer_minutes 
                    ? `${dashboardArtifacts.overall_summary.buffer_minutes > 0 ? '+' : ''}${dashboardArtifacts.overall_summary.buffer_minutes} min`
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">SBL Coverage</div>
                  <div className="font-semibold">
                    {dashboardArtifacts.overall_summary?.sbl_coverage_pct 
                      ? `${Math.round(dashboardArtifacts.overall_summary.sbl_coverage_pct * 100)}%`
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500">PTL Coverage</div>
                  <div className="font-semibold">
                    {dashboardArtifacts.overall_summary?.ptl_coverage_pct 
                      ? `${Math.round(dashboardArtifacts.overall_summary.ptl_coverage_pct * 100)}%`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-4">
              <div className="text-sm">No data available</div>
              <div className="text-xs">Upload Excel files to see summary</div>
            </div>
          )}
        </div>

        {/* Wave Progress Funnel - Simplified */}
        <div className="rounded-2xl border p-4 bg-white shadow-sm mt-4">
          <div className="font-semibold mb-4 flex items-center gap-2"><Layers size={16}/> Wave Progress Funnel</div>
          
          <div className="space-y-4">
            {/* SBL Progress */}
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                SBL Operations
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">SBL Progress</span>
                <Badge tone={
                  (dashboardArtifacts?.sbl_stations?.reduce((sum: number, station: any) => sum + station.packed, 0) || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_sbl || 1) > 0.9 ? 'good' : 
                  (dashboardArtifacts?.sbl_stations?.reduce((sum: number, station: any) => sum + station.packed, 0) || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_sbl || 1) > 0.7 ? 'warn' : 'bad'
                }>
                  {Math.round((dashboardArtifacts?.sbl_stations?.reduce((sum: number, station: any) => sum + station.packed, 0) || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_sbl || 1) * 100)}%
                </Badge>
              </div>
              <Progress value={Math.min(100, ((dashboardArtifacts?.sbl_stations?.reduce((sum: number, station: any) => sum + station.packed, 0) || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_sbl || 1)) * 100)} />
              <div className="text-xs text-slate-500 mt-1">
                {dashboardArtifacts?.sbl_stations?.reduce((sum: number, station: any) => sum + station.packed, 0) || 0} / {dashboardArtifacts?.macros?.waveInfo?.split_lines_sbl || 0} Lines
              </div>
            </div>

            {/* PTL Progress */}
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                PTL Operations
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">PTL Progress</span>
                <Badge tone={
                  (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 0) === 0 ? 'warn' :
                  (dashboardArtifacts?.ptl_totals?.last_hour_lines || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 1) > 0.9 ? 'good' : 
                  (dashboardArtifacts?.ptl_totals?.last_hour_lines || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 1) > 0.7 ? 'warn' : 'bad'
                }>
                  {(dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 0) === 0 ? 'Not Started' :
                   Math.round(((dashboardArtifacts?.ptl_totals?.last_hour_lines || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 1)) * 100) + '%'}
                </Badge>
              </div>
              <Progress value={
                (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 0) === 0 ? 0 :
                Math.min(100, ((dashboardArtifacts?.ptl_totals?.last_hour_lines || 0) / (dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 1)) * 100)
              } />
              <div className="text-xs text-slate-500 mt-1">
                {dashboardArtifacts?.ptl_totals?.last_hour_lines || 0} / {dashboardArtifacts?.macros?.waveInfo?.split_lines_ptl || 0} Lines
              </div>
            </div>

            {/* Loading Progress */}
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                Loading Operations
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">Loading Progress</span>
                <Badge tone={
                  (dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + ((trip as any).total || 0), 0) || 0) === 0 ? 'warn' :
                  dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + trip.loaded_pct, 0) / (dashboardArtifacts?.trips?.length || 1) > 0.9 ? 'good' : 
                  dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + trip.loaded_pct, 0) / (dashboardArtifacts?.trips?.length || 1) > 0.7 ? 'warn' : 'bad'
                }>
                  {(dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + ((trip as any).total || 0), 0) || 0) === 0 ? 'Not Started' :
                   Math.round((dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + trip.loaded_pct, 0) || 0) / (dashboardArtifacts?.trips?.length || 1) * 100) + '%'}
                </Badge>
              </div>
              <Progress value={
                (dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + ((trip as any).total || 0), 0) || 0) === 0 ? 0 :
                Math.min(100, ((dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + trip.loaded_pct, 0) || 0) / (dashboardArtifacts?.trips?.length || 1)) * 100)
              } />
              <div className="text-xs text-slate-500 mt-1">
                {dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + Math.round(trip.loaded_pct * ((trip as any).total || 0)), 0) || 0} / {dashboardArtifacts?.trips?.reduce((sum: number, trip: any) => sum + ((trip as any).total || 0), 0) || 0} Crates
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel: Insights & Analytics */}
      <div className="lg:col-span-2 xl:col-span-3 space-y-4">
        {/* Key Metrics & Issue Summary - Enhanced UX */}
        {dashboardArtifacts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Key Metrics - Enhanced Design */}
            <div className="lg:col-span-2 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity size={20} className="text-blue-600"/>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Key Performance Metrics</h3>
                    <p className="text-sm text-slate-500">Real-time operational insights</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Line Coverage */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Line Coverage</span>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {Math.round((dashboardArtifacts.overall_summary?.line_coverage_pct || 0) * 100)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Overall progress</div>
                  </div>

                  {/* SBL Productivity */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">SBL Rate</span>
                      <TrendingDown size={14} className="text-red-500"/>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {dashboardArtifacts.sbl_stream?.ema_lph || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Lines per hour</div>
                  </div>

                  {/* PTL Productivity */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">PTL Rate</span>
                      <TrendingDown size={14} className="text-red-500"/>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {dashboardArtifacts.ptl_stream?.ema_lph || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Lines per hour</div>
                  </div>

                  {/* SBL Completion */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">SBL Done</span>
                      <CheckCircle size={14} className="text-green-500"/>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardArtifacts.sbl_stations?.length > 0 
                        ? Math.round((dashboardArtifacts.sbl_stations.reduce((sum: number, s: any) => sum + s.completion_pct, 0) / dashboardArtifacts.sbl_stations.length) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Completion rate</div>
                  </div>

                  {/* Active Stations */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Stations</span>
                      <Users size={14} className="text-blue-500"/>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {dashboardArtifacts.sbl_stations?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Active SBL</div>
                  </div>

                  {/* Active Trips */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Trips</span>
                      <Truck size={14} className="text-purple-500"/>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                      {dashboardArtifacts.trips?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">In progress</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Issue Summary - Enhanced Design with Actions */}
            {dashboardArtifacts.sbl_stations && (
              <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-lg">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle size={20} className="text-red-600"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Issue Summary</h3>
                      <p className="text-sm text-slate-500">Station health status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Productivity Issues - Clickable */}
                    <div 
                      className="bg-white rounded-xl p-4 border border-red-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const productivityIssues = dashboardArtifacts.sbl_stations.filter((s: any) => s.is_productivity_issue);
                        setModalContent({
                          title: 'Productivity Issues',
                          type: 'productivity',
                          count: productivityIssues.length,
                          stations: productivityIssues.map((s: any) => ({
                            station_code: s.station_code,
                            productivity: Math.round(s.last10_lph),
                            target: s.target_lph,
                            performance_pct: Math.round((s.last10_lph/s.target_lph)*100),
                            remaining: s.remaining
                          }))
                        });
                        setModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700">Productivity Issues</span>
                        </div>
                        <span className="text-2xl font-bold text-red-600">
                          {dashboardArtifacts.sbl_stations.filter((s: any) => s.is_productivity_issue).length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Infeed Issues - Clickable */}
                    <div 
                      className="bg-white rounded-xl p-4 border border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const infeedIssues = dashboardArtifacts.sbl_stations.filter((s: any) => s.is_infeed_issue);
                        setModalContent({
                          title: 'Infeed Issues',
                          type: 'infeed',
                          count: infeedIssues.length,
                          stations: infeedIssues.map((s: any) => ({
                            station_code: s.station_code,
                            infeed_rate: Math.round(s.recent_infeed_lph || 0),
                            productivity: Math.round(s.last10_lph),
                            remaining: s.remaining
                          }))
                        });
                        setModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700">Infeed Issues</span>
                        </div>
                        <span className="text-2xl font-bold text-orange-600">
                          {dashboardArtifacts.sbl_stations.filter((s: any) => s.is_infeed_issue).length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Healthy Stations - Clickable */}
                    <div 
                      className="bg-white rounded-xl p-4 border border-green-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const healthyStations = dashboardArtifacts.sbl_stations.filter((s: any) => s.issue_type === 'none');
                        setModalContent({
                          title: 'Healthy Stations',
                          type: 'healthy',
                          count: healthyStations.length,
                          stations: healthyStations.map((s: any) => ({
                            station_code: s.station_code,
                            productivity: Math.round(s.last10_lph),
                            target: s.target_lph,
                            performance_pct: Math.round((s.last10_lph/s.target_lph)*100),
                            remaining: s.remaining
                          }))
                        });
                        setModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700">Healthy Stations</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {dashboardArtifacts.sbl_stations.filter((s: any) => s.issue_type === 'none').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Recommendations Panel */}
        {recommendations.length > 0 && (
          <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('RecommendationsPanel', uiHighlights)}`}>
            <div className="font-medium mb-3 flex items-center gap-2"><Sparkles size={16}/> AI Recommendations</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.slice(0, 4).map((rec, idx) => (
                <RecommendationCard 
                  key={rec.id} 
                  recommendation={rec} 
                  componentId={`Recommendation_${idx}`}
                  uiHighlights={uiHighlights}
                />
              ))}
            </div>
            {recommendations.length > 4 && (
              <div className="text-xs text-slate-500 mt-2">
                +{recommendations.length - 4} more recommendations available
              </div>
            )}
          </div>
        )}
        
        {/* Productivity Trends with Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sblTrend}
          {ptlTrend}
        </div>
        
        {/* Station Performance - SBL & PTL */}
        {dashboardArtifacts?.sbl_stations && (
          <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('SBLStations', uiHighlights)}`}>
            <div className="font-medium mb-3 flex items-center gap-2"><Activity size={16}/> Station Performance</div>
            
            {/* SBL Stations - Top 3 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">SBL - Top 3 by Productivity</div>
              <div className="grid grid-cols-3 gap-2">
                {dashboardArtifacts.sbl_stations
                  .sort((a: any, b: any) => b.last10_lph - a.last10_lph)
                  .slice(0, 3)
                  .map((station: any) => (
                  <div key={station.station_code} className={`p-3 rounded-lg border text-center ${
                    station.health_color === 'green' ? 'bg-green-50 border-green-200' :
                    station.health_color === 'amber' ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="text-sm font-medium">{station.station_code}</div>
                    <div className="text-sm text-slate-600">{Math.round(station.last10_lph)} LPH</div>
                    <div className="text-sm text-slate-500">{Math.round(station.completion_pct * 100)}%</div>
                    {station.issue_type !== 'none' && (
                      <div className={`text-xs px-1 rounded mt-1 ${
                        station.issue_type === 'infeed' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {station.issue_type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SBL Stations - Bottom 3 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-700 mb-2">SBL - Bottom 3 by Productivity</div>
              <div className="grid grid-cols-3 gap-2">
                {dashboardArtifacts.sbl_stations
                  .sort((a: any, b: any) => a.last10_lph - b.last10_lph)
                  .slice(0, 3)
                  .map((station: any) => (
                  <div key={station.station_code} className={`p-3 rounded-lg border text-center ${
                    station.health_color === 'green' ? 'bg-green-50 border-green-200' :
                    station.health_color === 'amber' ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="text-sm font-medium">{station.station_code}</div>
                    <div className="text-sm text-slate-600">{Math.round(station.last10_lph)} LPH</div>
                    <div className="text-sm text-slate-500">{Math.round(station.completion_pct * 100)}%</div>
                    {station.issue_type !== 'none' && (
                      <div className={`text-xs px-1 rounded mt-1 ${
                        station.issue_type === 'infeed' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {station.issue_type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PTL Stations - if available */}
            {dashboardArtifacts?.ptl_totals?.by_station && dashboardArtifacts.ptl_totals.by_station.length > 0 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">PTL - Top 3 by Output</div>
                <div className="grid grid-cols-3 gap-2">
                  {dashboardArtifacts.ptl_totals.by_station
                    .sort((a: any, b: any) => b.lines_last_hour - a.lines_last_hour)
                    .slice(0, 3)
                    .map((station: any) => (
                    <div key={station.station_code} className="p-3 rounded-lg border text-center bg-blue-50 border-blue-200">
                      <div className="text-sm font-medium">{station.station_code}</div>
                      <div className="text-sm text-slate-600">{station.lines_last_hour} lines</div>
                      <div className="text-sm text-slate-500">{Math.round(station.productivity)} LPH</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Loading Status - Crates & Cases */}
        {dashboardArtifacts?.trips && (
          <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('LoadingStatus', uiHighlights)}`}>
            <div className="font-medium mb-3 flex items-center gap-2"><Truck size={16}/> Loading Status</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Crates */}
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Total Crates</div>
                <div className="text-2xl font-bold text-slate-800">
                  {dashboardArtifacts.trips.reduce((sum: number, trip: any) => sum + (trip.total || 0), 0)}
                </div>
                <div className="text-xs text-slate-500">Across all trips</div>
              </div>
              
              {/* Sorted Crates */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Sorted</div>
                <div className="text-2xl font-bold text-blue-800">
                  {Math.round(dashboardArtifacts.trips.reduce((sum: number, trip: any) => sum + (trip.sorted_pct * (trip.total || 0)), 0))}
                </div>
                <div className="text-xs text-blue-500">
                  {Math.round(dashboardArtifacts.trips.reduce((sum: number, trip: any) => sum + trip.sorted_pct, 0) / dashboardArtifacts.trips.length * 100)}% avg
                </div>
              </div>
              
              {/* Loaded Crates */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Loaded</div>
                <div className="text-2xl font-bold text-green-800">
                  {Math.round(dashboardArtifacts.trips.reduce((sum: number, trip: any) => sum + (trip.loaded_pct * (trip.total || 0)), 0))}
                </div>
                <div className="text-xs text-green-500">
                  {Math.round(dashboardArtifacts.trips.reduce((sum: number, trip: any) => sum + trip.loaded_pct, 0) / dashboardArtifacts.trips.length * 100)}% avg
                </div>
              </div>
            </div>
            
            {/* Trip-wise breakdown */}
            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700 mb-2">Trip-wise Progress</div>
              <div className="space-y-2">
                {dashboardArtifacts.trips.slice(0, 5).map((trip: any) => (
                  <div key={trip.mm_trip} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="text-xs font-mono">{trip.mm_trip.slice(-8)}</div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-blue-600">{Math.round(trip.sorted_pct * 100)}% sorted</span>
                      <span className="text-green-600">{Math.round(trip.loaded_pct * 100)}% loaded</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        trip.health_color === 'green' ? 'bg-green-100 text-green-800' :
                        trip.health_color === 'amber' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {trip.health_color}
                      </span>
                    </div>
                  </div>
                ))}
                {dashboardArtifacts.trips.length > 5 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{dashboardArtifacts.trips.length - 5} more trips
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SBL SKUs Status */}
        {dashboardArtifacts?.sbl_skus && dashboardArtifacts.sbl_skus.skus && dashboardArtifacts.sbl_skus.skus.length > 0 && (
          <div className={`rounded-2xl border p-4 bg-white shadow-sm ${getHighlightClass('SBLSKUs', uiHighlights)}`}>
            <div className="font-medium mb-3 flex items-center gap-2"><Package size={16}/> SBL SKUs Status</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Total SKUs */}
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Total SKUs</div>
                <div className="text-2xl font-bold text-slate-800">
                  {dashboardArtifacts.sbl_skus.summary.totalSKUs}
                </div>
                <div className="text-xs text-slate-500">Assigned to SBL</div>
              </div>
              
              {/* Pending SKUs */}
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-600 mb-1">Pending</div>
                <div className="text-2xl font-bold text-orange-800">
                  {dashboardArtifacts.sbl_skus.summary.pendingSKUs}
                </div>
                <div className="text-xs text-orange-500">Need feeding</div>
              </div>
              
              {/* Completed SKUs */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-800">
                  {dashboardArtifacts.sbl_skus.summary.completedSKUs}
                </div>
                <div className="text-xs text-green-500">Fully processed</div>
              </div>
              
              {/* Completion Rate */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Completion</div>
                <div className="text-2xl font-bold text-blue-800">
                  {Math.round(dashboardArtifacts.sbl_skus.summary.completionRate * 100)}%
                </div>
                <div className="text-xs text-blue-500">Overall progress</div>
              </div>
            </div>
            
            {/* Top Pending SKUs */}
            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700 mb-2">Top Pending SKUs by Lines</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dashboardArtifacts.sbl_skus.skus
                  .filter((sku: any) => sku.status === 'pending')
                  .sort((a: any, b: any) => b.pending_lines - a.pending_lines)
                  .slice(0, 5)
                  .map((sku: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono bg-orange-100 px-2 py-1 rounded">{sku.sku}</div>
                      <div className="text-xs text-slate-600">{sku.station_code}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-orange-600 font-semibold">{sku.pending_lines} pending</span>
                      <span className="text-slate-500">{sku.total_lines} total</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        sku.priority === 'high' ? 'bg-red-100 text-red-800' :
                        sku.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sku.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {dashboardArtifacts.sbl_skus.skus.filter((sku: any) => sku.status === 'pending').length > 5 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{dashboardArtifacts.sbl_skus.skus.filter((sku: any) => sku.status === 'pending').length - 5} more pending SKUs
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trip Progress Funnel */}
        <Funnel trips={state.trips} highlight={state.highlight==='FUNNEL'} componentId="TripsGrid" uiHighlights={uiHighlights} />
      </div>

        {/* Right Panel: Full Height Copilot */}
        <div className="lg:col-span-1 xl:col-span-1">
          <div className="h-[calc(100vh-8rem)] sticky top-4">
            <div className="h-full w-96 rounded-2xl border-2 border-blue-200 bg-white shadow-lg overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Copilot Header */}
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot size={20} className="text-blue-600"/>
                    <span className="font-semibold text-blue-800">Warehouse Copilot</span>
                  </div>
                </div>
                
                {/* API Key Input for Testing */}
                {showApiKeyInput && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mx-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-yellow-800">API Key (Testing)</span>
                      <button 
                        onClick={() => setShowApiKeyInput(false)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter Gemini API Key"
                      className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                    <button
                      onClick={() => {
                        if (apiKey) {
                          localStorage.setItem('gemini_api_key', apiKey);
                          window.location.reload();
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                    >
                      Set API Key
                    </button>
                  </div>
                )}
                
                {!showApiKeyInput && (
                  <div className="px-4 mb-4">
                    <button
                      onClick={() => setShowApiKeyInput(true)}
                      className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                    >
                      Set API Key (Testing)
                    </button>
                  </div>
                )}

                {/* Copilot Content - Scrollable */}
                <div className="flex-1 overflow-hidden">
                  <CopilotPanel 
                    onQuery={handleQuery}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white grid place-items-center font-semibold">SB</div>
            <div>
              <div className="font-semibold leading-tight">StackBOX Copilot — HUL Vapi</div>
              <div className="text-xs text-slate-500">Outbound · Wave {state.waveId}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Status Indicator */}
            {dashboardArtifacts && (
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${dashboardArtifacts.calculation_timestamp ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-slate-600">
                  {dashboardArtifacts.calculation_timestamp 
                    ? `Data updated ${new Date(dashboardArtifacts.calculation_timestamp).toLocaleTimeString()}`
                    : 'No data available'
                  }
                </span>
              </div>
            )}
            <ExcelUpload onUploadComplete={() => {
              // Refresh data after upload
              const loadData = async () => {
                setIsDataLoading(true);
                try {
                  const [artifacts, recs, sblTimeline, ptlTimeline] = await Promise.all([
                    fetchDashboardArtifacts(),
                    fetchRecommendations(),
                    fetchSBLTimeline(),
                    fetchPTLTimeline()
                  ]);
                  
                  setDashboardArtifacts(artifacts);
                  setRecommendations(recs);
                  
                  setState(prev => ({
                    ...prev,
                    sblBuckets: transformTimelineToChart(sblTimeline),
                    ptlBuckets: transformTimelineToChart(ptlTimeline)
                  }));
                } catch (error) {
                  console.error('Error loading data:', error);
                } finally {
                  setIsDataLoading(false);
                }
              };
              loadData();
            }} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-8">
        {UnifiedThreePanel}
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">Prototype · Mock data · Writes disabled</footer>

      {/* Modal for Issue Details */}
      {modalOpen && modalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">{modalContent.title}</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-slate-600 mb-2">
                {modalContent.count} stations found
              </div>
              {modalContent.type === 'productivity' && (
                <div className="text-sm text-slate-500">
                  These stations are performing below target productivity. Check equipment, training, or workflow issues.
                </div>
              )}
              {modalContent.type === 'infeed' && (
                <div className="text-sm text-slate-500">
                  These stations have low infeed rates. Check conveyor system and carton availability.
                </div>
              )}
              {modalContent.type === 'healthy' && (
                <div className="text-sm text-slate-500">
                  These stations are performing well within target range.
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {modalContent.stations.map((station: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-800">{station.station_code}</div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        station.station_code.startsWith('V') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {station.station_code.startsWith('V') ? 'SBL' : 'PTL'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {modalContent.type === 'infeed' ? (
                        `Infeed: ${station.infeed_rate} LPH`
                      ) : (
                        `${station.productivity} LPH (${station.performance_pct}% of target)`
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {station.remaining} lines remaining
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setModalOpen(false)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 