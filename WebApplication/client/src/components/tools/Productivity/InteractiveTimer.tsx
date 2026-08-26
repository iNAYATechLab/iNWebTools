import { useEffect, useState } from 'react';

interface InteractiveTimerProps {
  initialMode?: 'pomodoro' | 'countdown' | 'stopwatch';
}

export function InteractiveTimer({ initialMode = 'pomodoro' }: InteractiveTimerProps) {
  const [mode, setMode] = useState<'pomodoro' | 'shortBreak' | 'longBreak' | 'stopwatch'>(
    initialMode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
  );

  // Time in seconds
  const [timeLeft, setTimeLeft] = useState<number>(initialMode === 'stopwatch' ? 0 : 25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [laps, setLaps] = useState<string[]>([]);

  // Configure durations (in seconds)
  const durations = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    stopwatch: 0,
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined = undefined;

    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          setTimeLeft((prev) => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setIsRunning(false);
              if (mode === 'pomodoro') {
                setCompletedSessions((s) => s + 1);
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const switchMode = (newMode: 'pomodoro' | 'shortBreak' | 'longBreak' | 'stopwatch') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
    setLaps([]);
  };

  const handleRecordLap = () => {
    const mins = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    setLaps((prev) => [`Lap ${prev.length + 1}: ${mins}:${secs}`, ...prev]);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const totalTimeForMode = mode === 'stopwatch' ? 100 : durations[mode];
  const progressPercent =
    mode === 'stopwatch'
      ? Math.min(100, (timeLeft % 60) * 1.66)
      : Math.round(((totalTimeForMode - timeLeft) / Math.max(totalTimeForMode, 1)) * 100);

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => switchMode('pomodoro')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            mode === 'pomodoro'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              : 'border border-white/10 bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          🎯 Focus (25m)
        </button>
        <button
          type="button"
          onClick={() => switchMode('shortBreak')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            mode === 'shortBreak'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
              : 'border border-white/10 bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          ☕ Short Break (5m)
        </button>
        <button
          type="button"
          onClick={() => switchMode('longBreak')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            mode === 'longBreak'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'border border-white/10 bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          🌴 Long Break (15m)
        </button>
        <button
          type="button"
          onClick={() => switchMode('stopwatch')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            mode === 'stopwatch'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              : 'border border-white/10 bg-slate-950 text-slate-400 hover:text-white'
          }`}
        >
          ⏱️ Stopwatch
        </button>
      </div>

      {/* Main Circular Display */}
      <div className="relative mx-auto flex h-60 w-60 items-center justify-center rounded-full border-4 border-white/5 bg-slate-950 shadow-inner">
        <div
          className="absolute inset-0 rounded-full opacity-20 transition-all"
          style={{
            background: `conic-gradient(var(--tw-gradient-stops, #3b82f6) ${progressPercent}%, transparent 0)`,
          }}
        />
        <div className="relative space-y-1">
          <div className="font-mono text-5xl font-black tracking-tight text-white sm:text-6xl">
            {formatTime(timeLeft)}
          </div>
          <span className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
            {mode === 'stopwatch' ? 'Elapsed Time' : isRunning ? 'Interval in Progress' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className={`rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20'
              : 'bg-brand-500 hover:bg-brand-400 shadow-brand-500/25'
          }`}
        >
          {isRunning ? '⏸ Pause' : '▶ Start Focus'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          title="Reset timer"
        >
          ↺ Reset
        </button>
        {mode === 'stopwatch' && isRunning && (
          <button
            type="button"
            onClick={handleRecordLap}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            🏁 Lap
          </button>
        )}
      </div>

      {/* Sessions / Laps Telemetry */}
      {mode !== 'stopwatch' ? (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Completed Pomodoros:</span>
          <span className="font-mono font-bold text-rose-400">
            {'🍅 '.repeat(Math.min(completedSessions, 8))} ({completedSessions})
          </span>
        </div>
      ) : (
        laps.length > 0 && (
          <div className="max-h-36 overflow-auto divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-950 p-2 font-mono text-xs text-slate-300">
            {laps.map((lap, i) => (
              <div key={i} className="py-1">
                {lap}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
