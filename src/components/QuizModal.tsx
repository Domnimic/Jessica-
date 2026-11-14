import React, { useState } from 'react';
import { MARS_QUIZ_QUESTIONS } from '../data/missionsAndQuiz';
import { sounds } from '../audio/SoundEffects';
import { voiceAssistant } from '../audio/VoiceAssistant';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizComplete: (score: number, passed: boolean) => void;
  onAnswerEvaluated?: (isCorrect: boolean) => void;
  onOpenLeaderboard?: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  onQuizComplete,
  onAnswerEvaluated,
  onOpenLeaderboard,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  if (!isOpen) return null;

  const currentQ = MARS_QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = MARS_QUIZ_QUESTIONS.length;
  const isPassed = score >= 70;

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
    setIsAnswerSubmitted(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 10);
    }
    sounds.playQuizResult(isCorrect);
    onAnswerEvaluated?.(isCorrect);
  };

  const handleNext = () => {
    sounds.playClick();
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizFinished(true);
      const finalPassed = score >= 70;
      sounds.playQuizComplete(finalPassed);
      window.setTimeout(() => sounds.playFinalScoreSting(finalPassed), 380);
      voiceAssistant.speakCue('quiz_complete', true);
      onQuizComplete(score, finalPassed);
    }
  };

  const handleRetry = () => {
    sounds.playClick();
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-none pointer-events-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-emerald-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 px-6 py-4 border-b border-emerald-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧪</span>
            <div>
              <h2 className="font-game font-bold text-lg sm:text-xl text-emerald-300">
                Mars Science Academy Quiz
              </h2>
              <p className="text-xs text-slate-300">
                Score 70+ points to complete Mission 5!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onOpenLeaderboard();
                }}
                className="px-2.5 py-1 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-400/70 text-amber-200 font-game font-bold text-xs flex items-center gap-1 transition"
              >
                <span>🏅</span>
                <span>Leaderboard</span>
              </button>
            )}
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!quizFinished ? (
            <div>
              {/* Progress & Current Score */}
              <div className="flex items-center justify-between mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-amber-400 font-mono-numbers text-sm">
                  Score: {score} pts
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <h3 className="font-game font-bold text-lg sm:text-xl text-slate-100 mb-6 leading-snug">
                {currentQ.question}
              </h3>

              {/* 4 Answer Options */}
              <div className="space-y-3 mb-6">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200';

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      btnStyle = 'bg-emerald-900/90 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500';
                    } else if (idx === selectedOption) {
                      btnStyle = 'bg-rose-900/90 border-rose-400 text-rose-100';
                    } else {
                      btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerSubmitted}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-4 rounded-2xl border text-left font-medium text-sm sm:text-base transition-all duration-150 flex items-center justify-between ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-black/30 flex items-center justify-center font-bold text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isAnswerSubmitted && idx === currentQ.correctIndex && (
                        <span className="text-lg text-emerald-400 font-bold">✓</span>
                      )}
                      {isAnswerSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && (
                        <span className="text-lg text-rose-400 font-bold">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Explanation */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border mb-6 animate-in fade-in duration-200 ${
                    selectedOption === currentQ.correctIndex
                      ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-600/70 text-rose-200'
                  }`}
                >
                  <div className="font-game font-bold text-sm mb-1">
                    {selectedOption === currentQ.correctIndex
                      ? '🎉 Correct! +10 Points'
                      : '💡 Not quite!'}
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed opacity-95">
                    {currentQ.explanation}
                  </div>
                </div>
              )}

              {/* Next Question Button */}
              {isAnswerSubmitted && (
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-base shadow-lg shadow-emerald-500/30 transition transform active:scale-98"
                >
                  {currentIndex + 1 < totalQuestions ? 'Next Question →' : 'See Final Results 🏆'}
                </button>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div className="text-center py-4">
              <div className="text-5xl mb-3">{isPassed ? '🏅' : '🚀'}</div>
              <h3 className="font-game font-bold text-2xl text-slate-100 mb-2">
                {isPassed ? 'Congratulations, Explorer!' : 'Nice Effort, Cadet!'}
              </h3>
              <p className="text-sm text-slate-300 max-w-sm mx-auto mb-6">
                {isPassed
                  ? 'You passed the Mars Science Academy with flying colors and unlocked the Mission 5 reward!'
                  : 'You need at least 70 points to pass. Review your facts and try again!'}
              </p>

              <div className="inline-flex items-center gap-4 bg-slate-800/80 px-6 py-3 rounded-2xl border border-slate-700 mb-8">
                <span className="text-slate-400 font-semibold text-sm">FINAL SCORE:</span>
                <span
                  className={`text-2xl font-bold font-mono-numbers ${
                    isPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {score} / 100
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-black/40">
                  {isPassed ? 'PASSED (70% Required)' : 'TRY AGAIN'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <button
                  onClick={handleRetry}
                  className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-game font-bold text-sm transition"
                >
                  🔄 Retry Quiz
                </button>
                {onOpenLeaderboard && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenLeaderboard();
                    }}
                    className="py-3 px-6 rounded-2xl bg-amber-950/90 hover:bg-amber-900 border border-amber-400/70 text-amber-200 font-game font-bold text-sm transition"
                  >
                    🏅 View Leaderboard
                  </button>
                )}
                {isPassed ? (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                    }}
                    className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-game font-bold text-base shadow-lg shadow-emerald-500/30 transition"
                  >
                    Claim Reward & Return to Mars 🚀
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                    }}
                    className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-game font-bold text-sm transition"
                  >
                    Back to Exploration
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
