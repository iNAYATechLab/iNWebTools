import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useLocale } from '../hooks/useLocale';
import { formatTime } from '../utils/format';
import { PauseIcon, PlayIcon } from './icons';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/** Local playback preview — nothing is uploaded to hear the file. */
export function AudioPlayer({ file }: { file: File }) {
  const { t } = useLocale();
  const { audioProps, isPlaying, currentTime, duration, rate, setRate, toggle, seek } =
    useAudioPlayer(file);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="a2t-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{t.player.title}</h3>

        {/* Playback speed */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">{t.player.speed}</span>
          <div className="flex gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRate(value)}
                aria-pressed={rate === value}
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                  rate === value ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? t.player.pause : t.player.play}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 transition-transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? <PlayIconSwap playing /> : <PlayIconSwap />}
        </button>

        <div className="min-w-0 flex-1">
          {/* Native range keeps keyboard + screen-reader support for free. */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={t.player.seek}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-400 outline-none
              [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
            style={{
              background: `linear-gradient(to right, var(--color-brand-400) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
            }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* User-supplied audio: no caption track can exist, so none is rendered. */}
      <audio {...audioProps} className="hidden" />
    </div>
  );
}

/** Keeps the play/pause swap in one place. */
function PlayIconSwap({ playing = false }: { playing?: boolean }) {
  return playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />;
}
