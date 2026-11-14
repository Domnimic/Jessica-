import {
  LeaderboardEntry,
  LeaderboardFilter,
  LocalLeaderboardProfile,
  SUIT_COLORS,
  SuitColor,
} from '../types/game';

const CAREER_PLAYER_ID_KEY = 'mars_career_player_id_v1';
const LOCAL_PROFILE_KEY = 'mars_leaderboard_profile_v1';
const LEADERBOARD_CACHE_KEY = 'mars_leaderboard_cache_v1';

export function getOrCreateCareerPlayerId(): string {
  try {
    const existing = window.localStorage.getItem(CAREER_PLAYER_ID_KEY);
    if (existing && existing.trim()) return existing.trim();
    const created = `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(CAREER_PLAYER_ID_KEY, created);
    return created;
  } catch {
    return `exp-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function createEmptyLocalProfile(name: string, suitColor: SuitColor): LocalLeaderboardProfile {
  return {
    playerId: getOrCreateCareerPlayerId(),
    name: name.trim().slice(0, 20) || 'Commander',
    suitColor,
    correctCount: 0,
    answeredCount: 0,
    bestStreak: 0,
    triviaCorrect: 0,
    triviaAnswered: 0,
    quizCorrect: 0,
    quizAnswered: 0,
    bestQuizScore: 0,
    xpEarned: 0,
    updatedAt: Date.now(),
    currentQuizStreak: 0,
    pendingSync: false,
  };
}

export function loadLocalLeaderboardProfile(
  fallbackName: string,
  fallbackSuit: SuitColor
): LocalLeaderboardProfile {
  const playerId = getOrCreateCareerPlayerId();
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return createEmptyLocalProfile(fallbackName, fallbackSuit);
    const parsed = JSON.parse(raw) as Partial<LocalLeaderboardProfile>;
    const validSuit = SUIT_COLORS.some((s) => s.id === parsed.suitColor)
      ? (parsed.suitColor as SuitColor)
      : fallbackSuit;

    const triviaCorrect = Math.max(0, Math.floor(Number(parsed.triviaCorrect) || 0));
    const triviaAnswered = Math.max(triviaCorrect, Math.floor(Number(parsed.triviaAnswered) || 0));
    const quizCorrect = Math.max(0, Math.floor(Number(parsed.quizCorrect) || 0));
    const quizAnswered = Math.max(quizCorrect, Math.floor(Number(parsed.quizAnswered) || 0));
    const correctCount = Math.max(
      triviaCorrect + quizCorrect,
      Math.floor(Number(parsed.correctCount) || 0)
    );
    const answeredCount = Math.max(
      correctCount,
      triviaAnswered + quizAnswered,
      Math.floor(Number(parsed.answeredCount) || 0)
    );

    return {
      playerId,
      name: (fallbackName || parsed.name || 'Commander').trim().slice(0, 20) || 'Commander',
      suitColor: validSuit,
      correctCount,
      answeredCount,
      bestStreak: Math.max(0, Math.floor(Number(parsed.bestStreak) || 0)),
      triviaCorrect,
      triviaAnswered,
      quizCorrect,
      quizAnswered,
      bestQuizScore: Math.min(100, Math.max(0, Math.floor(Number(parsed.bestQuizScore) || 0))),
      xpEarned: Math.max(0, Math.floor(Number(parsed.xpEarned) || 0)),
      updatedAt: Number(parsed.updatedAt) || Date.now(),
      currentQuizStreak: Math.max(0, Math.floor(Number(parsed.currentQuizStreak) || 0)),
      pendingSync: Boolean(parsed.pendingSync),
    };
  } catch {
    return createEmptyLocalProfile(fallbackName, fallbackSuit);
  }
}

export function saveLocalLeaderboardProfile(profile: LocalLeaderboardProfile): void {
  try {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordLeaderboardAnswer(
  profile: LocalLeaderboardProfile,
  source: 'trivia' | 'quiz',
  isCorrect: boolean,
  xpDelta: number = 0
): LocalLeaderboardProfile {
  const nextStreak = isCorrect ? profile.currentQuizStreak + 1 : 0;
  const triviaCorrect = profile.triviaCorrect + (source === 'trivia' && isCorrect ? 1 : 0);
  const triviaAnswered = profile.triviaAnswered + (source === 'trivia' ? 1 : 0);
  const quizCorrect = profile.quizCorrect + (source === 'quiz' && isCorrect ? 1 : 0);
  const quizAnswered = profile.quizAnswered + (source === 'quiz' ? 1 : 0);

  const next: LocalLeaderboardProfile = {
    ...profile,
    correctCount: triviaCorrect + quizCorrect,
    answeredCount: triviaAnswered + quizAnswered,
    bestStreak: Math.max(profile.bestStreak, nextStreak),
    triviaCorrect,
    triviaAnswered,
    quizCorrect,
    quizAnswered,
    xpEarned: profile.xpEarned + Math.max(0, Math.round(xpDelta)),
    currentQuizStreak: nextStreak,
    updatedAt: Date.now(),
    pendingSync: true,
  };
  saveLocalLeaderboardProfile(next);
  return next;
}

export function recordScienceQuizFinish(
  profile: LocalLeaderboardProfile,
  quizScore: number
): LocalLeaderboardProfile {
  const boundedScore = Math.min(100, Math.max(0, Math.round(quizScore)));
  const next: LocalLeaderboardProfile = {
    ...profile,
    bestQuizScore: Math.max(profile.bestQuizScore, boundedScore),
    updatedAt: Date.now(),
    pendingSync: true,
  };
  saveLocalLeaderboardProfile(next);
  return next;
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCachedLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    window.localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(entries.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

export function getMetricForFilter(
  entry: LeaderboardEntry,
  filter: LeaderboardFilter
): { correct: number; answered: number } {
  if (filter === 'trivia') {
    return { correct: entry.triviaCorrect, answered: entry.triviaAnswered };
  }
  if (filter === 'quiz') {
    return { correct: entry.quizCorrect, answered: entry.quizAnswered };
  }
  return { correct: entry.correctCount, answered: entry.answeredCount };
}

export function mergeAndSortLeaderboard(
  remoteEntries: LeaderboardEntry[],
  localProfile: LocalLeaderboardProfile,
  filter: LeaderboardFilter = 'all'
): LeaderboardEntry[] {
  const byId = new Map<string, LeaderboardEntry>();
  for (const item of remoteEntries) {
    byId.set(item.playerId, item);
  }

  const existingSelf = byId.get(localProfile.playerId);
  if (localProfile.answeredCount > 0 || existingSelf) {
    const triviaCorrect = Math.max(existingSelf?.triviaCorrect ?? 0, localProfile.triviaCorrect);
    const triviaAnswered = Math.max(existingSelf?.triviaAnswered ?? 0, localProfile.triviaAnswered, triviaCorrect);
    const quizCorrect = Math.max(existingSelf?.quizCorrect ?? 0, localProfile.quizCorrect);
    const quizAnswered = Math.max(existingSelf?.quizAnswered ?? 0, localProfile.quizAnswered, quizCorrect);
    const correctCount = Math.max(existingSelf?.correctCount ?? 0, localProfile.correctCount, triviaCorrect + quizCorrect);
    const answeredCount = Math.max(existingSelf?.answeredCount ?? 0, localProfile.answeredCount, correctCount, triviaAnswered + quizAnswered);

    byId.set(localProfile.playerId, {
      playerId: localProfile.playerId,
      name: localProfile.name,
      suitColor: localProfile.suitColor,
      correctCount,
      answeredCount,
      bestStreak: Math.max(existingSelf?.bestStreak ?? 0, localProfile.bestStreak),
      triviaCorrect,
      triviaAnswered,
      quizCorrect,
      quizAnswered,
      bestQuizScore: Math.max(existingSelf?.bestQuizScore ?? 0, localProfile.bestQuizScore),
      xpEarned: Math.max(existingSelf?.xpEarned ?? 0, localProfile.xpEarned),
      updatedAt: Math.max(existingSelf?.updatedAt ?? 0, localProfile.updatedAt),
    });
  }

  return Array.from(byId.values())
    .filter((entry) => {
      const m = getMetricForFilter(entry, filter);
      return m.answered > 0 || m.correct > 0;
    })
    .sort((a, b) => {
      const ma = getMetricForFilter(a, filter);
      const mb = getMetricForFilter(b, filter);
      if (mb.correct !== ma.correct) return mb.correct - ma.correct;
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      const accA = ma.answered > 0 ? ma.correct / ma.answered : 0;
      const accB = mb.answered > 0 ? mb.correct / mb.answered : 0;
      if (Math.abs(accB - accA) > 0.0001) return accB - accA;
      if (b.xpEarned !== a.xpEarned) return b.xpEarned - a.xpEarned;
      return a.updatedAt - b.updatedAt;
    });
}

export async function fetchRemoteLeaderboard(): Promise<LeaderboardEntry[] | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    const res = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { entries?: LeaderboardEntry[] };
    if (!Array.isArray(data.entries)) return null;
    saveCachedLeaderboard(data.entries);
    return data.entries;
  } catch {
    return null;
  }
}

export async function submitRemoteLeaderboardProfile(
  profile: LocalLeaderboardProfile
): Promise<{ entries: LeaderboardEntry[]; syncedEntry: LeaderboardEntry } | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: profile.playerId,
        name: profile.name,
        suitColor: profile.suitColor,
        correctCount: profile.correctCount,
        answeredCount: profile.answeredCount,
        bestStreak: profile.bestStreak,
        triviaCorrect: profile.triviaCorrect,
        triviaAnswered: profile.triviaAnswered,
        quizCorrect: profile.quizCorrect,
        quizAnswered: profile.quizAnswered,
        bestQuizScore: profile.bestQuizScore,
        xpEarned: profile.xpEarned,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      entry?: LeaderboardEntry;
      entries?: LeaderboardEntry[];
    };
    if (!Array.isArray(data.entries) || !data.entry) return null;
    saveCachedLeaderboard(data.entries);
    return { entries: data.entries, syncedEntry: data.entry };
  } catch {
    return null;
  }
}
