import React, { useEffect, useState } from 'react';
import { TriviaQuestion, TriviaStats } from '../types/game';
import { TRIVIA_EXPEDITION_QUESTIONS } from '../data/triviaQuestions';
import { sounds } from '../audio/SoundEffects';

interface TriviaExpeditionModalProps {
  question: TriviaQuestion | null;
  stats: TriviaStats;
  onSubmitAnswer: (question: TriviaQuestion, isCorrect: boolean, bonusAwarded: number) => void;
  onContinue: () => void;
  onOpenLeaderboard?: () => void;
}

const CATEGORY_ICON: Record<TriviaQuestion['category'], string> = {
  Geology: '🪨',
  Atmosphere: '💨',
  Missions: '🛰️',
  'Moons & Orbit': '🌔',
  'Human Survival': '🧑‍🚀',
  'Astrobiology & Water': '🧬',
};

export const TriviaExpeditionModal: React.FC<TriviaExpeditionModalProps> = ({
  question,
  stats,
  onSubmitAnswer,
  onContinue,
  onOpenLeaderboard,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [awardedXp, setAwardedXp] = useState<number>(0);

  // Reset local selection whenever a new question encounter opens
  useEffect(() => {
    setSelectedIdx(null);
    setAwardedXp(0);
  }, [question?.id]);

  // Keyboard support: 1-4 / A-D to answer, Enter/Space to resume after answering
  useEffect(() => {
    if (!question) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if (selectedIdx === null) {
        const keyMap: Record<string, number> = {
          Digit1: 0,
          KeyA: 0,
          Digit2: 1,
          KeyB: 1,
          Digit3: 2,
          KeyC: 2,
          Digit4: 3,
          KeyD: 3,
        };
        const choice = keyMap[e.code];
        if (choice !== undefined && choice < question.options.length) {
          e.preventDefault();
          handleChoose(choice);
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sounds.playClick();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!question) return null;

  const isAnswered = selectedIdx !== null;
  const isCorrect = selectedIdx === question.correctIndex;
  const upcomingStreakBonus = stats.streak * 25;
  const potentialTotal = question.xpReward + upcomingStreakBonus;

  const handleChoose = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const correct = idx === question.correctIndex;
    const xp = correct ? question.xpReward + stats.streak * 25 : 0;
    setAwardedXp(xp);
    sounds.playQuizResult(correct);
    onSubmitAnswer(question, correct, xp);
  };

  return (
    <div
      data-interactive-ui="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none"
    >
      <div className="w-full max-w-xl bg-slate-950 border-2 border-cyan-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/90 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-2xl">
              {CATEGORY_ICON[question.category]}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                FIELD DISCOVERY · {question.category}
              </div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-white leading-tight">
                Trivia Expedition Scan
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stats.streak > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-amber-950/90 border border-amber-400/70 text-amber-300 text-xs font-bold font-mono-numbers">
                🔥 {stats.streak} Streak
              </div>
            )}
            <div className="px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-400/70 text-emerald-300 text-xs font-extrabold font-mono-numbers">
              +{potentialTotal} XP
            </div>
          </div>
        </div>

        {/* Question Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <h3 className="font-game font-bold text-lg sm:text-xl text-slate-100 mb-5 leading-snug">
            {question.question}
          </h3>

          <div className="space-y-2.5 mb-5">
            {question.options.map((option, idx) => {
              let optionClass =
                'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200';
              if (isAnswered) {
                if (idx === question.correctIndex) {
                  optionClass =
                    'bg-emerald-950/90 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500/70';
                } else if (idx === selectedIdx) {
                  optionClass = 'bg-rose-950/90 border-rose-500 text-rose-100';
                } else {
                  optionClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleChoose(idx)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left text-sm sm:text-base font-medium transition flex items-center justify-between gap-3 ${optionClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isAnswered && idx === question.correctIndex && (
                    <span className="text-emerald-400 font-bold text-lg">✓</span>
                  )}
                  {isAnswered && idx === selectedIdx && idx !== question.correctIndex && (
                    <span className="text-rose-400 font-bold text-lg">✗</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Scientific Explanation */}
          {isAnswered && (
            <div
              className={`p-4 rounded-2xl border mb-4 ${
                isCorrect
                  ? 'bg-emerald-950/55 border-emerald-500/80 text-emerald-100'
                  : 'bg-rose-950/55 border-rose-500/80 text-rose-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-game font-bold text-sm sm:text-base">
                  {isCorrect
                    ? `🎉 Correct! +${awardedXp} Bonus XP Added`
                    : '📡 Sensor Calibration Note'}
                </span>
                {isCorrect && stats.streak > 1 && (
                  <span className="text-[11px] font-bold text-amber-300 font-mono-numbers">
                    Includes +{(stats.streak - 1) * 25} Streak Bonus!
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono-numbers text-slate-400 flex flex-wrap items-center gap-3">
            <span>
              Accuracy: <strong className="text-cyan-300">{stats.correctCount}/{stats.answeredCount}</strong>
            </span>
            <span>
              Best Streak: <strong className="text-amber-300">{stats.bestStreak}</strong>
            </span>
            <span>
              Bank: <strong className="text-slate-200">{TRIVIA_EXPEDITION_QUESTIONS.length} Qs</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onOpenLeaderboard();
                }}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-950/90 hover:bg-amber-900 border border-amber-400/70 text-amber-200 font-game font-bold text-xs sm:text-sm transition active:scale-95"
              >
                🏅 Leaderboard
              </button>
            )}

            {isAnswered ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  onContinue();
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-game font-bold text-sm shadow-lg transition active:scale-95"
              >
                Continue Exploring Mars →
              </button>
            ) : (
              <div className="text-xs text-slate-400">
                Select A–D (or keys 1–4) to log field data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
