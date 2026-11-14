import React, { useMemo, useState } from 'react';
import {
  AutoPilotCategory,
  AutoPilotState,
  AutoPilotWaypoint,
  CheckpointData,
  HiddenAreaData,
  SatelliteRelayData,
} from '../types/game';
import { sounds } from '../audio/SoundEffects';

interface RoverAutoPilotModalProps {
  isOpen: boolean;
  autopilot: AutoPilotState;
  roverPos: { x: number; z: number };
  spaceStationPos: { x: number; z: number };
  activeObjective: { x: number; z: number; title: string } | null;
  bountyTarget: { x: number; z: number; label: string } | null;
  checkpoints: CheckpointData[];
  crystals: { id: number; x: number; z: number; collected: boolean }[];
  hiddenAreas: HiddenAreaData[];
  satelliteRelays: SatelliteRelayData[];
  roverSpeedMultiplier: number;
  onStartAutoPilot: (waypoint: AutoPilotWaypoint) => void;
  onCancelAutoPilot: () => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'priority' | 'landmarks' | 'relays_caves' | 'crystals';

const MAP_VIEW_SIZE = 280;
const WORLD_SPAN = 115; // +/-115m radius mapped cleanly inside 280x280 SVG

export const RoverAutoPilotModal: React.FC<RoverAutoPilotModalProps> = ({
  isOpen,
  autopilot,
  roverPos,
  spaceStationPos,
  activeObjective,
  bountyTarget,
  checkpoints,
  crystals,
  hiddenAreas,
  satelliteRelays,
  roverSpeedMultiplier,
  onStartAutoPilot,
  onCancelAutoPilot,
  onClose,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(autopilot.target?.id ?? null);

  const waypoints = useMemo<AutoPilotWaypoint[]>(() => {
    const list: AutoPilotWaypoint[] = [];

    if (activeObjective) {
      list.push({
        id: 'wp_active_objective',
        title: activeObjective.title,
        category: 'objective',
        x: activeObjective.x,
        z: activeObjective.z,
        icon: '🎯',
        subtitle: 'Active Mission Objective',
      });
    }

    if (bountyTarget) {
      list.push({
        id: 'wp_bounty_target',
        title: bountyTarget.label,
        category: 'objective',
        x: bountyTarget.x,
        z: bountyTarget.z,
        icon: '🏆',
        subtitle: 'Daily Bounty Beacon',
      });
    }

    list.push({
      id: 'wp_research_base',
      title: 'Mars Research Base (O2 & Lab)',
      category: 'landmark',
      x: spaceStationPos.x,
      z: spaceStationPos.z,
      icon: '🛰️',
      subtitle: 'Main Dome, Oxygen Station & Rest Bay',
    });

    list.push({
      id: 'wp_underground_lift',
      title: 'Underground Base Lift Hatch',
      category: 'landmark',
      x: -26,
      z: -32,
      icon: '🛗',
      subtitle: 'Surface Entry to -28m Science Facility',
    });

    list.push({
      id: 'wp_comm_tower',
      title: 'Deep Space Comm Tower',
      category: 'landmark',
      x: -44,
      z: -48,
      icon: '📡',
      subtitle: 'Earth Uplink Antenna',
    });

    list.push({
      id: 'wp_ares_lander',
      title: 'Ares Landing Pod (Origin)',
      category: 'landmark',
      x: 0,
      z: 0,
      icon: '🚀',
      subtitle: 'Touchdown Coordinate (0, 0)',
    });

    satelliteRelays.forEach((r) => {
      list.push({
        id: `wp_rel_${r.id}`,
        title: r.name,
        category: 'satellite',
        x: r.position[0],
        z: r.position[2],
        icon: '🛰️',
        subtitle: r.aligned ? 'Relay Aligned (100%)' : 'Needs Signal Alignment',
      });
    });

    hiddenAreas.forEach((area) => {
      list.push({
        id: `wp_area_${area.id}`,
        title: area.name,
        category: 'hidden_area',
        x: area.position[0],
        z: area.position[2],
        icon: area.category === 'cave' ? '🕳️' : '🧪',
        subtitle: area.discovered ? 'Explored Region' : 'Uncharted Cavern / Secret Lab',
      });
    });

    checkpoints.forEach((cp) => {
      list.push({
        id: `wp_cp_${cp.id}`,
        title: cp.name,
        category: 'checkpoint',
        x: cp.position[0],
        z: cp.position[2],
        icon: '🚩',
        subtitle: cp.activated ? 'Checkpoint Activated' : 'Unvisited Beacon',
      });
    });

    crystals
      .filter((c) => !c.collected)
      .forEach((c) => {
        list.push({
          id: `wp_cry_${c.id}`,
          title: `Energy Crystal #${c.id}`,
          category: 'crystal',
          x: c.x,
          z: c.z,
          icon: '💎',
          subtitle: 'Uncollected Mineral Specimen',
        });
      });

    return list;
  }, [
    activeObjective,
    bountyTarget,
    spaceStationPos.x,
    spaceStationPos.z,
    satelliteRelays,
    hiddenAreas,
    checkpoints,
    crystals,
  ]);

  const filteredWaypoints = useMemo(() => {
    return waypoints.filter((w) => {
      if (filterTab === 'all') return true;
      if (filterTab === 'priority') return w.category === 'objective' || w.category === 'landmark';
      if (filterTab === 'landmarks')
        return w.category === 'landmark' || w.category === 'checkpoint';
      if (filterTab === 'relays_caves')
        return w.category === 'satellite' || w.category === 'hidden_area';
      if (filterTab === 'crystals') return w.category === 'crystal';
      return true;
    });
  }, [waypoints, filterTab]);

  if (!isOpen) return null;

  const selectedWaypoint =
    waypoints.find((w) => w.id === selectedId) ||
    autopilot.target ||
    filteredWaypoints[0] ||
    waypoints[0];

  const estSpeedMps = Math.max(2.5, 6.4 * roverSpeedMultiplier);
  const distFor = (w: AutoPilotWaypoint) =>
    Math.round(Math.hypot(w.x - roverPos.x, w.z - roverPos.z));
  const etaFor = (dist: number) => Math.max(1, Math.round(dist / estSpeedMps));

  const worldToSvg = (wx: number, wz: number) => {
    const pad = 16;
    const usable = MAP_VIEW_SIZE - pad * 2;
    const nx = (wx + WORLD_SPAN) / (WORLD_SPAN * 2);
    const nz = (wz + WORLD_SPAN) / (WORLD_SPAN * 2);
    return {
      cx: pad + Math.max(0, Math.min(1, nx)) * usable,
      cy: pad + Math.max(0, Math.min(1, nz)) * usable,
    };
  };

  const roverSvg = worldToSvg(roverPos.x, roverPos.z);
  const selectedSvg = selectedWaypoint
    ? worldToSvg(selectedWaypoint.x, selectedWaypoint.z)
    : null;
  const selectedDist = selectedWaypoint ? distFor(selectedWaypoint) : 0;

  const getPinColor = (cat: AutoPilotCategory, isSel: boolean) => {
    if (isSel) return '#22d3ee';
    switch (cat) {
      case 'objective':
        return '#f59e0b';
      case 'landmark':
        return '#38bdf8';
      case 'satellite':
        return '#fb923c';
      case 'hidden_area':
        return '#a855f7';
      case 'checkpoint':
        return '#22c55e';
      case 'crystal':
        return '#e879f9';
    }
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 pointer-events-auto select-none"
    >
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-cyan-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950 border border-cyan-400/70 flex items-center justify-center text-2xl">
              🧭
            </div>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-2xl text-cyan-200">
                Rover Auto-Pilot Navigation Map
              </h2>
              <p className="text-xs text-slate-400">
                Tap any landmark on the map or list — Rover steers automatically around rocks and structures
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold touch-manipulation"
            aria-label="Close Auto-Pilot Map"
          >
            ✕
          </button>
        </div>

        {/* Active Auto-Pilot Telemetry Ribbon */}
        {autopilot.active && autopilot.target && (
          <div className="mb-4 bg-cyan-950/75 border border-cyan-400/70 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-cyan-100">
              <span className="font-bold text-cyan-300">ACTIVE ROUTE:</span>{' '}
              <span className="font-game font-bold">{autopilot.target.title}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="font-mono-numbers font-bold text-white">
                {autopilot.distanceMeters} m ({autopilot.etaSeconds} s)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onCancelAutoPilot();
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-game font-bold touch-manipulation"
            >
              Cancel Auto-Pilot
            </button>
          </div>
        )}

        {/* Two-Column Interactive Map + Selectable Destination Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left: Interactive Full-Sector Tactical SVG Map */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono-numbers">
              <span>SECTOR GRID (±115 m)</span>
              <span>ROVER: ({Math.round(roverPos.x)}, {Math.round(roverPos.z)})</span>
            </div>

            <svg
              viewBox={`0 0 ${MAP_VIEW_SIZE} ${MAP_VIEW_SIZE}`}
              className="w-full max-w-[280px] aspect-square rounded-2xl bg-[#160a07] border border-amber-700/40 cursor-crosshair"
              role="img"
              aria-label="Interactive Mars Auto-Pilot Waypoint Map"
            >
              {/* Grid Rings */}
              <circle
                cx={MAP_VIEW_SIZE / 2}
                cy={MAP_VIEW_SIZE / 2}
                r={52}
                fill="none"
                stroke="rgba(245,158,11,0.14)"
                strokeDasharray="3 3"
              />
              <circle
                cx={MAP_VIEW_SIZE / 2}
                cy={MAP_VIEW_SIZE / 2}
                r={104}
                fill="none"
                stroke="rgba(245,158,11,0.18)"
                strokeDasharray="3 3"
              />
              <line
                x1={MAP_VIEW_SIZE / 2}
                y1="10"
                x2={MAP_VIEW_SIZE / 2}
                y2={MAP_VIEW_SIZE - 10}
                stroke="rgba(245,158,11,0.12)"
              />
              <line
                x1="10"
                y1={MAP_VIEW_SIZE / 2}
                x2={MAP_VIEW_SIZE - 10}
                y2={MAP_VIEW_SIZE / 2}
                stroke="rgba(245,158,11,0.12)"
              />

              {/* Cardinal Labels */}
              <text x={MAP_VIEW_SIZE / 2} y="12" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f59e0b">
                N
              </text>
              <text x={MAP_VIEW_SIZE - 7} y={MAP_VIEW_SIZE / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94a3b8">
                E
              </text>
              <text x={MAP_VIEW_SIZE / 2} y={MAP_VIEW_SIZE - 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94a3b8">
                S
              </text>
              <text x="8" y={MAP_VIEW_SIZE / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94a3b8">
                W
              </text>

              {/* Dashed Auto-Pilot Vector Line from Rover to Selected Waypoint */}
              {selectedSvg && (
                <line
                  x1={roverSvg.cx}
                  y1={roverSvg.cy}
                  x2={selectedSvg.cx}
                  y2={selectedSvg.cy}
                  stroke="#22d3ee"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  opacity="0.85"
                />
              )}

              {/* All Clickable Waypoint Pins */}
              {filteredWaypoints.map((wp) => {
                const { cx, cy } = worldToSvg(wp.x, wp.z);
                const isSelected = selectedWaypoint?.id === wp.id;
                const fill = getPinColor(wp.category, isSelected);
                return (
                  <g
                    key={wp.id}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedId(wp.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="10.5"
                        fill="rgba(34,211,238,0.22)"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? '5.5' : wp.category === 'crystal' ? '3.5' : '4.5'}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? '1.5' : '0.9'}
                    />
                    <title>{wp.title}</title>
                  </g>
                );
              })}

              {/* Rover Current Position */}
              <g transform={`translate(${roverSvg.cx}, ${roverSvg.cy})`}>
                <circle r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.8" />
                <text
                  x="0"
                  y="-9"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#67e8f9"
                >
                  ROVER
                </text>
              </g>
            </svg>

            {/* Selected Target Footer */}
            {selectedWaypoint && (
              <div className="w-full mt-2.5 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 font-bold text-white">
                  <span className="truncate">
                    {selectedWaypoint.icon} {selectedWaypoint.title}
                  </span>
                  <span className="font-mono-numbers text-cyan-300 shrink-0">
                    {selectedDist} m
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                  <span className="truncate">{selectedWaypoint.subtitle || 'Mars Surface Coordinate'}</span>
                  <span className="font-mono-numbers shrink-0 ml-2">
                    ETA ~{etaFor(selectedDist)} s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Filterable Landmark List */}
          <div className="flex flex-col min-h-[260px] max-h-[360px]">
            <div className="flex flex-wrap gap-1 mb-2">
              {(
                [
                  ['all', 'All'],
                  ['priority', 'Missions & Base'],
                  ['relays_caves', 'Relays & Caves'],
                  ['crystals', 'Crystals'],
                ] as [FilterTab, string][]
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setFilterTab(tabId);
                  }}
                  className={`min-h-[36px] px-2.5 py-1 rounded-xl text-[11px] font-game font-bold transition touch-manipulation ${
                    filterTab === tabId
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredWaypoints.map((wp) => {
                const dist = distFor(wp);
                const selected = selectedWaypoint?.id === wp.id;
                const isRunningTarget = autopilot.active && autopilot.target?.id === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSelectedId(wp.id);
                    }}
                    className={`w-full min-h-[46px] p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 touch-manipulation ${
                      selected
                        ? 'bg-cyan-950/90 border-cyan-400 text-white'
                        : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{wp.icon}</span>
                      <div className="min-w-0">
                        <div className="font-game font-bold text-xs truncate">
                          {wp.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {isRunningTarget ? 'ACTIVE AUTO-PILOT TARGET' : wp.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono-numbers">
                      <div className="text-xs font-bold text-cyan-300">{dist} m</div>
                      <div className="text-[10px] text-slate-500">~{etaFor(dist)} s</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {selectedWaypoint && (
            <button
              type="button"
              onClick={() => {
                onStartAutoPilot(selectedWaypoint);
                onClose();
              }}
              className="flex-1 min-h-[46px] px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-game font-bold text-sm sm:text-base shadow-lg transition active:scale-[0.98] touch-manipulation"
            >
              🧭 Engage Auto-Pilot to {selectedWaypoint.title} ({selectedDist} m)
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="min-h-[46px] px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-game font-bold text-sm transition touch-manipulation"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
