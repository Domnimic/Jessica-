import { DailyBounty, DailyBountyBoardState } from '../types/game';

const STORAGE_KEY = 'mars_daily_bounties_v1';

interface BountyTemplate {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: DailyBounty['category'];
  targetCount: number;
  unitLabel: string;
  rewardScore: number;
  rewardBadge: string;
  targetLocation?: {
    x: number;
    z: number;
    radius: number;
    label: string;
  };
}

// Slot 1: Crystal & Specimen Collection Bounties
const HARVEST_POOL: BountyTemplate[] = [
  {
    key: 'harvest_5_crystals',
    title: 'Harvest 5 Energy Crystals',
    description: 'Survey Martian craters and valleys to collect 5 glowing mineral crystals today.',
    icon: '💎',
    category: 'collect_crystals',
    targetCount: 5,
    unitLabel: 'crystals',
    rewardScore: 400,
    rewardBadge: 'Crystal Prospector',
  },
  {
    key: 'harvest_3_crystals',
    title: 'Sample 3 Martian Minerals',
    description: 'Locate and harvest any 3 glowing mineral specimens across the Martian surface.',
    icon: '🔮',
    category: 'collect_crystals',
    targetCount: 3,
    unitLabel: 'crystals',
    rewardScore: 275,
    rewardBadge: 'Field Geologist',
  },
  {
    key: 'harvest_7_crystals',
    title: 'Deep Survey: 7 Crystals',
    description: 'Complete a high-yield mineral expedition by harvesting 7 Energy Crystals.',
    icon: '💠',
    category: 'collect_crystals',
    targetCount: 7,
    unitLabel: 'crystals',
    rewardScore: 600,
    rewardBadge: 'Master Prospector',
  },
];

// Slot 2: Crater Rim & Landmark Exploration Bounties
const LOCATION_POOL: BountyTemplate[] = [
  {
    key: 'reach_east_crater_rim',
    title: 'Reach the Eastern Crater Rim',
    description: 'Scale or glide to the golden beacon perched on the Eastern Crater Rim [45, -10].',
    icon: '🏔️',
    category: 'reach_location',
    targetCount: 1,
    unitLabel: 'beacon',
    rewardScore: 375,
    rewardBadge: 'Rim Pathfinder',
    targetLocation: { x: 45, z: -10, radius: 7.5, label: 'Eastern Crater Rim' },
  },
  {
    key: 'reach_west_megacrater_rim',
    title: 'Conquer Western Crater Rim',
    description: 'Traverse the dunes and reach the Western Megacrater Rim overlook [-46, 10].',
    icon: '🌋',
    category: 'reach_location',
    targetCount: 1,
    unitLabel: 'beacon',
    rewardScore: 450,
    rewardBadge: 'Canyon Scout',
    targetLocation: { x: -46, z: 10, radius: 7.5, label: 'Western Crater Rim' },
  },
  {
    key: 'reach_north_crater_rim',
    title: 'Reach Northern Crater Ridge',
    description: 'Navigate north across Martian ridges to reach the Polar Crater Rim [0, -49].',
    icon: '🧭',
    category: 'reach_location',
    targetCount: 1,
    unitLabel: 'beacon',
    rewardScore: 425,
    rewardBadge: 'Polar Ridge Runner',
    targetLocation: { x: 0, z: -49, radius: 7.5, label: 'Northern Crater Rim' },
  },
  {
    key: 'reach_south_basin_rim',
    title: 'Scout Southern Crater Rim',
    description: 'Journey southeast to inspect the rim above the Southern Basin Crater [70, 18].',
    icon: '🚩',
    category: 'reach_location',
    targetCount: 1,
    unitLabel: 'beacon',
    rewardScore: 475,
    rewardBadge: 'Horizon Pioneer',
    targetLocation: { x: 70, z: 18, radius: 7.5, label: 'Southern Crater Rim' },
  },
];

// Slot 3: Gliding, Rover & Mobility Bounties
const MOBILITY_POOL: BountyTemplate[] = [
  {
    key: 'glide_150m',
    title: 'Sky Soarer: Glide 150m',
    description: 'Unfurl your glider wings (G) and ride Martian wind currents for 150 meters.',
    icon: '🪽',
    category: 'glide_distance',
    targetCount: 150,
    unitLabel: 'm',
    rewardScore: 420,
    rewardBadge: 'Sky Nomad',
  },
  {
    key: 'rover_drive_140m',
    title: 'Rover Convoy: Drive 140m',
    description: 'Board the Curiosity Rover and drive 140 meters across craters and dunes.',
    icon: '🚗',
    category: 'drive_rover',
    targetCount: 140,
    unitLabel: 'm',
    rewardScore: 360,
    rewardBadge: 'Rover Ace',
  },
  {
    key: 'foot_patrol_220m',
    title: 'EVA Dune Strider: 220m',
    description: 'Explore Mars on foot in 38% gravity for 220 meters leaving boot prints behind.',
    icon: '🧑‍🚀',
    category: 'foot_distance',
    targetCount: 220,
    unitLabel: 'm',
    rewardScore: 320,
    rewardBadge: 'Dune Strider',
  },
];

export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSecondsUntilDailyReset(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export function formatResetCountdown(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function instantiateTemplate(t: BountyTemplate, dateKey: string): DailyBounty {
  return {
    id: `${dateKey}:${t.key}`,
    dateKey,
    title: t.title,
    description: t.description,
    icon: t.icon,
    category: t.category,
    targetCount: t.targetCount,
    currentCount: 0,
    unitLabel: t.unitLabel,
    completed: false,
    claimed: false,
    rewardScore: t.rewardScore,
    rewardBadge: t.rewardBadge,
    targetLocation: t.targetLocation ? { ...t.targetLocation } : undefined,
  };
}

export function generateDailyBountiesForDate(dateKey: string = getTodayDateKey()): DailyBountyBoardState {
  const seed = hashDateKey(dateKey);
  const b1 = HARVEST_POOL[seed % HARVEST_POOL.length];
  const b2 = LOCATION_POOL[(seed >>> 4) % LOCATION_POOL.length];
  const b3 = MOBILITY_POOL[(seed >>> 8) % MOBILITY_POOL.length];

  return {
    dateKey,
    bounties: [
      instantiateTemplate(b1, dateKey),
      instantiateTemplate(b2, dateKey),
      instantiateTemplate(b3, dateKey),
    ],
    grandBonusClaimed: false,
    grandBonusPoints: 500,
  };
}

export function loadDailyBountyBoard(): DailyBountyBoardState {
  const today = getTodayDateKey();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyBountyBoardState;
      if (parsed && parsed.dateKey === today && Array.isArray(parsed.bounties) && parsed.bounties.length === 3) {
        return parsed;
      }
    }
  } catch {}
  const fresh = generateDailyBountiesForDate(today);
  saveDailyBountyBoard(fresh);
  return fresh;
}

export function saveDailyBountyBoard(state: DailyBountyBoardState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}
