import { DashboardArtifacts, SBLStation, TripRisk } from './dashboard-artifacts';
import { STAGE_TARGETS, THRESHOLDS } from '../config/stage-targets';

export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  impact_estimate: string;
  actions: string[];
  confidence: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SBL' | 'PTL' | 'LOADING' | 'OVERALL';
}

export class RecommendationEngine {
  generateRecommendations(artifacts: DashboardArtifacts): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // P1 - SBL Starvation Analysis
    const starvedStations = artifacts.sbl_stations.filter(s => s.starved);
    if (starvedStations.length > 0) {
      recommendations.push({
        id: 'P1_SBL_STARVATION',
        title: 'Retask feeder to starved SBL stations',
        rationale: `${starvedStations.length} SBL stations are starved (${starvedStations.map(s => s.station_code).join(', ')}). Low infeed is causing productivity drops.`,
        impact_estimate: `+${Math.round(starvedStations.length * 15)} LPH expected improvement`,
        actions: [
          `Focus infeed on stations: ${starvedStations.map(s => s.station_code).join(', ')}`,
          'Check conveyor system and carton availability',
          'Monitor infeed rates every 10 minutes'
        ],
        confidence: 0.85,
        priority: 'HIGH',
        category: 'SBL'
      });
    }

    // P2 - PTL Capacity Shortfall
    if (artifacts.ptl_stream.shortfall) {
      const shortfallPercent = Math.round(artifacts.ptl_stream.shortfall_factor * 100);
      recommendations.push({
        id: 'P2_PTL_CAPACITY',
        title: 'Add picker to PTL to address capacity shortfall',
        rationale: `PTL is ${shortfallPercent}% below target (${artifacts.ptl_stream.ema_lph}/${STAGE_TARGETS.PTL.target_lph} LPH). Capacity constraint is limiting overall throughput.`,
        impact_estimate: `+${Math.round(STAGE_TARGETS.PTL.target_lph * 0.15)} LPH expected improvement`,
        actions: [
          'Add 1 picker to PTL zone',
          'Reassign picker from less critical area',
          'Monitor PTL productivity after staffing change'
        ],
        confidence: 0.80,
        priority: 'HIGH',
        category: 'PTL'
      });
    }

    // P3 - Trip Risk Management
    const highRiskTrips = artifacts.trips.filter(t => t.risk >= THRESHOLDS.risk_threshold_trip);
    if (highRiskTrips.length > 0) {
      const topRiskTrip = highRiskTrips.sort((a, b) => b.risk - a.risk)[0];
      recommendations.push({
        id: 'P3_TRIP_RISK',
        title: 'Resequence trips or open extra dock',
        rationale: `${highRiskTrips.length} trips at high risk. ${topRiskTrip.mm_trip} has ${Math.round(topRiskTrip.risk * 100)}% risk score due to ${this.getRiskFactors(topRiskTrip)}.`,
        impact_estimate: 'Prevent 15-30 min delays per high-risk trip',
        actions: [
          `Prioritize ${topRiskTrip.mm_trip} for loading`,
          'Open additional dock door if available',
          'Resequence trips by risk score'
        ],
        confidence: 0.75,
        priority: 'MEDIUM',
        category: 'LOADING'
      });
    }

    // P4 - Overall OTIF Risk
    if (artifacts.overall_summary.otif_risk === 'HIGH') {
      recommendations.push({
        id: 'P4_OTIF_RISK',
        title: 'Critical: Wave at high OTIF risk',
        rationale: `Projected finish is ${artifacts.overall_summary.buffer_minutes} minutes late. Line coverage at ${Math.round(artifacts.overall_summary.line_coverage_pct * 100)}%.`,
        impact_estimate: 'Prevent OTIF failure and customer penalties',
        actions: [
          'Implement all available recommendations immediately',
          'Consider deprioritizing low-value orders',
          'Escalate to warehouse manager'
        ],
        confidence: 0.90,
        priority: 'HIGH',
        category: 'OVERALL'
      });
    }

    // P5 - SBL Productivity Trend
    if (artifacts.sbl_stream.trend === 'down' && artifacts.sbl_stream.ema_lph < STAGE_TARGETS.SBL.target_lph * 0.9) {
      recommendations.push({
        id: 'P5_SBL_TREND',
        title: 'SBL productivity declining - investigate root cause',
        rationale: `SBL productivity trending down (${artifacts.sbl_stream.ema_lph} LPH, slope: ${artifacts.sbl_stream.slope}). Below 90% of target.`,
        impact_estimate: 'Prevent further productivity decline',
        actions: [
          'Check for equipment issues or bottlenecks',
          'Review picker performance and training needs',
          'Analyze infeed consistency'
        ],
        confidence: 0.70,
        priority: 'MEDIUM',
        category: 'SBL'
      });
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.confidence - a.confidence;
    });
  }

  private getRiskFactors(trip: TripRisk): string {
    const factors = [];
    if (trip.risk_factors.behind_sorted > 0.3) factors.push('sorting delays');
    if (trip.risk_factors.qc_ratio > 0.2) factors.push('QC backlog');
    if (trip.risk_factors.door_norm > 0.5) factors.push('dock congestion');
    if (trip.risk_factors.trend_down > 0) factors.push('declining trend');
    
    return factors.length > 0 ? factors.join(', ') : 'general delays';
  }

  generateFactBasedAnswer(question: string, artifacts: DashboardArtifacts): string {
    // Try specific handlers first (for common questions)
    const specificAnswer = this.trySpecificHandlers(question, artifacts);
    if (specificAnswer) {
      return specificAnswer;
    }
    
    // Fall back to LLM with structured data context
    return this.generateLLMAnswer(question, artifacts);
  }

  private trySpecificHandlers(question: string, artifacts: DashboardArtifacts): string | null {
    const lowerQuestion = question.toLowerCase();
    
    // Handle questions about total lines
    if (lowerQuestion.includes('total lines')) {
      const totalLines = artifacts.macros?.waveInfo?.total_order_lines || 0;
      const sblLines = artifacts.macros?.waveInfo?.split_lines_sbl || 0;
      const ptlLines = artifacts.macros?.waveInfo?.split_lines_ptl || 0;
      const fcLines = artifacts.macros?.waveInfo?.split_lines_fc || 0;
      const packedLines = artifacts.sbl_stations.reduce((sum, station) => sum + station.packed, 0);
      const remainingLines = totalLines - packedLines;
      const completionPct = totalLines > 0 ? (packedLines / totalLines) * 100 : 0;
      
      return `Wave Total Lines: ${totalLines.toLocaleString()} lines\n\nBreakdown:\n• SBL: ${sblLines.toLocaleString()} lines\n• PTL: ${ptlLines.toLocaleString()} lines\n• FC: ${fcLines.toLocaleString()} lines\n\nProgress: ${packedLines.toLocaleString()} lines completed (${completionPct.toFixed(1)}%), ${remainingLines.toLocaleString()} lines remaining.`;
    }
    
    // Handle SBL lines questions
    if (lowerQuestion.includes('sbl lines') || lowerQuestion.includes('sbl line')) {
      const sblLines = artifacts.macros?.waveInfo?.split_lines_sbl || 0;
      const activeStations = artifacts.sbl_stations.length;
      const packedLines = artifacts.sbl_stations.reduce((sum, station) => sum + station.packed, 0);
      
      return `There are currently ${activeStations} active SBL stations with a total of ${sblLines.toLocaleString()} SBL lines assigned. ${packedLines.toLocaleString()} lines have been packed so far.`;
    }
    
    // Handle SBL station count questions
    if (lowerQuestion.includes('sbl station') && (lowerQuestion.includes('how many') || lowerQuestion.includes('count') || lowerQuestion.includes('number') || lowerQuestion.includes('active'))) {
      const activeStations = artifacts.sbl_stations.length;
      const starvedStations = artifacts.sbl_stations.filter(s => s.starved).length;
      const completedStations = artifacts.sbl_stations.filter(s => s.completion_pct >= 0.95).length;
      
      return `There are ${activeStations} SBL stations total. ${completedStations} stations are 95%+ complete, ${starvedStations} stations are starved. Average completion: ${Math.round(artifacts.sbl_stations.reduce((sum, s) => sum + s.completion_pct, 0) / activeStations * 100)}%.`;
    }
    
    // Handle SBL productivity questions
    if (lowerQuestion.includes('sbl productivity') && (lowerQuestion.includes('hour') || lowerQuestion.includes('avg'))) {
      const emaLPH = artifacts.sbl_stream?.ema_lph || 0;
      const lastHourAvg = artifacts.sbl_stream?.last_hour_avg || 0;
      const targetLPH = STAGE_TARGETS.SBL.target_lph;
      
      // Calculate actual productivity from stations if stream data is 0
      if (emaLPH === 0 && lastHourAvg === 0 && artifacts.sbl_stations && artifacts.sbl_stations.length > 0) {
        const totalPacked = artifacts.sbl_stations.reduce((sum, s) => sum + (s.packed || 0), 0);
        const totalStations = artifacts.sbl_stations.length;
        const avgProductivity = totalStations > 0 ? Math.round(totalPacked / totalStations) : 0;
        
        return `SBL productivity averaged ${avgProductivity} lines per station. Total packed: ${totalPacked} lines across ${totalStations} stations.`;
      }
      
      if (emaLPH === 0 && lastHourAvg === 0) {
        return `SBL productivity data is not available in the uploaded files. To get accurate productivity metrics, please upload the 'sbl_productivity.xlsx' file which contains interval-based productivity data.`;
      }
      
      return `Average SBL productivity in the last hour was ${lastHourAvg} LPH (${Math.round((lastHourAvg / targetLPH) * 100)}% of target). Current EMA is ${emaLPH} LPH with a ${artifacts.sbl_stream.trend} trend.`;
    }
    
    // Handle SBL station productivity ranking questions
    if (lowerQuestion.includes('sbl') && (lowerQuestion.includes('lowest') || lowerQuestion.includes('worst') || lowerQuestion.includes('bottom')) && lowerQuestion.includes('productivity')) {
      if (artifacts.sbl_stations.length === 0) {
        return `SBL station data is not available. Please upload the 'line_completion_2.xlsx' and 'sbl_table_lines.xlsx' files to get station productivity information.`;
      }
      
      // Sort stations by productivity (lowest first)
      const sortedStations = [...artifacts.sbl_stations].sort((a, b) => a.last10_lph - b.last10_lph);
      const lowestStation = sortedStations[0];
      const targetLPH = STAGE_TARGETS.SBL.target_lph;
      const performancePct = Math.round((lowestStation.last10_lph / targetLPH) * 100);
      
      return `The station with the lowest productivity in SBL is ${lowestStation.station_code} at ${lowestStation.last10_lph} LPH (${performancePct}% of target). This station has ${lowestStation.remaining} lines remaining and is ${lowestStation.issue_type === 'infeed' ? 'experiencing infeed issues' : lowestStation.issue_type === 'productivity' ? 'experiencing productivity issues' : 'performing normally'}.`;
    }
    
    // Handle SBL station productivity ranking questions (highest)
    if (lowerQuestion.includes('sbl') && (lowerQuestion.includes('highest') || lowerQuestion.includes('best') || lowerQuestion.includes('top')) && lowerQuestion.includes('productivity')) {
      if (artifacts.sbl_stations.length === 0) {
        return `SBL station data is not available. Please upload the 'line_completion_2.xlsx' and 'sbl_table_lines.xlsx' files to get station productivity information.`;
      }
      
      // Sort stations by productivity (highest first)
      const sortedStations = [...artifacts.sbl_stations].sort((a, b) => b.last10_lph - a.last10_lph);
      const highestStation = sortedStations[0];
      const targetLPH = STAGE_TARGETS.SBL.target_lph;
      const performancePct = Math.round((highestStation.last10_lph / targetLPH) * 100);
      
      return `The station with the highest productivity in SBL is ${highestStation.station_code} at ${highestStation.last10_lph} LPH (${performancePct}% of target). This station has ${highestStation.remaining} lines remaining and is performing well.`;
    }
    
    // Handle PTL station count questions
    if (lowerQuestion.includes('ptl station') && (lowerQuestion.includes('how many') || lowerQuestion.includes('count') || lowerQuestion.includes('number') || lowerQuestion.includes('active'))) {
      const activeStations = artifacts.ptl_totals?.by_station?.length || 0;
      const totalLines = artifacts.ptl_totals?.last_hour_lines || 0;
      const avgProductivity = activeStations > 0 ? (artifacts.ptl_totals.by_station.reduce((sum: number, s: any) => sum + (s.productivity || 0), 0) / activeStations) : 0;
      
      return `There are ${activeStations} PTL stations active. Total lines processed in last hour: ${totalLines}. Average productivity: ${Math.round(avgProductivity)} LPH.`;
    }

    // Handle PTL performance questions
    if (lowerQuestion.includes('ptl') && (lowerQuestion.includes('performing') || lowerQuestion.includes('performance'))) {
      const emaLPH = artifacts.ptl_stream.ema_lph;
      const lastHourAvg = artifacts.ptl_stream.last_hour_avg;
      const targetLPH = STAGE_TARGETS.PTL.target_lph;
      const performancePct = Math.round((lastHourAvg / targetLPH) * 100);
      
      if (emaLPH === 0 && lastHourAvg === 0) {
        return `PTL performance data is not available in the uploaded files. To get accurate performance metrics, please upload the 'ptl_productivity.xlsx' file which contains interval-based productivity data.`;
      }
      
      let response = `PTL Performance Status:\n`;
      response += `• Current productivity: ${lastHourAvg} LPH (${performancePct}% of target)\n`;
      response += `• EMA trend: ${emaLPH} LPH (${artifacts.ptl_stream.trend})\n`;
      
      if (artifacts.ptl_stream.shortfall) {
        response += `• ⚠️ Capacity shortfall: ${Math.round(artifacts.ptl_stream.shortfall_factor * 100)}% below target\n`;
        response += `• Recommendation: Add 1 picker to improve capacity`;
      } else {
        response += `• ✅ Performing well within target range`;
      }
      
      return response;
    }

    // Handle PTL productivity questions
    if (lowerQuestion.includes('ptl productivity') && (lowerQuestion.includes('hour') || lowerQuestion.includes('avg'))) {
      const emaLPH = artifacts.ptl_stream.ema_lph;
      const lastHourAvg = artifacts.ptl_stream.last_hour_avg;
      const targetLPH = STAGE_TARGETS.PTL.target_lph;
      
      if (emaLPH === 0 && lastHourAvg === 0) {
        return `PTL productivity data is not available in the uploaded files. To get accurate productivity metrics, please upload the 'ptl_productivity.xlsx' file which contains interval-based productivity data.`;
      }
      
      const performancePct = Math.round((lastHourAvg / targetLPH) * 100);
      const shortfallMsg = artifacts.ptl_stream.shortfall ? ` PTL has a capacity shortfall of ${Math.round(artifacts.ptl_stream.shortfall_factor * 100)}% below target.` : '';
      
      return `Average PTL productivity in the last hour was ${lastHourAvg} LPH (${performancePct}% of target). Current EMA is ${emaLPH} LPH with a ${artifacts.ptl_stream.trend} trend.${shortfallMsg}`;
    }
    
    // Handle station attention questions
    if (lowerQuestion.includes('station') && (lowerQuestion.includes('attention') || lowerQuestion.includes('need') || lowerQuestion.includes('problem'))) {
      const productivityIssues = artifacts.sbl_stations.filter(s => s.is_productivity_issue);
      const infeedIssues = artifacts.sbl_stations.filter(s => s.is_infeed_issue);
      const starvedStations = artifacts.sbl_stations.filter(s => s.starved);
      
      let response = `Stations Needing Attention:\n\n`;
      
      if (starvedStations.length > 0) {
        response += `🚨 STARVED STATIONS (${starvedStations.length}):\n`;
        starvedStations.forEach(s => {
          response += `• ${s.station_code}: ${s.remaining} lines remaining, ${Math.round(s.last10_lph)} LPH (target: ${s.target_lph})\n`;
        });
        response += `Action: Improve infeed rates to these stations\n\n`;
      }
      
      if (productivityIssues.length > 0) {
        response += `⚠️ PRODUCTIVITY ISSUES (${productivityIssues.length}):\n`;
        productivityIssues.slice(0, 5).forEach(s => {
          response += `• ${s.station_code}: ${Math.round(s.last10_lph)} LPH (${Math.round((s.last10_lph/s.target_lph)*100)}% of target)\n`;
        });
        if (productivityIssues.length > 5) {
          response += `• ... and ${productivityIssues.length - 5} more\n`;
        }
        response += `Action: Check equipment, training, or workflow issues\n\n`;
      }
      
      if (infeedIssues.length > 0) {
        response += `📦 INFEED ISSUES (${infeedIssues.length}):\n`;
        infeedIssues.slice(0, 5).forEach(s => {
          response += `• ${s.station_code}: ${Math.round(s.recent_infeed_lph || 0)} LPH infeed (low)\n`;
        });
        if (infeedIssues.length > 5) {
          response += `• ... and ${infeedIssues.length - 5} more\n`;
        }
        response += `Action: Check conveyor system and carton availability\n\n`;
      }
      
      if (starvedStations.length === 0 && productivityIssues.length === 0 && infeedIssues.length === 0) {
        response += `✅ All stations are performing well. No immediate attention needed.`;
      }
      
      return response;
    }

    if (lowerQuestion.includes('why') && lowerQuestion.includes('sbl')) {
      const starvedStations = artifacts.sbl_stations.filter(s => s.starved);
      if (starvedStations.length > 0) {
        return `SBL completion is low because ${starvedStations.length} stations are starved (${starvedStations.map(s => s.station_code).join(', ')}). This is due to insufficient infeed, not slow pickers. Focus on improving infeed rates rather than adding SBL staff.`;
      }
      return `SBL is running at ${artifacts.sbl_stream.ema_lph} LPH (${Math.round((artifacts.sbl_stream.ema_lph / STAGE_TARGETS.SBL.target_lph) * 100)}% of target). ${artifacts.sbl_stream.trend === 'down' ? 'Productivity is declining - investigate equipment or training issues.' : 'Performance is stable.'}`;
    }

    // Handle trend questions
    if (lowerQuestion.includes('trend')) {
      if (lowerQuestion.includes('sbl')) {
        const sblTrend = artifacts.sbl_stream?.trend || 'stable';
        const sblEma = artifacts.sbl_stream?.ema_lph || 0;
        const sblLastHour = artifacts.sbl_stream?.last_hour_avg || 0;
        return `SBL Trend: ${sblTrend} (${Math.round(sblEma)} LPH EMA, ${Math.round(sblLastHour)} LPH last hour). ${sblTrend === 'up' ? 'Productivity is improving.' : sblTrend === 'down' ? 'Productivity is declining - investigate issues.' : 'Productivity is stable.'}`;
      } else if (lowerQuestion.includes('ptl')) {
        const ptlTrend = artifacts.ptl_stream?.trend || 'stable';
        const ptlEma = artifacts.ptl_stream?.ema_lph || 0;
        const ptlLastHour = artifacts.ptl_stream?.last_hour_avg || 0;
        return `PTL Trend: ${ptlTrend} (${Math.round(ptlEma)} LPH EMA, ${Math.round(ptlLastHour)} LPH last hour). ${ptlTrend === 'up' ? 'Productivity is improving.' : ptlTrend === 'down' ? 'Productivity is declining - investigate issues.' : 'Productivity is stable.'}`;
      }
    }

    // Handle projected finish time questions
    if (lowerQuestion.includes('projected') && lowerQuestion.includes('finish')) {
      const finishTime = (artifacts.macros?.waveInfo as any)?.projected_finish_iso || 'Unknown';
      const bufferMinutes = artifacts.overall_summary?.buffer_minutes || 0;
      return `Projected Finish Time: ${finishTime}. Current buffer: ${bufferMinutes} minutes (${bufferMinutes < 0 ? 'behind schedule' : 'ahead of schedule'}). OTIF Risk: ${artifacts.overall_summary?.otif_risk || 'Unknown'}.`;
    }
    
    if (lowerQuestion.includes('ptl') && (lowerQuestion.includes('capacity') || lowerQuestion.includes('shortfall'))) {
      if (artifacts.ptl_stream.shortfall) {
        return `PTL has a capacity shortfall of ${Math.round(artifacts.ptl_stream.shortfall_factor * 100)}% below target. Current: ${artifacts.ptl_stream.ema_lph} LPH vs Target: ${STAGE_TARGETS.PTL.target_lph} LPH. Adding 1 picker should improve capacity by ~15%.`;
      }
      return `PTL is performing well at ${artifacts.ptl_stream.ema_lph} LPH (${Math.round((artifacts.ptl_stream.ema_lph / STAGE_TARGETS.PTL.target_lph) * 100)}% of target). No capacity issues detected.`;
    }
    
    // Handle general loading status questions
    if (lowerQuestion.includes('loading') || lowerQuestion.includes('what') && lowerQuestion.includes('happening')) {
      if (!artifacts.trips || artifacts.trips.length === 0) {
        return `Loading Status: No trips currently in progress. Wave status: ${artifacts.overall_summary?.wave_status || 'Unknown'}. SBL: ${artifacts.sbl_stations?.length || 0} stations active, PTL: ${artifacts.ptl_totals?.total_lines || 0} lines processed.`;
      }
      
      const totalTrips = artifacts.trips.length;
      const loadedTrips = artifacts.trips.filter(t => t.loaded_pct >= 90).length;
      const atRiskTrips = artifacts.trips.filter(t => t.risk >= THRESHOLDS.risk_threshold_trip).length;
      const avgLoadedPct = Math.round(artifacts.trips.reduce((sum, t) => sum + t.loaded_pct, 0) / totalTrips * 100);
      const totalCrates = artifacts.trips.reduce((sum, t) => sum + ((t as any).total || 0), 0);
      const loadedCrates = artifacts.trips.reduce((sum, t) => sum + Math.round((t.loaded_pct * ((t as any).total || 0))), 0);
      
      let response = `Loading Status Overview:\n`;
      response += `• ${totalTrips} total trips in progress\n`;
      response += `• ${loadedCrates.toLocaleString()} / ${totalCrates.toLocaleString()} crates loaded (${avgLoadedPct}% completion)\n`;
      response += `• ${loadedTrips} trips are 90%+ loaded\n`;
      response += `• ${atRiskTrips} trips are at risk\n\n`;
      
      if (atRiskTrips > 0) {
        const highRiskTrips = artifacts.trips.filter(t => t.risk >= THRESHOLDS.risk_threshold_trip);
        response += `High-risk trips: ${highRiskTrips.map(t => t.mm_trip).join(', ')}\n`;
        response += `Recommendation: Focus on high-risk trips to prevent delays.`;
      } else {
        response += `All trips progressing normally. No immediate concerns.`;
      }
      
      return response;
    }
    
    // Handle trip-level questions
    if (lowerQuestion.includes('trip') && (lowerQuestion.includes('loading') || lowerQuestion.includes('status'))) {
      if (!artifacts.trips || artifacts.trips.length === 0) {
        return `Trip-level loading data is not available in the uploaded files. To get detailed trip status, please upload the 'updated_loading_dashboard_query.xlsx' file which contains trip-wise loading progress, dock queues, and risk assessments.`;
      }
      
      const totalTrips = artifacts.trips.length;
      const loadedTrips = artifacts.trips.filter(t => t.loaded_pct >= 90).length;
      const atRiskTrips = artifacts.trips.filter(t => t.risk >= THRESHOLDS.risk_threshold_trip).length;
      
      return `Trip-level loading status: ${totalTrips} total trips, ${loadedTrips} trips loaded (90%+), ${atRiskTrips} trips at risk. ${atRiskTrips > 0 ? 'Focus on high-risk trips to prevent delays.' : 'All trips progressing normally.'}`;
    }
    
    // Handle trip details questions
    if (lowerQuestion.includes('trip') && (lowerQuestion.includes('details') || lowerQuestion.includes('show') || lowerQuestion.includes('list'))) {
      if (!artifacts.trips || artifacts.trips.length === 0) {
        return `Trip details are not available in the uploaded files. To get detailed trip information, please upload the 'updated_loading_dashboard_query.xlsx' file.`;
      }
      
      const tripDetails = artifacts.trips.map(trip => 
        `${trip.mm_trip}: ${Math.round(trip.loaded_pct * 100)}% loaded (${trip.risk < 0.3 ? 'Low' : trip.risk < 0.6 ? 'Medium' : 'High'} risk)`
      ).join(', ');
      
      return `Trip details: ${tripDetails}. All trips are progressing well with low risk scores.`;
    }
    
    if (lowerQuestion.includes('trip') && lowerQuestion.includes('risk')) {
      if (!artifacts.trips || artifacts.trips.length === 0) {
        return `Trip risk data is not available in the uploaded files. To get trip risk assessments, please upload the 'updated_loading_dashboard_query.xlsx' file which contains trip-wise risk calculations.`;
      }
      
      const highRiskTrips = artifacts.trips.filter(t => t.risk >= THRESHOLDS.risk_threshold_trip);
      if (highRiskTrips.length > 0) {
        const topRisk = highRiskTrips.sort((a, b) => b.risk - a.risk)[0];
        return `${highRiskTrips.length} trips at high risk. ${topRisk.mm_trip} has ${Math.round(topRisk.risk * 100)}% risk due to ${this.getRiskFactors(topRisk)}. Recommend resequencing or opening extra dock.`;
      }
      return 'No trips currently at high risk. All trips are progressing normally.';
    }
    
    // Handle overall wave status questions
    if (lowerQuestion.includes('wave status') || lowerQuestion.includes('overall status') || lowerQuestion.includes('wave health')) {
      const risk = artifacts.overall_summary.otif_risk;
      const buffer = artifacts.overall_summary.buffer_minutes;
      const lineCoverage = Math.round(artifacts.overall_summary.line_coverage_pct * 100);
      const waveStatus = artifacts.overall_summary.wave_status;
      
      return `Wave Status: ${waveStatus}. ${risk} OTIF risk with ${buffer} minutes buffer. Line coverage: ${lineCoverage}%. SBL: ${artifacts.sbl_stream.ema_lph} LPH, PTL: ${artifacts.ptl_stream.ema_lph} LPH. ${risk === 'HIGH' ? 'Immediate action required.' : risk === 'MEDIUM' ? 'Monitor closely.' : 'On track.'}`;
    }
    
    if (lowerQuestion.includes('otif') || lowerQuestion.includes('cutoff')) {
      const risk = artifacts.overall_summary.otif_risk;
      const buffer = artifacts.overall_summary.buffer_minutes;
      if (risk === 'HIGH') {
        return `HIGH OTIF RISK: Projected finish is ${buffer} minutes late. Line coverage at ${Math.round(artifacts.overall_summary.line_coverage_pct * 100)}%. Implement all recommendations immediately.`;
      } else if (risk === 'MEDIUM') {
        return `MEDIUM OTIF RISK: ${buffer} minutes buffer remaining. Monitor closely and implement key recommendations.`;
      }
      return `LOW OTIF RISK: ${buffer} minutes ahead of cutoff. Wave is on track.`;
    }
    
    // Handle SBL SKUs questions
    if (lowerQuestion.includes('sbl') && (lowerQuestion.includes('sku') || lowerQuestion.includes('pending'))) {
      if (!artifacts.sbl_infeed || !artifacts.sbl_infeed.skus || artifacts.sbl_infeed.skus.length === 0) {
        // Fallback to general SBL data if infeed data not available
        const totalSBLStations = artifacts.sbl_stations?.length || 0;
        const totalPacked = artifacts.sbl_stations?.reduce((sum, s) => sum + (s.packed || 0), 0) || 0;
        const totalRemaining = artifacts.sbl_stations?.reduce((sum, s) => sum + (s.remaining || 0), 0) || 0;
        
        return `SBL Status: ${totalSBLStations} stations active. ${totalPacked} lines packed, ${totalRemaining} lines remaining. For detailed SKU information, please upload the partial_hus_pending_based_on_gtp_demand.xlsx file.`;
      }
      
      const infeed = artifacts.sbl_infeed;
      const pendingSKUs = infeed.skus.filter((sku: any) => sku.pending_qty > 0);
      
      let response = `SBL Infeed Status: ${infeed.skus.length} total SKUs, ${pendingSKUs.length} with pending quantity.\n\n`;
      
      if (pendingSKUs.length > 0) {
        response += `SKUs to be fed for SBL:\n`;
        pendingSKUs.sort((a: any, b: any) => b.pending_qty - a.pending_qty).forEach((sku: any, index: number) => {
          response += `${index + 1}. ${sku.sku_code} - ${sku.pending_qty} qty needed\n`;
        });
      } else {
        response += `All SKUs have been fed for SBL. No pending quantities.`;
      }
      
      return response;
    }
    
    // No specific handler matched
    return null;
  }

  private generateLLMAnswer(question: string, artifacts: DashboardArtifacts): string {
    // Prepare structured data context for LLM
    const context = {
      overall_summary: {
        wave_status: artifacts.overall_summary.wave_status,
        otif_risk: artifacts.overall_summary.otif_risk,
        buffer_minutes: artifacts.overall_summary.buffer_minutes,
        line_coverage_pct: Math.round(artifacts.overall_summary.line_coverage_pct * 100)
      },
      sbl_stations: artifacts.sbl_stations.map(s => ({
        station_code: s.station_code,
        productivity_lph: s.last10_lph,
        target_lph: s.target_lph,
        completion_pct: Math.round(s.completion_pct * 100),
        remaining_lines: s.remaining,
        issue_type: s.issue_type,
        starved: s.starved
      })),
      sbl_stream: {
        ema_lph: artifacts.sbl_stream.ema_lph,
        last_hour_avg: artifacts.sbl_stream.last_hour_avg,
        trend: artifacts.sbl_stream.trend
      },
      ptl_stream: {
        ema_lph: artifacts.ptl_stream.ema_lph,
        last_hour_avg: artifacts.ptl_stream.last_hour_avg,
        trend: artifacts.ptl_stream.trend,
        shortfall: artifacts.ptl_stream.shortfall,
        shortfall_factor: Math.round(artifacts.ptl_stream.shortfall_factor * 100)
      },
      trips: artifacts.trips.map(t => ({
        mm_trip: t.mm_trip,
        loaded_pct: Math.round(t.loaded_pct * 100),
        risk: Math.round(t.risk * 100),
        health_color: t.health_color
      }))
    };

    // For now, provide a structured overview answer
    // In production, this would call the LLM with the context
    const recommendations = this.generateRecommendations(artifacts);
    const topRecommendation = recommendations[0];
    
    if (topRecommendation) {
      return `Based on current data: ${topRecommendation.title}: ${topRecommendation.rationale} ${topRecommendation.impact_estimate}. For more specific information, please ask about particular stations, trips, or metrics.`;
    }
    
    return `Wave status: ${artifacts.overall_summary.wave_status}. SBL: ${artifacts.sbl_stream.ema_lph} LPH, PTL: ${artifacts.ptl_stream.ema_lph} LPH. Line coverage: ${Math.round(artifacts.overall_summary.line_coverage_pct * 100)}%. Ask me about specific stations, productivity, or trip details for more information.`;
  }

  // Comprehensive LLM approach with full data context
  private generateComprehensiveLLMAnswer(question: string, artifacts: DashboardArtifacts): string {
    // Create comprehensive data context
    const context = {
      wave_info: {
        wave_id: artifacts.macros?.waveInfo?.wave_id || 'Unknown',
        total_order_lines: artifacts.macros?.waveInfo?.total_order_lines || 0,
        split_lines_sbl: artifacts.macros?.waveInfo?.split_lines_sbl || 0,
        split_lines_ptl: artifacts.macros?.waveInfo?.split_lines_ptl || 0,
        projected_finish_iso: (artifacts.macros?.waveInfo as any)?.projected_finish_iso || 'Unknown',
        buffer_minutes: artifacts.overall_summary.buffer_minutes || 0
      },
      sbl_status: {
        total_stations: artifacts.sbl_stations?.length || 0,
        productivity_issues: artifacts.sbl_stations?.filter(s => s.is_productivity_issue).length || 0,
        infeed_issues: artifacts.sbl_stations?.filter(s => s.is_infeed_issue).length || 0,
        healthy_stations: artifacts.sbl_stations?.filter(s => s.issue_type === 'none').length || 0,
        starved_stations: artifacts.sbl_stations?.filter(s => s.starved).length || 0,
        avg_productivity: artifacts.sbl_stream?.ema_lph || 0,
        last_hour_avg: artifacts.sbl_stream?.last_hour_avg || 0,
        trend: artifacts.sbl_stream?.trend || 'stable',
        total_packed: artifacts.sbl_stations?.reduce((sum, s) => sum + s.packed, 0) || 0,
        total_remaining: artifacts.sbl_stations?.reduce((sum, s) => sum + s.remaining, 0) || 0,
        completion_pct: Math.round((artifacts.sbl_stations?.reduce((sum, s) => sum + s.packed, 0) || 0) / (artifacts.macros?.waveInfo?.split_lines_sbl || 1) * 100)
      },
      ptl_status: {
        total_stations: artifacts.ptl_totals?.by_station?.length || 0,
        avg_productivity: artifacts.ptl_stream?.ema_lph || 0,
        last_hour_avg: artifacts.ptl_stream?.last_hour_avg || 0,
        trend: artifacts.ptl_stream?.trend || 'stable',
        shortfall: artifacts.ptl_stream?.shortfall || false,
        shortfall_factor: Math.round((artifacts.ptl_stream?.shortfall_factor || 0) * 100),
        lines_processed: artifacts.ptl_totals?.last_hour_lines || 0,
        total_assigned: artifacts.macros?.waveInfo?.split_lines_ptl || 0,
        completion_pct: Math.round(((artifacts.ptl_totals?.last_hour_lines || 0) / (artifacts.macros?.waveInfo?.split_lines_ptl || 1)) * 100)
      },
      loading_status: {
        total_trips: artifacts.trips?.length || 0,
        loaded_trips: artifacts.trips?.filter(t => t.loaded_pct >= 90).length || 0,
        at_risk_trips: artifacts.trips?.filter(t => t.risk >= 0.6).length || 0,
        avg_loaded_pct: Math.round((artifacts.trips?.reduce((sum, t) => sum + t.loaded_pct, 0) || 0) / (artifacts.trips?.length || 1) * 100),
        total_crates: artifacts.trips?.reduce((sum, t) => sum + ((t as any).total || 0), 0) || 0,
        loaded_crates: artifacts.trips?.reduce((sum, t) => sum + Math.round(t.loaded_pct * ((t as any).total || 0)), 0) || 0
      },
      sbl_skus: {
        total_skus: artifacts.sbl_infeed?.skus?.length || 0,
        pending_skus: artifacts.sbl_infeed?.skus?.filter((s: any) => s.pending_qty > 0).length || 0,
        completed_skus: artifacts.sbl_infeed?.skus?.filter((s: any) => s.pending_qty === 0).length || 0,
        completion_rate: artifacts.sbl_infeed?.skus && artifacts.sbl_infeed.skus.length > 0 ? Math.round((artifacts.sbl_infeed.skus.filter((s: any) => s.pending_qty === 0).length / artifacts.sbl_infeed.skus.length) * 100) : 0,
        top_pending: artifacts.sbl_infeed?.skus?.filter((s: any) => s.pending_qty > 0).sort((a: any, b: any) => b.pending_qty - a.pending_qty).slice(0, 3) || []
      },
      recommendations: this.generateRecommendations(artifacts).slice(0, 3)
    };

    // For demo purposes, let's create a smart response based on the question type
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('how many') && lowerQuestion.includes('station')) {
      if (lowerQuestion.includes('sbl')) {
        return `There are ${context.sbl_status.total_stations} SBL stations active. ${context.sbl_status.healthy_stations} are healthy, ${context.sbl_status.productivity_issues} have productivity issues, and ${context.sbl_status.infeed_issues} have infeed issues.`;
      } else if (lowerQuestion.includes('ptl')) {
        return `There are ${context.ptl_status.total_stations} PTL stations active. Average productivity: ${Math.round(context.ptl_status.avg_productivity)} LPH.`;
      }
    }

    if (lowerQuestion.includes('productivity')) {
      if (lowerQuestion.includes('sbl')) {
        return `SBL Productivity: Current EMA is ${Math.round(context.sbl_status.avg_productivity)} LPH, last hour average is ${Math.round(context.sbl_status.last_hour_avg)} LPH with a ${context.sbl_status.trend} trend. ${context.sbl_status.productivity_issues} stations have productivity issues.`;
      } else if (lowerQuestion.includes('ptl')) {
        return `PTL Productivity: Current EMA is ${Math.round(context.ptl_status.avg_productivity)} LPH, last hour average is ${Math.round(context.ptl_status.last_hour_avg)} LPH with a ${context.ptl_status.trend} trend. ${context.ptl_status.shortfall ? `Capacity shortfall of ${context.ptl_status.shortfall_factor}% below target.` : 'Performing within target range.'}`;
      }
    }

    if (lowerQuestion.includes('loading') || lowerQuestion.includes('trip')) {
      return `Loading Status: ${context.loading_status.total_trips} total trips, ${context.loading_status.loaded_trips} trips loaded (90%+), ${context.loading_status.at_risk_trips} trips at risk. Average completion: ${context.loading_status.avg_loaded_pct}%. ${context.loading_status.loaded_crates.toLocaleString()} / ${context.loading_status.total_crates.toLocaleString()} crates loaded.`;
    }

    if (lowerQuestion.includes('status') || lowerQuestion.includes('overall')) {
      return `Overall Wave Status: ${context.wave_info.wave_id} with ${context.wave_info.total_order_lines} total lines. SBL: ${context.sbl_status.completion_pct}% complete (${context.sbl_status.total_packed}/${context.sbl_status.total_remaining + context.sbl_status.total_packed} lines), PTL: ${context.ptl_status.completion_pct}% complete. Buffer: ${context.wave_info.buffer_minutes} minutes.`;
    }

    if (lowerQuestion.includes('sku') && (lowerQuestion.includes('pending') || lowerQuestion.includes('feeding'))) {
      return `SBL SKUs Status: ${context.sbl_skus.total_skus} total SKUs, ${context.sbl_skus.pending_skus} pending, ${context.sbl_skus.completed_skus} completed (${context.sbl_skus.completion_rate}% completion). Top pending: ${context.sbl_skus.top_pending.map((s: any) => `${s.sku} (${s.pending_lines} lines)`).join(', ')}.`;
    }

    // Handle station-specific performance questions
    if (lowerQuestion.includes('station') && lowerQuestion.includes('performing')) {
      const stationCode = lowerQuestion.match(/station\s+([A-Z0-9]+)/i)?.[1];
      if (stationCode) {
        const station = artifacts.sbl_stations?.find((s: any) => s.station_code === stationCode);
        if (station) {
          return `Station ${stationCode} Performance: ${Math.round(station.last10_lph)} LPH (${Math.round((station.last10_lph/station.target_lph)*100)}% of target), ${station.remaining} lines remaining. Status: ${station.issue_type === 'none' ? 'Healthy' : station.issue_type === 'productivity' ? 'Productivity Issue' : 'Infeed Issue'}.`;
        }
        return `Station ${stationCode} not found in current data. Available stations: ${artifacts.sbl_stations?.slice(0, 5).map((s: any) => s.station_code).join(', ')}...`;
      }
    }

    // Handle completion rate questions
    if (lowerQuestion.includes('completion') && (lowerQuestion.includes('rate') || lowerQuestion.includes('percentage'))) {
      const sblCompletion = context.sbl_status.completion_pct;
      const ptlCompletion = context.ptl_status.completion_pct;
      return `Completion Rates: SBL ${sblCompletion}% (${context.sbl_status.total_packed}/${context.sbl_status.total_remaining + context.sbl_status.total_packed} lines), PTL ${ptlCompletion}% (${context.ptl_status.lines_processed}/${context.ptl_status.total_assigned} lines). Overall line coverage: ${Math.round(artifacts.overall_summary?.line_coverage_pct * 100)}%.`;
    }

    // Handle 95%+ complete stations
    if (lowerQuestion.includes('95%') && lowerQuestion.includes('complete')) {
      const completedStations = artifacts.sbl_stations?.filter((s: any) => s.completion_pct >= 0.95) || [];
      return `${completedStations.length} stations are 95%+ complete: ${completedStations.map((s: any) => `${s.station_code} (${Math.round(s.completion_pct * 100)}%)`).join(', ')}.`;
    }

    // Handle starved stations
    if (lowerQuestion.includes('starved')) {
      const starvedStations = artifacts.sbl_stations?.filter((s: any) => s.starved) || [];
      if (starvedStations.length > 0) {
        return `${starvedStations.length} stations are starved: ${starvedStations.map((s: any) => `${s.station_code} (${s.remaining} lines remaining, ${Math.round(s.last10_lph)} LPH)`).join(', ')}. These stations need immediate infeed improvement.`;
      }
      return `No stations are currently starved. All stations have sufficient work available.`;
    }

    // Handle trend questions
    if (lowerQuestion.includes('trend')) {
      if (lowerQuestion.includes('sbl')) {
        const sblTrend = artifacts.sbl_stream?.trend || 'stable';
        const sblEma = artifacts.sbl_stream?.ema_lph || 0;
        const sblLastHour = artifacts.sbl_stream?.last_hour_avg || 0;
        return `SBL Trend: ${sblTrend} (${Math.round(sblEma)} LPH EMA, ${Math.round(sblLastHour)} LPH last hour). ${sblTrend === 'up' ? 'Productivity is improving.' : sblTrend === 'down' ? 'Productivity is declining - investigate issues.' : 'Productivity is stable.'}`;
      } else if (lowerQuestion.includes('ptl')) {
        const ptlTrend = artifacts.ptl_stream?.trend || 'stable';
        const ptlEma = artifacts.ptl_stream?.ema_lph || 0;
        const ptlLastHour = artifacts.ptl_stream?.last_hour_avg || 0;
        return `PTL Trend: ${ptlTrend} (${Math.round(ptlEma)} LPH EMA, ${Math.round(ptlLastHour)} LPH last hour). ${ptlTrend === 'up' ? 'Productivity is improving.' : ptlTrend === 'down' ? 'Productivity is declining - investigate issues.' : 'Productivity is stable.'}`;
      }
    }

    // Handle projected finish time questions
    if (lowerQuestion.includes('projected') && lowerQuestion.includes('finish')) {
      const finishTime = (artifacts.macros?.waveInfo as any)?.projected_finish_iso || 'Unknown';
      const bufferMinutes = artifacts.overall_summary?.buffer_minutes || 0;
      return `Projected Finish Time: ${finishTime}. Current buffer: ${bufferMinutes} minutes (${bufferMinutes < 0 ? 'behind schedule' : 'ahead of schedule'}). OTIF Risk: ${artifacts.overall_summary?.otif_risk || 'Unknown'}.`;
    }

    // Handle issues and problems questions
    if (lowerQuestion.includes('issues') || lowerQuestion.includes('problems')) {
      const issues = [];
      if (context.sbl_status.productivity_issues > 0) issues.push(`${context.sbl_status.productivity_issues} SBL productivity issues`);
      if (context.sbl_status.infeed_issues > 0) issues.push(`${context.sbl_status.infeed_issues} SBL infeed issues`);
      if (context.ptl_status.completion_pct === 0) issues.push('PTL operations not started');
      if (context.loading_status.total_trips === 0) issues.push('Loading operations not started');
      if (artifacts.overall_summary?.otif_risk === 'HIGH') issues.push('High OTIF risk');
      
      if (issues.length > 0) {
        return `Current Issues: ${issues.join(', ')}. Priority: Address productivity issues first, then start PTL and loading operations.`;
      }
      return `No major issues detected. All operations running smoothly.`;
    }

    // Handle recommendations questions
    if (lowerQuestion.includes('recommendations') || lowerQuestion.includes('focus') || lowerQuestion.includes('actions')) {
      const recommendations = context.recommendations;
      if (recommendations.length > 0) {
        return `Top Recommendations:\n1. ${recommendations[0]?.title || 'Monitor operations'}: ${recommendations[0]?.rationale || 'Continue current operations'}\n2. ${recommendations[1]?.title || 'Check productivity'}: ${recommendations[1]?.rationale || 'Review station performance'}\n3. ${recommendations[2]?.title || 'Optimize workflow'}: ${recommendations[2]?.rationale || 'Improve efficiency'}`;
      }
      return `Recommendations: Focus on improving SBL productivity (currently ${Math.round(context.sbl_status.avg_productivity)} LPH vs ${120} LPH target), start PTL operations (0% complete), and begin loading operations.`;
    }

    // Handle root cause analysis
    if (lowerQuestion.includes('root cause') || lowerQuestion.includes('causing delays') || lowerQuestion.includes('declining')) {
      return `Root Cause Analysis: Primary issues are SBL productivity problems (${context.sbl_status.productivity_issues} stations below target), infeed issues (${context.sbl_status.infeed_issues} stations), and delayed PTL/loading operations. Focus on equipment maintenance, training, and workflow optimization.`;
    }

    // Handle resource and priority questions
    if (lowerQuestion.includes('resources') || lowerQuestion.includes('priority') || lowerQuestion.includes('next')) {
      return `Priority Actions:\n1. Fix SBL productivity issues (${context.sbl_status.productivity_issues} stations)\n2. Address infeed problems (${context.sbl_status.infeed_issues} stations)\n3. Start PTL operations (0% complete)\n4. Begin loading operations\n5. Monitor OTIF risk (${artifacts.overall_summary?.otif_risk || 'Unknown'})`;
    }

    // Handle overall wave status questions
    if (lowerQuestion.includes('overall') && lowerQuestion.includes('wave status')) {
      const totalLines = artifacts.macros?.waveInfo?.total_order_lines || 0;
      const completionPct = artifacts.overall_summary?.line_coverage_pct * 100 || 0;
      const otifRisk = artifacts.overall_summary?.otif_risk || 'Unknown';
      const sblIssues = artifacts.sbl_stations.filter(s => s.issue_type !== 'none').length;
      const ptlIssues = artifacts.ptl_stream?.shortfall ? 1 : 0;
      
      return `Overall Wave Status: ${completionPct.toFixed(1)}% complete (${totalLines.toLocaleString()} total lines). OTIF Risk: ${otifRisk}. Issues: ${sblIssues} SBL stations need attention, ${ptlIssues} PTL capacity issues. Current buffer: ${artifacts.overall_summary?.buffer_minutes || 0} minutes.`;
    }

    // Handle wave progressing questions
    if (lowerQuestion.includes('wave progress') || lowerQuestion.includes('how is the wave')) {
      const completionPct = artifacts.overall_summary?.line_coverage_pct * 100 || 0;
      const sblCompletion = artifacts.sbl_stations.reduce((sum, s) => sum + s.completion_pct, 0) / artifacts.sbl_stations.length * 100;
      const ptlCompletion = (artifacts.ptl_stream as any)?.completion_pct || 0;
      
      return `Wave Progress: Overall ${completionPct.toFixed(1)}% complete. SBL: ${sblCompletion.toFixed(1)}% complete, PTL: ${ptlCompletion.toFixed(1)}% complete. ${completionPct > 80 ? 'Wave is progressing well.' : completionPct > 50 ? 'Wave is making steady progress.' : 'Wave needs acceleration.'}`;
    }

    // Handle line coverage questions
    if (lowerQuestion.includes('line coverage') || lowerQuestion.includes('coverage percentage')) {
      const coveragePct = artifacts.overall_summary?.line_coverage_pct * 100 || 0;
      const sblCoverage = (artifacts.overall_summary?.sbl_coverage_pct || 0) * 100;
      const ptlCoverage = (artifacts.overall_summary?.ptl_coverage_pct || 0) * 100;
      
      return `Line Coverage: Overall ${coveragePct.toFixed(1)}%, SBL ${sblCoverage.toFixed(1)}%, PTL ${ptlCoverage.toFixed(1)}%. ${coveragePct > 80 ? 'Good coverage across all operations.' : 'Some areas need attention to improve coverage.'}`;
    }

    // Handle OTIF risk questions
    if (lowerQuestion.includes('otif risk') || lowerQuestion.includes('otif level')) {
      const otifRisk = artifacts.overall_summary?.otif_risk || 'Unknown';
      const bufferMinutes = artifacts.overall_summary?.buffer_minutes || 0;
      const riskLevel = bufferMinutes < 0 ? 'High' : bufferMinutes < 30 ? 'Medium' : 'Low';
      
      return `OTIF Risk Level: ${otifRisk} (${riskLevel} risk). Current buffer: ${bufferMinutes} minutes. ${bufferMinutes < 0 ? 'Wave is behind schedule - immediate action needed.' : bufferMinutes < 30 ? 'Wave is at risk - monitor closely.' : 'Wave is on track.'}`;
    }

    // Handle PTL performance questions
    if (lowerQuestion.includes('ptl') && (lowerQuestion.includes('performing') || lowerQuestion.includes('performance'))) {
      const ptlEma = artifacts.ptl_stream?.ema_lph || 0;
      const ptlTarget = STAGE_TARGETS.PTL.target_lph;
      const ptlCompletion = (artifacts.ptl_stream as any)?.completion_pct || 0;
      const shortfall = artifacts.ptl_stream?.shortfall || false;
      
      return `PTL Performance: ${ptlEma} LPH (${Math.round((ptlEma / ptlTarget) * 100)}% of target), ${ptlCompletion.toFixed(1)}% complete. ${shortfall ? 'Capacity shortfall detected - consider adding pickers.' : 'Performance is meeting targets.'}`;
    }

    // Handle PTL station count questions
    if (lowerQuestion.includes('ptl station') && (lowerQuestion.includes('how many') || lowerQuestion.includes('count') || lowerQuestion.includes('active'))) {
      const ptlStations = (artifacts.ptl_totals?.leaderboard?.top?.length || 0) + (artifacts.ptl_totals?.leaderboard?.bottom?.length || 0);
      const totalOutput = artifacts.ptl_totals?.last_hour_lines || 0;
      
      return `There are ${ptlStations} PTL stations active. Total PTL lines processed: ${totalOutput.toLocaleString()}. Average output per station: ${ptlStations > 0 ? Math.round(totalOutput / ptlStations) : 0} lines.`;
    }

    // Handle loading status variations
    if (lowerQuestion.includes('loading') && (lowerQuestion.includes('happening') || lowerQuestion.includes('going'))) {
      const totalTrips = artifacts.trips?.length || 0;
      const loadedTrips = artifacts.trips?.filter(t => t.loaded_pct >= 90).length || 0;
      const avgLoadedPct = artifacts.trips?.length > 0 ? artifacts.trips.reduce((sum, t) => sum + t.loaded_pct, 0) / artifacts.trips.length : 0;
      
      return `Loading Status: ${loadedTrips}/${totalTrips} trips are 90%+ loaded. Average loading: ${avgLoadedPct.toFixed(1)}%. ${totalTrips > 0 ? `${artifacts.trips.filter(t => t.risk > 0.7).length} trips at high risk.` : 'No trip data available.'}`;
    }

    // Handle trip progress questions
    if (lowerQuestion.includes('trip progress') || lowerQuestion.includes('show me trip')) {
      const totalTrips = artifacts.trips?.length || 0;
      if (totalTrips === 0) {
        return `No trip data available. Please upload the 'updated_loading_dashboard_query.xlsx' file to see trip progress information.`;
      }
      
      const loadedTrips = artifacts.trips.filter(t => t.loaded_pct >= 90).length;
      const highRiskTrips = artifacts.trips.filter(t => t.risk > 0.7).length;
      
      return `Trip Progress: ${totalTrips} total trips, ${loadedTrips} fully loaded (90%+), ${highRiskTrips} at high risk. Average loading: ${artifacts.trips.reduce((sum, t) => sum + t.loaded_pct, 0) / totalTrips}%.`;
    }

    // Handle trips at risk questions
    if (lowerQuestion.includes('trip') && (lowerQuestion.includes('risk') || lowerQuestion.includes('at risk'))) {
      const highRiskTrips = artifacts.trips?.filter(t => t.risk > 0.7) || [];
      if (highRiskTrips.length === 0) {
        return `No trips are currently at high risk. All trips are progressing normally.`;
      }
      
      return `${highRiskTrips.length} trips are at high risk: ${highRiskTrips.map(t => `${t.mm_trip} (${t.loaded_pct.toFixed(1)}% loaded, risk: ${t.risk.toFixed(2)})`).join(', ')}. These trips need immediate attention.`;
    }

    // Handle trip details questions
    if (lowerQuestion.includes('trip detail') || lowerQuestion.includes('show me trip detail')) {
      const totalTrips = artifacts.trips?.length || 0;
      if (totalTrips === 0) {
        return `No trip data available. Please upload the 'updated_loading_dashboard_query.xlsx' file to see trip details.`;
      }
      
      const tripSummary = artifacts.trips.map(t => `${t.mm_trip}: ${t.loaded_pct.toFixed(1)}% loaded, ${t.sorted_pct.toFixed(1)}% sorted, ${t.staged_pct.toFixed(1)}% staged, risk: ${t.risk.toFixed(2)}`).join('; ');
      return `Trip Details: ${tripSummary}`;
    }

    // Handle loaded trips count questions
    if (lowerQuestion.includes('trip') && lowerQuestion.includes('loaded') && lowerQuestion.includes('how many')) {
      const totalTrips = artifacts.trips?.length || 0;
      const loadedTrips = artifacts.trips?.filter(t => t.loaded_pct >= 90).length || 0;
      
      return `${loadedTrips} out of ${totalTrips} trips are fully loaded (90%+). ${totalTrips - loadedTrips} trips still in progress.`;
    }

    // Handle trip-level loading status questions
    if (lowerQuestion.includes('trip-level') && lowerQuestion.includes('loading')) {
      const totalTrips = artifacts.trips?.length || 0;
      if (totalTrips === 0) {
        return `No trip-level loading data available. Please upload the 'updated_loading_dashboard_query.xlsx' file.`;
      }
      
      const avgLoaded = artifacts.trips.reduce((sum, t) => sum + t.loaded_pct, 0) / totalTrips;
      const highRiskCount = artifacts.trips.filter(t => t.risk > 0.7).length;
      
      return `Trip-level Loading Status: ${totalTrips} trips total, average ${avgLoaded.toFixed(1)}% loaded. ${highRiskCount} trips at high risk, ${totalTrips - highRiskCount} progressing normally.`;
    }

    // Handle SBL infeed questions
    if (lowerQuestion.includes('infeed') || lowerQuestion.includes('sku') && lowerQuestion.includes('feed')) {
      if (!artifacts.sbl_infeed) {
        return `No SBL infeed data available. Please upload the 'partial_hus_pending_based_on_gtp_demand' file to see SKU coverage and feeding information.`;
      }
      
      const infeed = artifacts.sbl_infeed;
      const lowCoverageSKUs = infeed.skus.filter(s => s.coverage_pct < 50).length;
      const blockedHUs = infeed.summary.blocked_hus;
      const staleHUs = infeed.summary.stale_hus;
      
      return `SBL Infeed Status: ${infeed.summary.total_skus} SKUs, ${infeed.summary.total_hus} HUs available. ${lowCoverageSKUs} SKUs with low coverage (<50%), ${blockedHUs} blocked HUs, ${staleHUs} stale HUs. Average coverage: ${infeed.summary.avg_coverage_pct.toFixed(1)}%.`;
    }

    // Handle SKU coverage questions
    if (lowerQuestion.includes('coverage') && (lowerQuestion.includes('sku') || lowerQuestion.includes('infeed'))) {
      if (!artifacts.sbl_infeed) {
        return `No SKU coverage data available. Please upload the infeed file to see coverage information.`;
      }
      
      const infeed = artifacts.sbl_infeed;
      const lowCoverageSKUs = infeed.skus.filter(s => s.coverage_pct < 50);
      const highCoverageSKUs = infeed.skus.filter(s => s.coverage_pct >= 80);
      
      if (lowCoverageSKUs.length === 0) {
        return `All SKUs have good coverage (≥50%). ${highCoverageSKUs.length} SKUs have excellent coverage (≥80%).`;
      }
      
      return `${lowCoverageSKUs.length} SKUs have low coverage: ${lowCoverageSKUs.map(s => `${s.sku_code} (${s.coverage_pct.toFixed(1)}%)`).join(', ')}. These need immediate feeding attention.`;
    }

    // Handle feeder picklist questions
    if (lowerQuestion.includes('picklist') || lowerQuestion.includes('feed next') || lowerQuestion.includes('what should we feed')) {
      if (!artifacts.sbl_infeed) {
        return `No feeder picklist data available. Please upload the infeed file to see what should be fed next.`;
      }
      
      const infeed = artifacts.sbl_infeed;
      const availableHUs = infeed.hus.filter(h => 
        h.feed_status === 'NOT_FED' && 
        h.inclusionStatus === 'INCLUDED' && 
        !h.blocked_status && 
        h.bin_status === 'ACTIVE'
      );
      
      if (availableHUs.length === 0) {
        return `No HUs available for feeding. All HUs are either fed, blocked, or excluded.`;
      }
      
      const topHUs = availableHUs
        .sort((a, b) => a.age_minutes - b.age_minutes)
        .slice(0, 10);
      
      return `Feeder Picklist (Top ${topHUs.length} HUs): ${topHUs.map(h => `${h.hu_code} (${h.sku_code}, ${h.qty} qty, ${h.age_minutes}min old)`).join(', ')}. Focus on oldest HUs first.`;
    }

    // Handle starvation with infeed context
    if (lowerQuestion.includes('starving') || lowerQuestion.includes('starvation')) {
      const starvedStations = artifacts.sbl_stations.filter(s => s.starved);
      if (starvedStations.length === 0) {
        return `No SBL stations are currently starved. All stations have adequate work.`;
      }
      
      let response = `${starvedStations.length} SBL stations are starved: ${starvedStations.map(s => s.station_code).join(', ')}. `;
      
      if (artifacts.sbl_infeed) {
        const lowCoverageSKUs = artifacts.sbl_infeed.skus.filter(s => s.coverage_pct < 50).length;
        if (lowCoverageSKUs > 0) {
          response += `Infeed coverage is low for ${lowCoverageSKUs} SKUs - feeding these may help resolve starvation.`;
        } else {
          response += `Infeed coverage looks good - starvation may be due to productivity issues.`;
        }
      } else {
        response += `Check infeed coverage and consider feeding open SKUs to resolve starvation.`;
      }
      
      return response;
    }

    // Default comprehensive response
    return `Warehouse Operations Summary:\n\n` +
           `📊 Wave: ${context.wave_info.wave_id} (${context.wave_info.total_order_lines} lines)\n` +
           `🔵 SBL: ${context.sbl_status.completion_pct}% complete, ${context.sbl_status.avg_productivity} LPH avg, ${context.sbl_status.healthy_stations}/${context.sbl_status.total_stations} stations healthy\n` +
           `🟢 PTL: ${context.ptl_status.completion_pct}% complete, ${context.ptl_status.avg_productivity} LPH avg${context.ptl_status.shortfall ? `, ${context.ptl_status.shortfall_factor}% capacity shortfall` : ''}\n` +
           `🚛 Loading: ${context.loading_status.avg_loaded_pct}% complete, ${context.loading_status.at_risk_trips} trips at risk\n` +
           `📦 SKUs: ${context.sbl_skus.completion_rate}% complete (${context.sbl_skus.pending_skus} pending)\n\n` +
           `Top Recommendation: ${context.recommendations[0]?.title || 'Monitor operations'} - ${context.recommendations[0]?.rationale || 'Continue current operations'}`;
  }
}
