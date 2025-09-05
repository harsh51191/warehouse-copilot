'use client'

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Activity, Layers, Truck, Bot, Info, Sparkles, SlidersHorizontal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from "recharts";

/**
 * Vapi Wave Copilot – Two UX Variants in one file:
 * 1) HYBRID COPILOT: Key UI fixed on the left, conversational panel on the right.
 * 2) THREE-PANEL: Funnel (left) · Bottleneck & Prescription (center) · Co-Pilot (right)
 *
 * Notes:
 * - Mock data only; writes disabled.
 * - Color semantics: green (good), amber (watch), red (risk).
 * - Chat queries update left/center UI (simulate DSS behavior).
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

function Trend({data, label, highlight}:{data:{t:string, lines:number}[]; label:string; highlight?:boolean}){
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${highlight? 'ring-2 ring-amber-300': ''}`}>
      <div className="flex items-center justify-between mb-2"><div className="font-medium">{label}</div></div>
      <div className="h-40">
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
      </div>
    </div>
  )
}

function Funnel({trips, highlight}:{trips:any[]; highlight?:boolean}){
  const rows = trips.map(tr=>({
    trip: tr.trip,
    sortedPct: tr.total? Math.round((tr.sorted / tr.total)*100):0,
    stagedPct: tr.total? Math.round((tr.staged / tr.total)*100):0,
    loadedPct: tr.total? Math.round((tr.loaded / tr.total)*100):0,
    qc: tr.qc
  }))
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${highlight? 'ring-2 ring-amber-300': ''}`}>
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

function CopilotPanel({onQuery}:{onQuery:(q:string)=>void}){
  const [messages, setMessages] = useState<any[]>([
    { role: "ai", text: "Hi! Ask about Wave 3, or tap a suggestion below."},
  ]);
  const [input, setInput] = useState("");
  const suggestions = [
    "Why is Wave 3 at risk?",
    "Show SBL vs PTL productivity",
    "Add 1 picker to Loop 2",
    "Which trips block OTIF?",
  ];
  const send = (txt?:string) => {
    const q = (txt ?? input).trim();
    if(!q) return;
    const reply = routeQueryToReply(q);
    setMessages(prev => [...prev, {role:'user', text:q}, {role:'ai', text:reply}]);
    setInput("");
    onQuery(q);
  };
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between"><div className="flex items-center gap-2 font-semibold"><Bot size={18}/> Copilot</div></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m,idx)=> (
          <div key={idx} className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role==='ai'? 'bg-slate-100':'bg-slate-900 text-white ml-auto'}`}>{m.text}</div>
        ))}
        <div className="flex gap-2 flex-wrap pt-2">
          {suggestions.map(s => <button key={s} onClick={()=>send(s)} className="text-xs border rounded-full px-3 py-1 hover:bg-slate-50">{s}</button>)}
        </div>
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a question…" className="flex-1 border rounded-xl px-3 py-2"/>
        <button onClick={()=>send()} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Send</button>
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

// ---------- Main Component ----------
export default function VapiWaveCopilotDual() {
  const [mode, setMode] = useState<'HYBRID'|'THREEPANEL'>('HYBRID');
  const [state, setState] = useState(makeInitialState());

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

  const handleQuery = (q:string) => {
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
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm text-slate-500">Projected Finish</div>
          <div className="text-2xl font-semibold">{fmtTime(state.projectedFinish)} <span className="text-slate-400 text-base font-normal">(Cutoff {fmtTime(cutoff)})</span></div>
          <div className="mt-2">{basics}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto md:min-w-[520px] ml-4">
          <Stat title="OTIF Risk" value={riskLabel} tone={riskTone} sub="Detect→Decide→Do < 60s"/>
          <Stat title="Line Coverage" value={pct(state.lineCoveragePct)} tone={coverageTone(state.lineCoveragePct)} sub="across SBL/PTL/Full"/>
          <Stat title="Value Coverage" value={pct(state.valueCoveragePct)} tone={coverageTone(state.valueCoveragePct)} sub="proxy = crates"/>
          <Stat title="SBL Prod" value={`${state.prod.sbl.current}/h/stn`} tone={prodTone(state.prod.sbl.current, state.prod.sbl.target)} sub={`target ${state.prod.sbl.target}`}/>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-slate-50 border text-sm flex items-start gap-2"><Info size={16} className="mt-0.5"/> <div>Root cause: <b>{state.rootCauses[0].kind}</b> — {state.rootCauses[0].detail}. Secondary: {state.rootCauses[1].kind}.</div></div>
    </div>
  );

  const sblTrend = <Trend data={state.sblBuckets} label="SBL · lines/10 min (per station)" highlight={state.highlight==='SBL'} />;
  const ptlTrend = <Trend data={state.ptlBuckets} label="PTL · lines/10 min (per station)" highlight={state.highlight==='PTL'} />;

  const Hybrid = (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="xl:col-span-2 space-y-4">
        {WaveHeader}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Prescription title="Option A · Prioritise OTIF (move 12 low-value lines)" deltas={deltasOTIF} onApply={applyOTIF} variant="otif"/>
          <Prescription title="Option B · Prioritise In-Full (hold for replen/QC)" deltas={deltasInFull} onApply={applyInFull} variant="infull"/>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sblTrend}
          {ptlTrend}
        </div>
        <div className={`rounded-2xl border p-4 bg-white shadow-sm ${state.highlight==='FUNNEL'? 'ring-2 ring-amber-300':''}`}>
          <div className="font-medium mb-2 flex items-center gap-2"><Activity size={16}/> Conveyor FEED throughput</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={state.conveyorBuckets} margin={{left:8, right:8, top:10, bottom:0}}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{fontSize:12}}/>
                <YAxis tick={{fontSize:12}}/>
                <Tooltip />
                <Area type="monotone" dataKey="cartons" stroke="#0f172a" fillOpacity={1} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-500 mt-2">Drop at 14:20 suggests staging starvation.</div>
        </div>
        <Funnel trips={state.trips} highlight={state.highlight==='FUNNEL'} />
      </section>
      <aside className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <CopilotPanel onQuery={handleQuery} />
      </aside>
    </div>
  );

  const ThreePanel = (
    <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div className="lg:col-span-1">
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <div className="font-semibold mb-2 flex items-center gap-2"><Layers size={16}/> Wave Progress Funnel</div>
          <div className="space-y-3">
            {[
              {label:'Allocated', val:1500, tone:'good'},
              {label:'Picking Started', val:1250, tone:'warn'},
              {label:'Picked (SBL/PTL/Case)', val:900, tone:'warn'},
              {label:'Packed/Closed', val:750, tone:'warn'},
              {label:'Staged for Dispatch', val:400, tone:'bad'},
            ].map((r)=> (
              <div key={r.label} className="">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{r.label}</span>
                  <Badge tone={r.tone as any}>{r.tone==='good'? 'Green':'Amber'}</Badge>
                </div>
                <Progress value={Math.min(100, (r.val/1500)*100)} />
                <div className="text-xs text-slate-500 mt-1">{r.val} Lines</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border p-4 bg-white shadow-sm mt-4">
          <div className="font-medium mb-1">Drum-Buffer-Rope</div>
          <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
            <li><b>Drum:</b> PTL packing (constraint)</li>
            <li><b>Buffer:</b> 45 min deficit vs 15:30 cutoff</li>
            <li><b>Rope:</b> Pace SBL to match PTL; avoid overfeeding QC</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-2 xl:col-span-3 space-y-4">
        {WaveHeader}
        <div className={`rounded-2xl border p-4 bg-white shadow-sm ${state.highlight==='BOTTLENECK'? 'ring-2 ring-rose-300':''}`}>
          {minutesLate>0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-rose-700 flex itemscenter gap-2"><AlertTriangle size={18}/> ALERT: OTIF AT RISK</div>
                <Badge tone={'bad'}>Late by {minutesLate} min</Badge>
              </div>
              <div className="text-sm text-slate-700 mb-3">Bottleneck is <b>PTL Picking</b> — productivity is {Math.round((state.prod.ptl.current/state.prod.ptl.target-1)*100)}% below target; projecting delay to wave.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Prescription title="Option A · Prioritise Order Value (OTIF)" deltas={deltasOTIF} onApply={applyOTIF} variant="otif"/>
                <Prescription title="Option B · Prioritise Line Fill (In-Full)" deltas={deltasInFull} onApply={applyInFull} variant="infull"/>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={18}/> Wave {state.waveId} is ON TRACK</div>
                <Badge tone={'good'}>Ahead of cutoff</Badge>
              </div>
              <div className="text-sm text-slate-700 mt-2">Projected completion {fmtTime(state.projectedFinish)} (ahead). Opportunity: Picker #12 highly efficient; consider assigning complex orders in next wave.</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sblTrend}
          {ptlTrend}
        </div>
      </div>

      <aside className="lg:col-span-1 rounded-2xl border bg-white shadow-sm overflow-hidden">
        <CopilotPanel onQuery={handleQuery} />
      </aside>
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
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-xs text-slate-500 mr-2">Switch layout</div>
            <div className="flex items-center gap-2 border rounded-xl px-2 py-1 bg-white">
              <button onClick={()=>setMode('HYBRID')} className={`text-xs px-2 py-1 rounded-lg ${mode==='HYBRID'? 'bg-slate-900 text-white':'hover:bg-slate-50'}`}>Hybrid</button>
              <button onClick={()=>setMode('THREEPANEL')} className={`text-xs px-2 py-1 rounded-lg ${mode==='THREEPANEL'? 'bg-slate-900 text-white':'hover:bg-slate-50'}`}>Three‑Panel</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {mode==='HYBRID'? Hybrid : ThreePanel}
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">Prototype · Mock data · Writes disabled</footer>
    </div>
  );
} 