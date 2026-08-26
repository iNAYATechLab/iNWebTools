import { useState } from 'react';

interface ScientificKeypadProps {
  onCalculate?: (expr: string) => void;
}

export function ScientificKeypad({ onCalculate }: ScientificKeypadProps) {
  const [display, setDisplay] = useState<string>('0');
  const [history, setHistory] = useState<string[]>([]);
  const [isRad, setIsRad] = useState<boolean>(true);

  const handlePress = (val: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(val);
    } else {
      setDisplay((prev) => prev + val);
    }
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleEvaluate = () => {
    try {
      let sanitized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/\^/g, '**');

      if (isRad) {
        sanitized = sanitized
          .replace(/sin\(([^)]+)\)/g, 'Math.sin($1)')
          .replace(/cos\(([^)]+)\)/g, 'Math.cos($1)')
          .replace(/tan\(([^)]+)\)/g, 'Math.tan($1)');
      } else {
        sanitized = sanitized
          .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1)*Math.PI/180)')
          .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1)*Math.PI/180)')
          .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1)*Math.PI/180)');
      }

      sanitized = sanitized
        .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
        .replace(/ln\(([^)]+)\)/g, 'Math.log($1)')
        .replace(/log\(([^)]+)\)/g, 'Math.log10($1)');

      // Evaluate math expression
      const result = Function(`'use strict'; return (${sanitized});`)();
      const formatted =
        typeof result === 'number' ? String(Number(result.toFixed(6))) : String(result);

      setHistory((prev) => [`${display} = ${formatted}`, ...prev.slice(0, 5)]);
      setDisplay(formatted);
      onCalculate?.(display);
    } catch {
      setDisplay('Error');
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
      {/* Display Screen */}
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 text-right shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <button
            type="button"
            onClick={() => setIsRad(!isRad)}
            className="rounded px-2 py-0.5 font-bold uppercase bg-white/5 text-brand-400 hover:bg-white/10"
          >
            {isRad ? 'RAD' : 'DEG'}
          </button>
          <span className="truncate max-w-[200px]">{history[0] || 'Scientific Engine'}</span>
        </div>
        <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-white overflow-x-auto">
          {display}
        </div>
      </div>

      {/* Keypad Buttons Grid */}
      <div className="grid grid-cols-5 gap-2 text-xs font-mono font-semibold">
        {/* Row 1 */}
        <button
          type="button"
          onClick={() => handlePress('sin(')}
          className="rounded-xl bg-slate-800 p-3 text-brand-300 hover:bg-slate-700"
        >
          sin
        </button>
        <button
          type="button"
          onClick={() => handlePress('cos(')}
          className="rounded-xl bg-slate-800 p-3 text-brand-300 hover:bg-slate-700"
        >
          cos
        </button>
        <button
          type="button"
          onClick={() => handlePress('tan(')}
          className="rounded-xl bg-slate-800 p-3 text-brand-300 hover:bg-slate-700"
        >
          tan
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl bg-rose-500/20 text-rose-300 p-3 hover:bg-rose-500/30 font-bold"
        >
          AC
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="rounded-xl bg-amber-500/20 text-amber-300 p-3 hover:bg-amber-500/30"
        >
          ⌫
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => handlePress('ln(')}
          className="rounded-xl bg-slate-800 p-3 text-purple-300 hover:bg-slate-700"
        >
          ln
        </button>
        <button
          type="button"
          onClick={() => handlePress('log(')}
          className="rounded-xl bg-slate-800 p-3 text-purple-300 hover:bg-slate-700"
        >
          log
        </button>
        <button
          type="button"
          onClick={() => handlePress('sqrt(')}
          className="rounded-xl bg-slate-800 p-3 text-purple-300 hover:bg-slate-700"
        >
          √
        </button>
        <button
          type="button"
          onClick={() => handlePress('(')}
          className="rounded-xl bg-slate-800 p-3 text-slate-300 hover:bg-slate-700"
        >
          (
        </button>
        <button
          type="button"
          onClick={() => handlePress(')')}
          className="rounded-xl bg-slate-800 p-3 text-slate-300 hover:bg-slate-700"
        >
          )
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => handlePress('π')}
          className="rounded-xl bg-slate-800 p-3 text-emerald-300 hover:bg-slate-700"
        >
          π
        </button>
        <button
          type="button"
          onClick={() => handlePress('7')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handlePress('8')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handlePress('9')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handlePress('÷')}
          className="rounded-xl bg-brand-500/20 text-brand-300 p-3 hover:bg-brand-500/30"
        >
          ÷
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={() => handlePress('^')}
          className="rounded-xl bg-slate-800 p-3 text-emerald-300 hover:bg-slate-700"
        >
          xʸ
        </button>
        <button
          type="button"
          onClick={() => handlePress('4')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handlePress('5')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handlePress('6')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handlePress('×')}
          className="rounded-xl bg-brand-500/20 text-brand-300 p-3 hover:bg-brand-500/30"
        >
          ×
        </button>

        {/* Row 5 */}
        <button
          type="button"
          onClick={() => handlePress('e')}
          className="rounded-xl bg-slate-800 p-3 text-emerald-300 hover:bg-slate-700"
        >
          e
        </button>
        <button
          type="button"
          onClick={() => handlePress('1')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handlePress('2')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handlePress('3')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handlePress('-')}
          className="rounded-xl bg-brand-500/20 text-brand-300 p-3 hover:bg-brand-500/30"
        >
          -
        </button>

        {/* Row 6 */}
        <button
          type="button"
          onClick={() => handlePress('0')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handlePress('.')}
          className="rounded-xl bg-slate-900 p-3 text-white hover:bg-slate-800"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handlePress('+')}
          className="rounded-xl bg-brand-500/20 text-brand-300 p-3 hover:bg-brand-500/30"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleEvaluate}
          className="col-span-2 rounded-xl bg-brand-500 p-3 font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400"
        >
          = Calculate
        </button>
      </div>
    </div>
  );
}
