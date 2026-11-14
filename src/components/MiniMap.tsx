import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AutoPilotWaypoint, CheckpointData, HiddenAreaData, SatelliteRelayData, WeatherData } from '../types/game';
import { sounds } from '../audio/SoundEffects';

export type MinimapZoomMode = 'local' | 'tactical';

const MINIMAP_ZOOM_STORAGE_KEY = 'mars_minimap_zoom_mode';
const LOCAL_RADAR_RADIUS = 45; // Tight local view of immediate surroundings (45m)
const TACTICAL_RADAR_RADIUS = 135; // Wider tactical view of mission area (135m)

function loadMinimapZoomMode(): MinimapZoomMode {
  try {
    const saved = window.localStorage?.getItem(MINIMAP_ZOOM_STORAGE_KEY);
    if (saved === 'local' || saved === 'tactical') return saved;
  } catch {}
  return 'tactical';
}

interface MiniMapProps {
  playerPos: { x: number; z: number };
  playerHeading: number;
  isDrivingRover: boolean;
  spaceStationPos: { x: number; z: number };
  roverPos: { x: number; z: number };
  activeObjective: { x: number; z: number; title: string } | null;
  checkpoints: CheckpointData[];
  crystals: { id: number; x: number; z: number; collected: boolean }[];
  weather?: WeatherData;
  remoteCrew?: { id: string; name: string; x: number; z: number; color: string }[];
  bountyTarget?: { x: number; z: number; label: string } | null;
  tablets?: { id: string; x: number; z: number; discovered: boolean }[];
  hiddenAreas?: HiddenAreaData[];
  satelliteRelays?: SatelliteRelayData[];
  autoPilotTarget?: AutoPilotWaypoint | null;
  onOpenAutoPilot?: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = React.memo(({
  playerPos,
  playerHeading,
  isDrivingRover,
  spaceStationPos,
  roverPos,
  activeObjective,
  checkpoints,
  crystals,
  weather,
  remoteCrew = [],
  bountyTarget = null,
  tablets = [],
  hiddenAreas = [],
  satelliteRelays = [],
  autoPilotTarget = null,
  onOpenAutoPilot,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zoomMode, setZoomMode] = useState<MinimapZoomMode>(loadMinimapZoomMode);

  const selectZoomMode = useCallback((nextMode: MinimapZoomMode) => {
    setZoomMode(nextMode);
    try {
      window.localStorage?.setItem(MINIMAP_ZOOM_STORAGE_KEY, nextMode);
    } catch {}
  }, []);

  // Desktop keyboard shortcut: press M to toggle Local <-> Tactical radar zoom
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return;
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
      sounds.playClick();
      setZoomMode((prev) => {
        const next: MinimapZoomMode = prev === 'local' ? 'tactical' : 'local';
        try {
          window.localStorage?.setItem(MINIMAP_ZOOM_STORAGE_KEY, next);
        } catch {}
        return next;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isLocalView = zoomMode === 'local';
  const radarRadius = isLocalView ? LOCAL_RADAR_RADIUS : TACTICAL_RADAR_RADIUS;
  const mapPixelSize = 136; // 136x136 px circular map
  const mapCenter = mapPixelSize / 2;
  const innerRadius = mapCenter - 8;

  // Calculate distances in meters
  const distToObjective = useMemo(() => {
    if (!activeObjective) return null;
    return Math.round(Math.hypot(playerPos.x - activeObjective.x, playerPos.z - activeObjective.z));
  }, [playerPos, activeObjective]);

  const distToStation = useMemo(() => {
    return Math.round(Math.hypot(playerPos.x - spaceStationPos.x, playerPos.z - spaceStationPos.z));
  }, [playerPos, spaceStationPos]);

  const distToRover = useMemo(() => {
    return Math.round(Math.hypot(playerPos.x - roverPos.x, playerPos.z - roverPos.z));
  }, [playerPos, roverPos]);

  /**
   * Converts world coordinates (worldX, worldZ) relative to player into radar SVG (cx, cy)
   * On Mars terrain: Z- is North, Z+ is South, X+ is East, X- is West.
   */
  const worldToRadar = (worldX: number, worldZ: number) => {
    const dx = worldX - playerPos.x;
    const dz = worldZ - playerPos.z;
    const dist = Math.hypot(dx, dz);

    // Scale to radar bounds
    const isClamped = dist > radarRadius;
    const displayDist = Math.min(dist, radarRadius);
    const scale = (displayDist / radarRadius) * innerRadius;
    const angle = Math.atan2(dz, dx); // angle in standard Cartesian

    return {
      x: mapCenter + Math.cos(angle) * scale,
      y: mapCenter + Math.sin(angle) * scale,
      isClamped,
      dist: Math.round(dist),
    };
  };

  const distToBounty = useMemo(() => {
    if (!bountyTarget) return null;
    return Math.round(Math.hypot(playerPos.x - bountyTarget.x, playerPos.z - bountyTarget.z));
  }, [playerPos, bountyTarget]);

  const stationRadar = worldToRadar(spaceStationPos.x, spaceStationPos.z);
  const roverRadar = worldToRadar(roverPos.x, roverPos.z);
  const objectiveRadar = activeObjective ? worldToRadar(activeObjective.x, activeObjective.z) : null;
  const bountyRadar = bountyTarget ? worldToRadar(bountyTarget.x, bountyTarget.z) : null;
  const autoPilotRadar = autoPilotTarget ? worldToRadar(autoPilotTarget.x, autoPilotTarget.z) : null;

  // Heading angle for directional pointer
  // playerHeading in Engine: targetAngle = Math.atan2(moveDir.x, moveDir.z)
  const headingDeg = (playerHeading * 180) / Math.PI;

  return (
    <div className="flex flex-col items-end pointer-events-auto select-none" data-interactive-ui="true">
      {/* Radar Main Card */}
      <div className="bg-slate-950/90 border border-amber-600/75 rounded-2xl shadow-xl p-1 [@media(min-height:540px)]:p-1.5 backdrop-blur-none text-slate-200">
        {/* Top Header Bar with Controls */}
        <div className="flex items-center justify-between gap-1 mb-0.5 px-0.5">
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                weather?.type === 'storm'
                  ? 'bg-rose-500'
                  : weather?.type === 'warning'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="font-game font-bold text-[9px] [@media(min-height:540px)]:text-[10px] text-amber-400 uppercase tracking-wider">
              {weather?.type === 'storm' ? 'STORM' : 'RADAR'}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <span
              className={`px-1 py-0.5 rounded text-[8px] font-mono-numbers font-bold leading-none border ${
                isLocalView
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                  : 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300'
              }`}
              title={`Current radar radius: ${radarRadius}m`}
            >
              {radarRadius}m
            </span>

            <button
              onClick={() => {
                sounds.playClick();
                setIsCollapsed(!isCollapsed);
              }}
              title={isCollapsed ? 'Expand Radar' : 'Minimize Radar'}
              className="w-4 h-4 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-[10px] font-bold transition leading-none"
            >
              {isCollapsed ? '▾' : '▴'}
            </button>
          </div>
        </div>

        {/* Local / Tactical Zoom Control Toggle */}
        {!isCollapsed && (
          <div
            data-testid="minimap-zoom-toggle"
            role="group"
            aria-label="Minimap Zoom View"
            className="grid grid-cols-2 gap-0.5 p-0.5 mb-0.5 rounded-lg bg-slate-900/95 border border-slate-700/80"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sounds.playClick();
                selectZoomMode('local');
              }}
              aria-pressed={isLocalView}
              title={`Local View (${LOCAL_RADAR_RADIUS}m radius — tight immediate surroundings · Key: M)`}
              className={`px-1.5 py-0.5 rounded-md text-[8px] [@media(min-height:540px)]:text-[9px] font-game font-bold uppercase tracking-wide transition leading-none ${
                isLocalView
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sounds.playClick();
                selectZoomMode('tactical');
              }}
              aria-pressed={!isLocalView}
              title={`Tactical View (${TACTICAL_RADAR_RADIUS}m radius — wider mission area · Key: M)`}
              className={`px-1.5 py-0.5 rounded-md text-[8px] [@media(min-height:540px)]:text-[9px] font-game font-bold uppercase tracking-wide transition leading-none ${
                !isLocalView
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              Tactical
            </button>
          </div>
        )}

        {/* Collapsible Radar View */}
        {!isCollapsed && (
          <>
            {/* Circular Radar Display (tap to open Auto-Pilot Map) */}
            <div
              onClick={() => {
                if (onOpenAutoPilot) {
                  sounds.playClick();
                  onOpenAutoPilot();
                }
              }}
              title={onOpenAutoPilot ? 'Tap Radar to open Rover Auto-Pilot Waypoint Map' : undefined}
              className={`relative flex items-center justify-center my-0.5 [@media(min-height:540px)]:my-1 ${
                onOpenAutoPilot ? 'cursor-pointer' : ''
              }`}
            >
              <svg
                width={mapPixelSize}
                height={mapPixelSize}
                viewBox={`0 0 ${mapPixelSize} ${mapPixelSize}`}
                className="w-[70px] h-[70px] [@media(min-height:500px)]:w-[88px] [@media(min-height:500px)]:h-[88px] [@media(min-height:680px)]:w-[108px] [@media(min-height:680px)]:h-[108px] overflow-visible"
              >
                <defs>
                  {/* Radar Background Gradient */}
                  <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={isLocalView ? '#0c241d' : '#2a1209'} stopOpacity="0.95" />
                    <stop offset="70%" stopColor={isLocalView ? '#071713' : '#1a0c06'} stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#050608" stopOpacity="1" />
                  </radialGradient>

                  {/* Objective Pulse Gradient */}
                  <radialGradient id="objGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Radar Base Circle */}
                <circle
                  cx={mapCenter}
                  cy={mapCenter}
                  r={innerRadius}
                  fill="url(#radarBg)"
                  stroke={isLocalView ? 'rgba(52, 211, 153, 0.55)' : 'rgba(245, 158, 11, 0.45)'}
                  strokeWidth="1.5"
                />

                {/* Concentric Distance Rings */}
                <circle
                  cx={mapCenter}
                  cy={mapCenter}
                  r={innerRadius * 0.35}
                  fill="none"
                  stroke={isLocalView ? 'rgba(52, 211, 153, 0.22)' : 'rgba(245, 158, 11, 0.16)'}
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <circle
                  cx={mapCenter}
                  cy={mapCenter}
                  r={innerRadius * 0.7}
                  fill="none"
                  stroke={isLocalView ? 'rgba(52, 211, 153, 0.28)' : 'rgba(245, 158, 11, 0.22)'}
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Crosshairs */}
                <line
                  x1={mapCenter}
                  y1={mapCenter - innerRadius}
                  x2={mapCenter}
                  y2={mapCenter + innerRadius}
                  stroke={isLocalView ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.18)'}
                  strokeWidth="1"
                />
                <line
                  x1={mapCenter - innerRadius}
                  y1={mapCenter}
                  x2={mapCenter + innerRadius}
                  y2={mapCenter}
                  stroke={isLocalView ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.18)'}
                  strokeWidth="1"
                />

                {/* Cardinal Points */}
                <text x={mapCenter} y="11" textAnchor="middle" fontSize="8" fontWeight="bold" fill={isLocalView ? '#34d399' : '#f59e0b'}>
                  N
                </text>
                <text x={mapPixelSize - 4} y={mapCenter + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">
                  E
                </text>
                <text x={mapCenter} y={mapPixelSize - 1} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">
                  S
                </text>
                <text x="4" y={mapCenter + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">
                  W
                </text>

                {/* 1. Uncollected Crystals (Tiny diamonds) */}
                {crystals.map((c) => {
                  if (c.collected) return null;
                  const cr = worldToRadar(c.x, c.z);
                  return (
                    <g key={c.id}>
                      <polygon
                        points={`${cr.x},${cr.y - 3} ${cr.x + 2.5},${cr.y} ${cr.x},${cr.y + 3} ${cr.x - 2.5},${cr.y}`}
                        fill="#c084fc"
                        stroke="#e879f9"
                        strokeWidth="0.5"
                        opacity={cr.isClamped ? 0.4 : 0.85}
                      />
                    </g>
                  );
                })}

                {/* 1b. Undiscovered Mars History Lore Tablets (Tiny teal squares) */}
                {tablets.map((t) => {
                  if (t.discovered) return null;
                  const tr = worldToRadar(t.x, t.z);
                  return (
                    <rect
                      key={t.id}
                      x={tr.x - 2.3}
                      y={tr.y - 2.3}
                      width="4.6"
                      height="4.6"
                      rx="1"
                      fill="#2dd4bf"
                      stroke="#ccfbf1"
                      strokeWidth="0.6"
                      opacity={tr.isClamped ? 0.35 : 0.9}
                    />
                  );
                })}

                {/* 1c. Hidden Caves & Secret Research Sites */}
                {hiddenAreas.map((area) => {
                  const ar = worldToRadar(area.position[0], area.position[2]);
                  return (
                    <circle
                      key={area.id}
                      cx={ar.x}
                      cy={ar.y}
                      r={area.discovered ? '2.8' : '3.2'}
                      fill={area.discovered ? '#10b981' : '#a855f7'}
                      stroke="#f8fafc"
                      strokeWidth="0.7"
                      opacity={ar.isClamped ? 0.38 : 0.92}
                    />
                  );
                })}

                {/* 1d. Orbital Satellite Relay Dishes */}
                {satelliteRelays.map((relay) => {
                  const sr = worldToRadar(relay.position[0], relay.position[2]);
                  return (
                    <polygon
                      key={relay.id}
                      points={`${sr.x},${sr.y - 3.6} ${sr.x + 3.2},${sr.y + 2.8} ${sr.x - 3.2},${sr.y + 2.8}`}
                      fill={relay.aligned ? '#10b981' : '#f59e0b'}
                      stroke="#ffffff"
                      strokeWidth="0.7"
                      opacity={sr.isClamped ? 0.45 : 0.95}
                    />
                  );
                })}

                {/* 2. Checkpoints */}
                {checkpoints.map((cp) => {
                  const cpr = worldToRadar(cp.position[0], cp.position[2]);
                  return (
                    <circle
                      key={cp.id}
                      cx={cpr.x}
                      cy={cpr.y}
                      r={cp.activated ? "3" : "2.5"}
                      fill={cp.activated ? "#22c55e" : "#f59e0b"}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  );
                })}

                {/* 3. Space Station Marker (🛰️) */}
                <g>
                  <circle
                    cx={stationRadar.x}
                    cy={stationRadar.y}
                    r="5.5"
                    fill="rgba(56, 189, 248, 0.25)"
                  />
                  <circle
                    cx={stationRadar.x}
                    cy={stationRadar.y}
                    r="3.5"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={stationRadar.x}
                    y={stationRadar.y - 5}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="bold"
                    fill="#38bdf8"
                  >
                    BASE
                  </text>
                </g>

                {/* 4. Mars Rover Marker (🚗) */}
                <g>
                  <circle
                    cx={roverRadar.x}
                    cy={roverRadar.y}
                    r="5.5"
                    fill="rgba(34, 211, 238, 0.25)"
                  />
                  <circle
                    cx={roverRadar.x}
                    cy={roverRadar.y}
                    r="3.5"
                    fill="#22d3ee"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={roverRadar.x}
                    y={roverRadar.y - 5}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="bold"
                    fill="#22d3ee"
                  >
                    ROVER
                  </text>
                </g>

                {/* 5. Connected Friend Crew Markers */}
                {remoteCrew.map((friend) => {
                  const fr = worldToRadar(friend.x, friend.z);
                  return (
                    <g key={friend.id}>
                      <circle
                        cx={fr.x}
                        cy={fr.y}
                        r="4"
                        fill={friend.color}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x={fr.x}
                        y={fr.y - 6}
                        textAnchor="middle"
                        fontSize="6.5"
                        fontWeight="bold"
                        fill="#e2e8f0"
                      >
                        {friend.name.slice(0, 8)}
                      </text>
                    </g>
                  );
                })}

                {/* 6. Active Objective Target Marker */}
                {objectiveRadar && (
                  <g>
                    <circle
                      cx={objectiveRadar.x}
                      cy={objectiveRadar.y}
                      r="7.5"
                      fill="url(#objGlow)"
                      opacity="0.55"
                    />
                    <circle
                      cx={objectiveRadar.x}
                      cy={objectiveRadar.y}
                      r="4.5"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx={objectiveRadar.x}
                      cy={objectiveRadar.y}
                      r="1.5"
                      fill="#ffffff"
                    />
                    <text
                      x={objectiveRadar.x}
                      y={objectiveRadar.y - 6}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="bold"
                      fill="#fbbf24"
                    >
                      GOAL
                    </text>
                  </g>
                )}

                {/* 6b. Active Daily Bounty Location Beacon Marker */}
                {bountyRadar && (
                  <g>
                    <polygon
                      points={`${bountyRadar.x},${bountyRadar.y - 6} ${bountyRadar.x + 5},${bountyRadar.y} ${bountyRadar.x},${bountyRadar.y + 6} ${bountyRadar.x - 5},${bountyRadar.y}`}
                      fill="#facc15"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={bountyRadar.x}
                      y={bountyRadar.y - 8}
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill="#fde047"
                    >
                      BOUNTY
                    </text>
                  </g>
                )}

                {/* 6c. Active Auto-Pilot Dashed Trajectory Line & Target Pin */}
                {autoPilotRadar && (
                  <g>
                    <line
                      x1={roverRadar.x}
                      y1={roverRadar.y}
                      x2={autoPilotRadar.x}
                      y2={autoPilotRadar.y}
                      stroke="#22d3ee"
                      strokeWidth="1.6"
                      strokeDasharray="3 3"
                      opacity="0.9"
                    />
                    <circle
                      cx={autoPilotRadar.x}
                      cy={autoPilotRadar.y}
                      r="5"
                      fill="rgba(34, 211, 238, 0.3)"
                      stroke="#22d3ee"
                      strokeWidth="1.2"
                    />
                    <text
                      x={autoPilotRadar.x}
                      y={autoPilotRadar.y - 7}
                      textAnchor="middle"
                      fontSize="6.5"
                      fontWeight="bold"
                      fill="#67e8f9"
                    >
                      AUTO
                    </text>
                  </g>
                )}

                {/* 7. Center Player Indicator & Directional Heading Arrow */}
                <g transform={`translate(${mapCenter}, ${mapCenter})`}>
                  {/* Outer player ring */}
                  <circle r="4" fill={isDrivingRover ? '#06b6d4' : '#ea580c'} stroke="#ffffff" strokeWidth="1" />
                  {/* Direction pointer rotated by player heading */}
                  <g transform={`rotate(${headingDeg})`}>
                    <polygon
                      points="0,-8 -3,-3 3,-3"
                      fill={isDrivingRover ? '#22d3ee' : '#f59e0b'}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  </g>
                </g>
              </svg>
            </div>

            {/* Compact Distance Readouts Footer */}
            <div className="hidden [@media(min-height:500px)]:flex flex-col gap-0.5 border-t border-slate-800 pt-0.5 mt-0.5 text-[8px] [@media(min-height:640px)]:text-[9px] font-mono-numbers leading-tight">
              {bountyTarget && distToBounty !== null && (
                <div className="flex items-center justify-between text-yellow-300 font-bold">
                  <span className="flex items-center gap-0.5 truncate max-w-[60px]">
                    <span>🏆</span>
                    <span className="truncate">{bountyTarget.label}</span>
                  </span>
                  <span>{distToBounty}m</span>
                </div>
              )}

              {activeObjective && distToObjective !== null && (
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-0.5">
                    <span>🎯</span>
                    <span>Goal</span>
                  </span>
                  <span>{distToObjective}m</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sky-300">
                <span className="flex items-center gap-0.5">
                  <span>🛰️</span>
                  <span>Base</span>
                </span>
                <span>{distToStation}m</span>
              </div>

              <div className="hidden [@media(min-height:660px)]:flex items-center justify-between text-cyan-300">
                <span className="flex items-center gap-0.5">
                  <span>🚗</span>
                  <span>Rover</span>
                </span>
                <span>{distToRover}m</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
