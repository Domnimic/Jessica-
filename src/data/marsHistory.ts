import { HistorianRankTier, HistoryTabletData } from '../types/game';

const HISTORY_STORAGE_KEY = 'mars_history_discovered_v1';

export const HISTORIAN_RANK_TIERS: HistorianRankTier[] = [
  {
    id: 'apprentice_archivist',
    title: 'Apprentice Archivist',
    requiredCount: 2,
    icon: '🥈',
    bonusXp: 150,
  },
  {
    id: 'senior_historian',
    title: 'Senior Mars Historian',
    requiredCount: 5,
    icon: '🥇',
    bonusXp: 300,
  },
  {
    id: 'grand_loremaster',
    title: 'Grand Ares Loremaster',
    requiredCount: 8,
    icon: '👑',
    bonusXp: 600,
  },
];

export const INITIAL_HISTORY_TABLETS: HistoryTabletData[] = [
  {
    id: 'noachian_shoreline',
    title: 'Shorelines of the Noachian Sea',
    era: 'Ancient Mars',
    yearLabel: '~4.0 Billion Years Ago',
    locationName: 'North-East Ancient Shoreline',
    regionHint: 'Dunes northeast of Landing Site Alpha',
    position: [12, 0, -22],
    loreText:
      'Long before red dust claimed this world, thick carbon-dioxide skies trapped solar warmth and fed rushing Martian rivers. Satellite altimetry reveals terraced deltas and sprawling northern coastlines where waves once lapped against dark volcanic basalt for millions of years.',
    historianBadge: 'Noachian Chronicler',
    badgeIcon: '🌊',
    xpReward: 100,
    color: '#2dd4bf',
    discovered: false,
  },
  {
    id: 'viking_plate',
    title: 'First Panoramic Signal from Chryse',
    era: 'First Landers',
    yearLabel: 'July 20, 1976',
    locationName: 'South-West Basalt Outcrop',
    regionHint: 'Rolling ridges southwest of Landing Site',
    position: [-24, 0, 36],
    loreText:
      'In summer 1976, Viking 1 touched down on Chryse Planitia and beamed back humanity’s first crisp surface photograph from Mars. Engineers cheered as rusty boulders and pink salmon skies appeared line by line—inaugurating a half-century of surface exploration.',
    historianBadge: 'Viking Archivist',
    badgeIcon: '📡',
    xpReward: 125,
    color: '#38bdf8',
    discovered: false,
  },
  {
    id: 'sojourner_track',
    title: 'The Microwave-Sized Trailblazer',
    era: 'Robotic Scouts',
    yearLabel: 'July 4, 1997',
    locationName: 'East Ridge Weathering Tablet',
    regionHint: 'East of Red Basin toward the sunlit dunes',
    position: [38, 0, 14],
    loreText:
      'Weighing barely 10.6 kilograms, Mars Pathfinder’s Sojourner rover rolled down a folding ramp onto dusty Ares Vallis boulders named "Barnacle Bill" and "Yogi." Over 83 sols it proved six-wheeled rocker-bogie suspension could conquer rugged extraterrestrial terrain.',
    historianBadge: 'Pathfinder Sage',
    badgeIcon: '🛞',
    xpReward: 125,
    color: '#f59e0b',
    discovered: false,
  },
  {
    id: 'opportunity_blueberries',
    title: 'Marathon of Eagle Crater',
    era: 'Robotic Scouts',
    yearLabel: '2004 – 2018',
    locationName: 'Hematite Flats Marker',
    regionHint: 'Mid-west plains between Base & Megacrater',
    position: [-54, 0, -14],
    loreText:
      'Built for a 90-sol mission, Opportunity rolled an extraordinary 45.16 kilometers across Meridiani Planum over nearly 15 Earth years. Its discovery of iron-rich hematite "blueberries" and jarosite sulfates sealed the case that liquid groundwater once soaked Martian rock.',
    historianBadge: 'Opportunity Keeper',
    badgeIcon: '🫐',
    xpReward: 150,
    color: '#a855f7',
    discovered: false,
  },
  {
    id: 'curiosity_gale',
    title: 'Sky Crane Over Gale Crater',
    era: 'Robotic Scouts',
    yearLabel: 'August 6, 2012',
    locationName: 'Eastern Crater Sandstone Slab',
    regionHint: 'Approach ridge south of Eastern Crater',
    position: [56, 0, -24],
    loreText:
      'Too heavy for bouncing airbags, Curiosity pioneered the supersonic Sky Crane hover maneuver to lower a nuclear-powered chemistry lab gently onto Bradbury Landing. Climbing Mount Sharp’s ancient mudstones, it confirmed Gale Crater once held habitable freshwater lakes.',
    historianBadge: 'Gale Stratigrapher',
    badgeIcon: '🤖',
    xpReward: 150,
    color: '#22d3ee',
    discovered: false,
  },
  {
    id: 'ingenuity_airfield',
    title: 'Wright Brothers Field on Another World',
    era: 'Robotic Scouts',
    yearLabel: 'April 19, 2021',
    locationName: 'Northern Flight Telemetry Pillar',
    regionHint: 'Northern plains heading toward Polar Crater',
    position: [-14, 0, -52],
    loreText:
      'Spun up to 2,537 RPM inside air thinner than Earth at 30 km altitude, the 1.8 kg Ingenuity Mars Helicopter lifted three meters above Jezero Crater—carrying a postage-stamp scrap of fabric from the 1903 Wright Flyer into Martian skies for 72 historic flights.',
    historianBadge: 'Sky Pioneer Historian',
    badgeIcon: '🚁',
    xpReward: 175,
    color: '#fbbf24',
    discovered: false,
  },
  {
    id: 'moxie_dawn',
    title: 'Alchemy of Martian Air (Project MOXIE)',
    era: 'Colony Era',
    yearLabel: '2021 – 2032',
    locationName: 'Western Megacrater Synthesis Relay',
    regionHint: 'Deep inside the Western Megacrater slopes',
    position: [-68, 0, 26],
    loreText:
      'Instead of hauling heavy liquid oxygen tanks across interplanetary space, early engineers scaled Perseverance’s MOXIE solid-oxide electrolyzer into industrial arrays—cracking 95% CO2 Martian air into breathable habitat O2 and clean liquid propellant for return rockets.',
    historianBadge: 'Ares Builder',
    badgeIcon: '⚡',
    xpReward: 175,
    color: '#34d399',
    discovered: false,
  },
  {
    id: 'ares_charter',
    title: 'Charter of the Last Explorer Outpost',
    era: 'Colony Era',
    yearLabel: 'Sol 1240 Expedition Archive',
    locationName: 'Southern Crater Horizon Monument',
    regionHint: 'High ridges southeast near Southern Crater',
    position: [68, 0, 62],
    loreText:
      'Laser-etched in corrosion-proof titanium, the Ares Outpost Charter binds every Martian explorer to preserve ancient astrobiological sites, share atmospheric shelter freely, and safeguard life-support domes as humanity transforms from fleeting visitors into stewards of a second homeworld.',
    historianBadge: 'Founding Chronicler',
    badgeIcon: '📜',
    xpReward: 250,
    color: '#f472b6',
    discovered: false,
  },
];

export function loadDiscoveredTabletIds(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
  } catch {}
  return [];
}

export function saveDiscoveredTabletIds(ids: string[]): void {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function getEarnedHistorianRank(discoveredCount: number): HistorianRankTier | null {
  let highest: HistorianRankTier | null = null;
  for (const tier of HISTORIAN_RANK_TIERS) {
    if (discoveredCount >= tier.requiredCount) {
      highest = tier;
    }
  }
  return highest;
}
