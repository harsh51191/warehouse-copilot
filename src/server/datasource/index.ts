 import { getLoadingStatusFromFile, getSBLTimelineFromFile, getPTLTimelineFromFile, getStationCompletionFromFile, LoadingStatus, SBLTimeline } from "@/server/datasource/file-adapter";

export type RunnerFunction = (parameters: Record<string, any>) => Promise<any>;

export async function getLoadingStatus(): Promise<LoadingStatus> {
	const source = process.env.DATA_SOURCE?.toLowerCase() || 'file';
	if (source === 'file') return getLoadingStatusFromFile();
	// TODO: implement DB adapter using Mustache-templated SQL
	return getLoadingStatusFromFile();
}

export function getRunner(intent: string): RunnerFunction | null {
	const source = process.env.DATA_SOURCE?.toLowerCase() || 'file';
	
	if (source === 'file') {
		switch (intent) {
			case 'loading_status':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					// Generate text answer based on data
					const lowProgressTrips = data.byTrip.filter(trip => 
						trip.total > 0 && (trip.loaded / trip.total) < 0.6
					);
					
					let answer = `Loading status: ${data.summary.totalLoaded}/${data.summary.totalAssigned} crates loaded (${Math.round((data.summary.totalLoaded / data.summary.totalAssigned) * 100)}% complete). `;
					
					if (lowProgressTrips.length > 0) {
						answer += `Trips with <60% progress: ${lowProgressTrips.map(t => t.trip).join(', ')}. `;
					}
					
					answer += `QC queue has ${data.byTrip.reduce((sum, t) => sum + t.qc, 0)} pending crates.`;
					
					return {
						data,
						answer,
						uiPatch: {
							highlight: lowProgressTrips.length > 0 ? ['TripsGrid', 'WaveSummary'] : ['WaveSummary']
						}
					};
				};
				
			case 'sbl_prod_timeline':
				return async (parameters: Record<string, any>) => {
					const data = await getSBLTimelineFromFile(parameters);
					
					let answer = `SBL productivity timeline: Peak at ${data.summary.peakInterval} with ${data.summary.peakProductivity} lines/hour. `;
					answer += `Average productivity: ${data.summary.averageProductivity} lines/hour. `;
					answer += `Total lines processed: ${data.summary.totalLines}.`;
					
					return {
						data,
						answer,
						uiPatch: {
							highlight: ['SBLTrend', 'ProductivityChart']
						}
					};
				};
				
			case 'ptl_prod_timeline':
				return async (parameters: Record<string, any>) => {
					const data = await getPTLTimelineFromFile(parameters);
					
					let answer = `PTL productivity timeline: Peak at interval ${data.summary.peakInterval} with ${data.summary.peakProductivity} lines/hour. `;
					answer += `Average productivity: ${data.summary.averageProductivity} lines/hour. `;
					answer += `Total lines processed: ${data.summary.totalLines}.`;
					
					return {
						data,
						answer,
						uiPatch: { highlight: ['PTLTrend', 'ProductivityChart'] }
					};
				};
				
			case 'ptl_picking_status':
				return async (parameters: Record<string, any>) => {
					// Use mock data for now - in real implementation, read from PTL productivity Excel
					const currentProductivity = 165; // lines/hour per station
					const targetProductivity = 180;
					const isPicking = currentProductivity > 0;
					const performance = Math.round((currentProductivity / targetProductivity) * 100);
					
					let answer = `PTL is ${isPicking ? 'actively picking' : 'not picking'}. `;
					answer += `Current productivity: ${currentProductivity} lines/hour per station (${performance}% of target). `;
					answer += `Target: ${targetProductivity} lines/hour per station.`;
					
					if (performance < 90) {
						answer += ` Performance is below target - consider staffing adjustments.`;
					}
					
					return {
						data: {
							isPicking,
							currentProductivity,
							targetProductivity,
							performance,
							stations: 6
						},
						answer,
						uiPatch: {
							highlight: ['PTLTrend', 'ProductivityChart']
						}
					};
				};

			// Loading Progress Runners
			case 'loading_progress_by_trip':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const trips = data.byTrip.map(trip => ({
						trip: trip.trip,
						progress: Math.round((trip.loaded / trip.total) * 100),
						sorted: trip.sorted,
						staged: trip.staged,
						loaded: trip.loaded,
						total: trip.total
					}));
					
					let answer = `Loading progress by trip: `;
					trips.forEach(trip => {
						answer += `${trip.trip}: ${trip.progress}% (${trip.loaded}/${trip.total} crates). `;
					});
					
					return {
						data: { trips },
						answer,
						uiPatch: { highlight: ['TripsGrid', 'WaveSummary'] }
					};
				};

			case 'dockdoor_progress':
				return async (parameters: Record<string, any>) => {
					// Mock dockdoor data - in real implementation, read from Excel
					const dockdoors = [
						{ id: 'DD01', progress: 85, trips: 3 },
						{ id: 'DD02', progress: 92, trips: 2 },
						{ id: 'DD03', progress: 67, trips: 4 },
						{ id: 'DD04', progress: 78, trips: 3 }
					];
					const slowest = dockdoors.reduce((min, dd) => dd.progress < min.progress ? dd : min);
					
					let answer = `Dockdoor progress: ${dockdoors.map(dd => `DD${dd.id}: ${dd.progress}%`).join(', ')}. `;
					answer += `Slowest dockdoor: ${slowest.id} at ${slowest.progress}% with ${slowest.trips} trips.`;
					
					return {
						data: { dockdoors, slowest },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			case 'trips_below_threshold':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const threshold = parameters.threshold || 60;
					const lowTrips = data.byTrip.filter(trip => 
						trip.total > 0 && (trip.loaded / trip.total) < (threshold / 100)
					);
					
					let answer = `Trips below ${threshold}% loaded: `;
					if (lowTrips.length === 0) {
						answer += `None - all trips are above ${threshold}% completion.`;
					} else {
						lowTrips.forEach(trip => {
							const progress = Math.round((trip.loaded / trip.total) * 100);
							answer += `${trip.trip}: ${progress}% (Vehicle: ${trip.vehicleNo || 'N/A'}). `;
						});
					}
					
					return {
						data: { lowTrips, threshold },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			case 'case_vs_crate_progress':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const comparisons = data.byTrip.map(trip => ({
						trip: trip.trip,
						caseProgress: trip.casesLoaded && trip.casesStaged ? Math.round((trip.casesLoaded / trip.casesStaged) * 100) : 0,
						crateProgress: Math.round((trip.loaded / trip.total) * 100),
						casesLoaded: trip.casesLoaded || 0,
						casesStaged: trip.casesStaged || 0,
						cratesLoaded: trip.loaded,
						totalCrates: trip.total
					}));
					
					let answer = `Case vs Crate progress: `;
					comparisons.forEach(comp => {
						answer += `${comp.trip}: Cases ${comp.caseProgress}% (${comp.casesLoaded}/${comp.casesStaged}), Crates ${comp.crateProgress}% (${comp.cratesLoaded}/${comp.totalCrates}). `;
					});
					
					return {
						data: { comparisons },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			case 'xdock_trips_eta_risk':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const xdockTrips = data.byTrip.filter(trip => trip.xdock);
					const riskTrips = xdockTrips.filter(trip => {
						const progress = trip.total > 0 ? (trip.loaded / trip.total) : 0;
						return progress < 0.7; // 70% threshold for risk
					});
					
					let answer = `Crossdock trips ETA risk: `;
					if (riskTrips.length === 0) {
						answer += `No high-risk crossdock trips. All ${xdockTrips.length} crossdock trips are on track.`;
					} else {
						riskTrips.forEach(trip => {
							const progress = Math.round((trip.loaded / trip.total) * 100);
							answer += `${trip.trip}: ${progress}% - HIGH RISK. `;
						});
					}
					
					return {
						data: { xdockTrips, riskTrips },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			case 'zero_crates_staged':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const zeroStagedTrips = data.byTrip.filter(trip => trip.staged === 0);
					
					let answer = `Trips with zero crates staged: `;
					if (zeroStagedTrips.length === 0) {
						answer += `None - all trips have some staging progress.`;
					} else {
						zeroStagedTrips.forEach(trip => {
							answer += `${trip.trip} (${trip.total} total crates). `;
						});
					}
					
					return {
						data: { zeroStagedTrips },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			case 'dockdoor_queue_priority':
				return async (parameters: Record<string, any>) => {
					const data = await getLoadingStatusFromFile();
					const prioritizedTrips = data.byTrip
						.map(trip => ({
							...trip,
							progress: trip.total > 0 ? (trip.loaded / trip.total) : 0,
							queuePriority: trip.dockdoorQueue || 'Normal'
						}))
						.sort((a, b) => {
							// Sort by queue priority first, then by progress
							if (a.queuePriority !== b.queuePriority) {
								const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Normal': 1 };
								return (priorityOrder[b.queuePriority] || 0) - (priorityOrder[a.queuePriority] || 0);
							}
							return a.progress - b.progress; // Lower progress = higher priority
						});
					
					let answer = `Dockdoor queue priority: `;
					prioritizedTrips.forEach((trip, index) => {
						const progress = Math.round(trip.progress * 100);
						answer += `${index + 1}. ${trip.trip} (${trip.queuePriority} priority, ${progress}% complete). `;
					});
					
					return {
						data: { prioritizedTrips },
						answer,
						uiPatch: { highlight: ['TripsGrid'] }
					};
				};

			// SBL Productivity Runners
			case 'sbl_wave_start_time':
				return async (parameters: Record<string, any>) => {
					const data = await getSBLTimelineFromFile(parameters);
					const startTime = data.timeline.length > 0 ? data.timeline[0].interval : 'Unknown';
					
					let answer = `Wave started at: ${startTime}. `;
					answer += `Current productivity: ${data.summary.averageProductivity} lines/hour average.`;
					
					return {
						data: { startTime, timeline: data.timeline },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'sbl_active_stations':
				return async (parameters: Record<string, any>) => {
					const data = await getSBLTimelineFromFile(parameters);
					const stationCount = data.timeline.length > 0 ? data.timeline[0].stations : 8;
					
					let answer = `Active SBL stations this wave: ${stationCount}. `;
					answer += `Peak productivity: ${data.summary.peakProductivity} lines/hour at ${data.summary.peakInterval}.`;
					
					return {
						data: { stationCount, summary: data.summary },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'sbl_peak_interval':
				return async (parameters: Record<string, any>) => {
					const data = await getSBLTimelineFromFile(parameters);
					
					let answer = `Peak SBL output: ${data.summary.peakInterval} with ${data.summary.peakProductivity} lines/hour. `;
					answer += `Total lines processed: ${data.summary.totalLines}. `;
					answer += `Average productivity: ${data.summary.averageProductivity} lines/hour.`;
					
					return {
						data: { peak: data.summary, timeline: data.timeline },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'sbl_station_ranking':
				return async (parameters: Record<string, any>) => {
					// Mock station ranking data - in real implementation, read from Station Wise SBL productivity Excel
					const stations = [
						{ zone: 'Zone A', productivity: 185, completion: 95 },
						{ zone: 'Zone B', productivity: 172, completion: 88 },
						{ zone: 'Zone C', productivity: 198, completion: 92 },
						{ zone: 'Zone D', productivity: 165, completion: 85 }
					].sort((a, b) => b.productivity - a.productivity);
					
					const topStation = stations[0];
					const bottomStation = stations[stations.length - 1];
					
					let answer = `SBL station ranking: `;
					answer += `Top: ${topStation.zone} (${topStation.productivity} LPH, ${topStation.completion}% complete). `;
					answer += `Bottom: ${bottomStation.zone} (${bottomStation.productivity} LPH, ${bottomStation.completion}% complete).`;
					
					return {
						data: { stations, topStation, bottomStation },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'station_completion_percentage':
				return async (parameters: Record<string, any>) => {
					const data = await getStationCompletionFromFile(parameters);
					
					let answer = `Station completion percentages: `;
					data.stations.forEach((station: any) => {
						answer += `${station.code}: ${station.completionPercentage}% (${station.pendingLines} pending). `;
					});
					answer += `Average completion: ${data.summary.averageCompletion}%. `;
					answer += `${data.summary.completedStations}/${data.summary.totalStations} stations completed.`;
					
					return {
						data,
						answer,
						uiPatch: { highlight: ['SBLTrend', 'PTLTrend'] }
					};
				};

			case 'stations_with_pending_lines':
				return async (parameters: Record<string, any>) => {
					const threshold = parameters.threshold || 10;
					// Mock pending lines data
					const stations = [
						{ station: 'SBL-01', pending: 5, total: 120 },
						{ station: 'SBL-02', pending: 28, total: 115 },
						{ station: 'PTL-01', pending: 15, total: 95 },
						{ station: 'PTL-02', pending: 35, total: 110 }
					].filter(s => s.pending > threshold);
					
					let answer = `Stations with >${threshold} pending lines: `;
					if (stations.length === 0) {
						answer += `None - all stations are below the threshold.`;
					} else {
						stations.forEach(station => {
							answer += `${station.station}: ${station.pending} pending (${station.total} total). `;
						});
					}
					
					return {
						data: { stations, threshold },
						answer,
						uiPatch: { highlight: ['SBLTrend', 'PTLTrend'] }
					};
				};

			// SBL Infeed Runners
			case 'sbl_infeed_rate':
				return async (parameters: Record<string, any>) => {
					// Mock infeed rate data - in real implementation, read from sbl_infeed_rate Excel
					const infeedData = [
						{ interval: '10:00-10:10', cartons: 45 },
						{ interval: '10:10-10:20', cartons: 52 },
						{ interval: '10:20-10:30', cartons: 38 },
						{ interval: '10:30-10:40', cartons: 0 },
						{ interval: '10:40-10:50', cartons: 48 }
					];
					
					const avgRate = infeedData.reduce((sum, d) => sum + d.cartons, 0) / infeedData.length;
					const zeroIntervals = infeedData.filter(d => d.cartons === 0);
					
					let answer = `SBL infeed rate over time: Average ${avgRate.toFixed(1)} cartons per 10-min interval. `;
					if (zeroIntervals.length > 0) {
						answer += `Zero feed intervals: ${zeroIntervals.map(z => z.interval).join(', ')}.`;
					}
					
					return {
						data: { infeedData, avgRate, zeroIntervals },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'zero_feed_intervals':
				return async (parameters: Record<string, any>) => {
					// Mock zero feed data
					const zeroIntervals = [
						{ interval: '10:30-10:40', reason: 'Conveyor maintenance' },
						{ interval: '11:15-11:25', reason: 'Carton shortage' }
					];
					
					let answer = `Intervals with zero feed: `;
					if (zeroIntervals.length === 0) {
						answer += `None - consistent infeed throughout the wave.`;
					} else {
						zeroIntervals.forEach(interval => {
							answer += `${interval.interval} (${interval.reason}). `;
						});
					}
					
					return {
						data: { zeroIntervals },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			case 'infeed_starving_sbl':
				return async (parameters: Record<string, any>) => {
					// Mock analysis - compare infeed vs station productivity
					const infeedRate = 45; // cartons per 10-min
					const stationCapacity = 8; // stations
					const expectedConsumption = stationCapacity * 6; // 6 cartons per station per 10-min
					const isStarving = infeedRate < expectedConsumption * 0.8; // 80% threshold
					
					let answer = `SBL infeed analysis: `;
					answer += `Infeed rate: ${infeedRate} cartons/10min. `;
					answer += `Expected consumption: ${expectedConsumption} cartons/10min. `;
					answer += isStarving ? `SBL is being starved - infeed is insufficient.` : `SBL has adequate infeed.`;
					
					return {
						data: { infeedRate, expectedConsumption, isStarving },
						answer,
						uiPatch: { highlight: ['SBLTrend'] }
					};
				};

			// PTL Productivity Runners
			case 'ptl_zone_productivity':
				return async (parameters: Record<string, any>) => {
					// Mock PTL zone data - in real implementation, read from ptl_productivity Excel
					const zones = [
						{ zone: 'Loop 1', productivity: 165, stations: 3 },
						{ zone: 'Loop 2', productivity: 142, stations: 2 },
						{ zone: 'Loop 3', productivity: 178, stations: 4 },
						{ zone: 'Loop 4', productivity: 155, stations: 3 }
					].sort((a, b) => b.productivity - a.productivity);
					
					const avgProductivity = zones.reduce((sum, z) => sum + z.productivity, 0) / zones.length;
					
					let answer = `PTL average productivity by zone: `;
					zones.forEach(zone => {
						answer += `${zone.zone}: ${zone.productivity} LPH (${zone.stations} stations). `;
					});
					answer += `Overall average: ${avgProductivity.toFixed(1)} LPH.`;
					
					return {
						data: { zones, avgProductivity },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			case 'ptl_last_ten_min':
				return async (parameters: Record<string, any>) => {
					// Mock last 10-min data
					const lastTenMin = [
						{ zone: 'Loop 1', productivity: 168, lines: 28 },
						{ zone: 'Loop 2', productivity: 145, lines: 24 },
						{ zone: 'Loop 3', productivity: 182, lines: 30 },
						{ zone: 'Loop 4', productivity: 158, lines: 26 }
					];
					
					let answer = `Last 10-min PTL productivity: `;
					lastTenMin.forEach(zone => {
						answer += `${zone.zone}: ${zone.productivity} LPH (${zone.lines} lines). `;
					});
					
					return {
						data: { lastTenMin },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			case 'ptl_zones_below_target':
				return async (parameters: Record<string, any>) => {
					const targetLPH = parameters.target_lph || 150;
					// Mock zone data
					const zones = [
						{ zone: 'Loop 1', productivity: 165, target: targetLPH },
						{ zone: 'Loop 2', productivity: 142, target: targetLPH },
						{ zone: 'Loop 3', productivity: 178, target: targetLPH },
						{ zone: 'Loop 4', productivity: 155, target: targetLPH }
					];
					
					const belowTarget = zones.filter(z => z.productivity < targetLPH);
					
					let answer = `PTL zones below ${targetLPH} LPH target: `;
					if (belowTarget.length === 0) {
						answer += `None - all zones are meeting the target.`;
					} else {
						belowTarget.forEach(zone => {
							const gap = targetLPH - zone.productivity;
							answer += `${zone.zone}: ${zone.productivity} LPH (${gap} below target). `;
						});
					}
					
					return {
						data: { zones, belowTarget, targetLPH },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			case 'ptl_productivity_timeline':
				return async (parameters: Record<string, any>) => {
					// Mock PTL timeline data
					const timeline = [
						{ interval: '10:00-10:10', productivity: 165, zones: 4 },
						{ interval: '10:10-10:20', productivity: 172, zones: 4 },
						{ interval: '10:20-10:30', productivity: 158, zones: 3 },
						{ interval: '10:30-10:40', productivity: 185, zones: 5 }
					];
					
					const peak = timeline.reduce((max, t) => t.productivity > max.productivity ? t : max);
					const avg = timeline.reduce((sum, t) => sum + t.productivity, 0) / timeline.length;
					
					let answer = `PTL productivity over time: `;
					answer += `Peak: ${peak.interval} with ${peak.productivity} LPH. `;
					answer += `Average: ${avg.toFixed(1)} LPH across ${timeline.length} intervals.`;
					
					return {
						data: { timeline, peak, average: avg },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			case 'ptl_start_time':
				return async (parameters: Record<string, any>) => {
					// Mock PTL start time
					const startTime = '09:45 AM';
					const currentTime = new Date().toLocaleTimeString();
					
					let answer = `PTL started picking at: ${startTime}. `;
					answer += `Current time: ${currentTime}. `;
					answer += `PTL has been running for approximately 2.5 hours.`;
					
					return {
						data: { startTime, currentTime, duration: '2.5 hours' },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			case 'station_addition_impact':
				return async (parameters: Record<string, any>) => {
					// Mock station addition analysis
					const beforeStations = 4;
					const afterStations = 5;
					const productivityIncrease = 18; // LPH increase
					const linesIncrease = 45; // lines per 10-min increase
					
					let answer = `Station addition impact: `;
					answer += `Adding 1 station increased productivity by ${productivityIncrease} LPH. `;
					answer += `Output increased by ${linesIncrease} lines per 10-min interval. `;
					answer += `Efficiency gain: ${Math.round((productivityIncrease / 150) * 100)}% improvement.`;
					
					return {
						data: { beforeStations, afterStations, productivityIncrease, linesIncrease },
						answer,
						uiPatch: { highlight: ['PTLTrend'] }
					};
				};

			// Crossdock ASN Runners
			case 'asn_trip_mapping':
				return async (parameters: Record<string, any>) => {
					// Mock ASN trip mapping data
					const asnMappings = [
						{ trip: 'TRP001', asn: 'ASN001', skuCount: 15, asnQty: 120, receivedQty: 115, grnQty: 110 },
						{ trip: 'TRP001', asn: 'ASN002', skuCount: 8, asnQty: 85, receivedQty: 85, grnQty: 80 },
						{ trip: 'TRP002', asn: 'ASN003', skuCount: 22, asnQty: 200, receivedQty: 180, grnQty: 175 }
					];
					
					let answer = `ASN trip mapping: `;
					asnMappings.forEach(mapping => {
						const receivedPct = Math.round((mapping.receivedQty / mapping.asnQty) * 100);
						const grnPct = Math.round((mapping.grnQty / mapping.asnQty) * 100);
						answer += `${mapping.trip} → ${mapping.asn}: ${mapping.skuCount} SKUs, ${receivedPct}% received, ${grnPct}% GRN. `;
					});
					
					return {
						data: { asnMappings },
						answer,
						uiPatch: { highlight: ['ASNProgress'] }
					};
				};

			case 'asn_lagging_receiving':
				return async (parameters: Record<string, any>) => {
					// Mock lagging ASN data
					const laggingASNs = [
						{ asn: 'ASN004', asnQty: 150, receivedQty: 90, grnQty: 85, gap: 60, risk: 'HIGH' },
						{ asn: 'ASN005', asnQty: 200, receivedQty: 160, grnQty: 155, gap: 40, risk: 'MEDIUM' }
					];
					
					let answer = `ASNs lagging in receiving: `;
					laggingASNs.forEach(asn => {
						answer += `${asn.asn}: ${asn.gap} units gap (${asn.risk} risk). `;
					});
					
					return {
						data: { laggingASNs },
						answer,
						uiPatch: { highlight: ['ASNProgress'] }
					};
				};

			case 'inbound_received_sufficiency':
				return async (parameters: Record<string, any>) => {
					// Mock inbound sufficiency data
					const tripSufficiency = [
						{ trip: 'TRP001', asnCount: 3, asnQty: 250, receivedQty: 240, grnQty: 235, sufficient: true },
						{ trip: 'TRP002', asnCount: 2, asnQty: 180, receivedQty: 120, grnQty: 115, sufficient: false },
						{ trip: 'TRP003', asnCount: 4, asnQty: 320, receivedQty: 320, grnQty: 315, sufficient: true }
					];
					
					const insufficientTrips = tripSufficiency.filter(t => !t.sufficient);
					
					let answer = `Inbound received sufficiency: `;
					if (insufficientTrips.length === 0) {
						answer += `All trips have sufficient inbound received.`;
					} else {
						insufficientTrips.forEach(trip => {
							const gap = trip.asnQty - trip.receivedQty;
							answer += `${trip.trip}: ${gap} units short (${trip.receivedQty}/${trip.asnQty} received). `;
						});
					}
					
					return {
						data: { tripSufficiency, insufficientTrips },
						answer,
						uiPatch: { highlight: ['ASNProgress'] }
					};
				};

			case 'xdock_inbound_gap':
				return async (parameters: Record<string, any>) => {
					// Mock xdock gap data
					const xdockGaps = [
						{ xdock: 'XD001', asnQty: 500, receivedQty: 450, grnQty: 440, gap: 50 },
						{ xdock: 'XD002', asnQty: 300, receivedQty: 200, grnQty: 195, gap: 100 },
						{ xdock: 'XD003', asnQty: 400, receivedQty: 380, grnQty: 375, gap: 20 }
					].sort((a, b) => b.gap - a.gap);
					
					const largestGap = xdockGaps[0];
					
					let answer = `Xdock inbound gaps: `;
					answer += `Largest gap: ${largestGap.xdock} with ${largestGap.gap} units short. `;
					answer += `Other gaps: ${xdockGaps.slice(1).map(x => `${x.xdock}: ${x.gap}`).join(', ')}.`;
					
					return {
						data: { xdockGaps, largestGap },
						answer,
						uiPatch: { highlight: ['ASNProgress'] }
					};
				};

			// Composite Runners
			case 'otif_tracking':
				return async (parameters: Record<string, any>) => {
					const wave = parameters.wave || '3';
					// Mock OTIF analysis
					const sblProgress = 85; // %
					const ptlProgress = 78; // %
					const loadingProgress = 92; // %
					const overallOTIF = Math.min(sblProgress, ptlProgress, loadingProgress);
					const isOnTrack = overallOTIF > 80;
					
					let answer = `OTIF tracking for Wave ${wave}: `;
					answer += `Overall progress: ${overallOTIF}%. `;
					answer += `SBL: ${sblProgress}%, PTL: ${ptlProgress}%, Loading: ${loadingProgress}%. `;
					answer += isOnTrack ? `On track for OTIF delivery.` : `At risk - focus on bottleneck areas.`;
					
					return {
						data: { wave, sblProgress, ptlProgress, loadingProgress, overallOTIF, isOnTrack },
						answer,
						uiPatch: { highlight: ['WaveSummary', 'SBLTrend', 'PTLTrend', 'TripsGrid'] }
					};
				};

			case 'current_bottleneck':
				return async (parameters: Record<string, any>) => {
					// Mock bottleneck analysis
					const bottlenecks = [
						{ area: 'SBL Zone C', severity: 'HIGH', impact: '18% productivity drop', action: 'Add 1 picker' },
						{ area: 'PTL Loop 2', severity: 'MEDIUM', impact: '12% slower than target', action: 'Check equipment' },
						{ area: 'QC Queue', severity: 'LOW', impact: '5 crates backlog', action: 'Increase QC capacity' }
					];
					
					const primaryBottleneck = bottlenecks[0];
					
					let answer = `Current bottlenecks: `;
					answer += `Primary: ${primaryBottleneck.area} (${primaryBottleneck.severity} severity) - ${primaryBottleneck.impact}. `;
					answer += `Recommended action: ${primaryBottleneck.action}.`;
					
					return {
						data: { bottlenecks, primaryBottleneck },
						answer,
						uiPatch: { highlight: ['SBLTrend', 'PTLTrend', 'TripsGrid'] }
					};
				};

			case 'picker_addition_impact':
				return async (parameters: Record<string, any>) => {
					const loop = parameters.loop || '2';
					const pickers = parameters.pickers || 1;
					
					// Mock picker addition impact
					const currentProductivity = 142; // LPH
					const expectedIncrease = 25; // LPH per picker
					const newProductivity = currentProductivity + (expectedIncrease * pickers);
					const improvement = Math.round(((newProductivity - currentProductivity) / currentProductivity) * 100);
					
					let answer = `Adding ${pickers} picker(s) to Loop ${loop}: `;
					answer += `Current productivity: ${currentProductivity} LPH. `;
					answer += `Expected new productivity: ${newProductivity} LPH (+${improvement}% improvement). `;
					answer += `Estimated additional output: ${expectedIncrease * pickers} lines per hour.`;
					
					return {
						data: { loop, pickers, currentProductivity, newProductivity, improvement },
						answer,
						uiPatch: { highlight: ['PTLTrend', 'SBLTrend'] }
					};
				};

			case 'completion_actions':
				return async (parameters: Record<string, any>) => {
					const targetImprovement = parameters.target_improvement || 20;
					const timeframe = parameters.timeframe || 30;
					
					// Mock completion actions
					const actions = [
						{ action: 'Reassign picker from Loop 1 to Loop 2', impact: '+15%', effort: 'Low' },
						{ action: 'Increase SBL infeed rate by 20%', impact: '+12%', effort: 'Medium' },
						{ action: 'Prioritize high-value trips in loading', impact: '+8%', effort: 'Low' }
					];
					
					let answer = `Actions to improve completion by ${targetImprovement}% in ${timeframe} minutes: `;
					actions.forEach((action, index) => {
						answer += `${index + 1}. ${action.action} (${action.impact} impact, ${action.effort} effort). `;
					});
					
					return {
						data: { actions, targetImprovement, timeframe },
						answer,
						uiPatch: { highlight: ['WaveSummary', 'SBLTrend', 'PTLTrend', 'TripsGrid'] }
					};
				};
				
			case 'crossdock_asn':
				return async (parameters: Record<string, any>) => {
					// TODO: implement crossdock ASN runner
					return {
						data: { asns: [], summary: { total: 0, completed: 0, pending: 0 } },
						answer: "Crossdock ASN status not yet implemented.",
						uiPatch: { highlight: ['ASNProgress'] }
					};
				};
				
			default:
				return null;
		}
	}
	
	// TODO: implement DB runners
	return null;
} 