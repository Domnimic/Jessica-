import React, { useEffect, useRef, useState } from 'react';
import { DayNightData, WeatherData } from '../types/game';
import { sounds } from '../audio/SoundEffects';

interface PhotoModeModalProps {
  isOpen: boolean;
  rawDataUrl: string | null;
  playerPos: { x: number; z: number };
  activeCheckpointName: string;
  crystalsCount: number;
  dayNight: DayNightData;
  weather: WeatherData;
  isDrivingRover: boolean;
  onClose: () => void;
  onDownloadSuccess: (filename: string) => void;
}

export const PhotoModeModal: React.FC<PhotoModeModalProps> = ({
  isOpen,
  rawDataUrl,
  playerPos,
  activeCheckpointName,
  crystalsCount,
  dayNight,
  weather,
  isDrivingRover,
  onClose,
  onDownloadSuccess,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Composite the captured WebGL image + optional 'Mars Explorer' watermark overlay
  useEffect(() => {
    if (!isOpen || !rawDataUrl || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1280;
      const h = img.naturalHeight || 720;
      canvas.width = w;
      canvas.height = h;

      // 1. Draw pure 3D WebGL capture
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      if (!includeWatermark) return;

      // Scale typography cleanly across tablet / desktop / HiDPI captures
      const scale = Math.max(0.75, Math.min(w / 1280, 1.5));
      const pad = Math.round(28 * scale);
      const bracketLen = Math.round(32 * scale);

      // 2. Subtle Martian atmospheric vignette at top & bottom edges
      const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.16);
      topGrad.addColorStop(0, 'rgba(18, 7, 5, 0.58)');
      topGrad.addColorStop(1, 'rgba(18, 7, 5, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.16);

      const botGrad = ctx.createLinearGradient(0, h * 0.80, 0, h);
      botGrad.addColorStop(0, 'rgba(18, 7, 5, 0)');
      botGrad.addColorStop(1, 'rgba(18, 7, 5, 0.72)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, h * 0.80, w, h * 0.20);

      // 3. Viewfinder corner reticles (Mars amber & cyan)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.88)';
      ctx.lineWidth = Math.max(2, Math.round(3 * scale));

      // Top-left bracket
      ctx.beginPath();
      ctx.moveTo(pad, pad + bracketLen);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + bracketLen, pad);
      ctx.stroke();

      // Top-right bracket
      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + bracketLen);
      ctx.stroke();

      // Bottom-left bracket
      ctx.beginPath();
      ctx.moveTo(pad, h - pad - bracketLen);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad + bracketLen, h - pad);
      ctx.stroke();

      // Bottom-right bracket
      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad, h - pad - bracketLen);
      ctx.stroke();

      // 4. Top-Left 'MARS EXPLORER' Mission Header Pill
      const innerPad = pad + Math.round(14 * scale);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = Math.max(1.5, Math.round(2 * scale));
      const badgeW = Math.round(310 * scale);
      const badgeH = Math.round(58 * scale);
      ctx.beginPath();
      ctx.roundRect(innerPad, innerPad, badgeW, badgeH, Math.round(12 * scale));
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = `700 ${Math.round(22 * scale)}px "Fredoka", "Plus Jakarta Sans", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText('MARS EXPLORER', innerPad + Math.round(16 * scale), innerPad + Math.round(10 * scale));

      ctx.fillStyle = '#cbd5e1';
      ctx.font = `600 ${Math.round(12 * scale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(
        `MARS SURVIVAL · SOL ${dayNight.timeFormatted} (${dayNight.phase.toUpperCase()})`,
        innerPad + Math.round(16 * scale),
        innerPad + Math.round(36 * scale)
      );
      ctx.restore();

      // 5. Top-Right Atmospheric & Camera Tag
      ctx.save();
      const tagText = `${isDrivingRover ? 'ROVER MASTCAM' : 'EVA HELMET CAM'} · ${weather.name.toUpperCase()}`;
      ctx.font = `700 ${Math.round(13 * scale)}px "Plus Jakarta Sans", monospace`;
      const tagMetrics = ctx.measureText(tagText);
      const tagW = tagMetrics.width + Math.round(28 * scale);
      const tagH = Math.round(34 * scale);
      const tagX = w - innerPad - tagW;
      const tagY = innerPad;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = Math.max(1.5, Math.round(1.5 * scale));
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, Math.round(10 * scale));
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagX + Math.round(14 * scale), tagY + tagH / 2);
      ctx.restore();

      // 6. Bottom-Left Telemetry Strip
      ctx.save();
      const coordsText = `POS (${Math.round(playerPos.x)}m, ${Math.round(playerPos.z)}m)  |  SECTOR: ${activeCheckpointName.toUpperCase()}  |  CRYSTALS: ${crystalsCount}/10`;
      ctx.fillStyle = '#f8fafc';
      ctx.font = `600 ${Math.round(14 * scale)}px "Plus Jakarta Sans", monospace`;
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(6 * scale);
      ctx.fillText(coordsText, innerPad, h - innerPad);
      ctx.restore();

      // 7. Bottom-Right Official Martian Archive Stamp
      ctx.save();
      const stampTitle = 'MARS EXPLORER';
      const stampSub = 'ARES SURFACE ARCHIVE · PNG';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(6 * scale);

      ctx.fillStyle = '#fb923c';
      ctx.font = `800 ${Math.round(18 * scale)}px "Fredoka", "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(stampTitle, w - innerPad, h - innerPad - Math.round(18 * scale));

      ctx.fillStyle = '#94a3b8';
      ctx.font = `600 ${Math.round(11 * scale)}px "Plus Jakarta Sans", monospace`;
      ctx.fillText(stampSub, w - innerPad, h - innerPad);
      ctx.restore();
    };

    img.src = rawDataUrl;
  }, [
    isOpen,
    rawDataUrl,
    includeWatermark,
    playerPos,
    activeCheckpointName,
    crystalsCount,
    dayNight,
    weather,
    isDrivingRover,
  ]);

  if (!isOpen || !rawDataUrl) return null;

  const handleDownloadPng = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || isExporting) return;

    sounds.playClick();
    setIsExporting(true);

    const safeSol = dayNight.timeFormatted.replace(':', '');
    const suffix = includeWatermark ? 'watermarked' : 'clean';
    const filename = `mars-explorer-sol${safeSol}-${suffix}.png`;

    const triggerLinkDownload = (href: string, revokeUrl?: boolean) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (revokeUrl) {
        setTimeout(() => URL.revokeObjectURL(href), 1500);
      }
      setIsExporting(false);
      onDownloadSuccess(filename);
    };

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          triggerLinkDownload(url, true);
        } else {
          triggerLinkDownload(canvas.toDataURL('image/png'));
        }
      }, 'image/png');
    } else {
      triggerLinkDownload(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-6 select-none"
      data-interactive-ui="true"
    >
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-amber-500/70 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📸</span>
            <div>
              <h2 className="font-game font-bold text-base sm:text-lg text-amber-400 tracking-wide">
                MARS EXPLORER · PHOTO MODE
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Inspect your 3D capture and export as a high-resolution PNG
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Live WYSIWYG Canvas Preview */}
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <canvas
            ref={previewCanvasRef}
            className="max-w-full max-h-[58vh] w-auto h-auto rounded-2xl border border-slate-700/80 shadow-2xl object-contain"
          />
        </div>

        {/* Controls Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-slate-950 border-t border-slate-800">
          {/* Optional Watermark Overlay Toggle */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIncludeWatermark((prev) => !prev);
            }}
            className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition active:scale-98 ${
              includeWatermark
                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>🛰️</span>
              <span>'Mars Explorer' Watermark Overlay</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                includeWatermark
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {includeWatermark ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-game font-bold text-xs sm:text-sm transition active:scale-95"
            >
              🔄 Resume & Reframe
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPng}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-game font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/30 border border-amber-200 transition active:scale-95 disabled:opacity-60"
            >
              {isExporting ? 'Saving PNG...' : '⬇️ Download PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
