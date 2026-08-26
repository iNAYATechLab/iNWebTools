import { useState } from 'react';

interface MatrixWorkbenchProps {
  onMatrixCalculate?: (matrixA: number[][], op: string) => void;
}

export function MatrixWorkbench({ onMatrixCalculate }: MatrixWorkbenchProps) {
  const [size, setSize] = useState<2 | 3>(2);
  const [matrixA, setMatrixA] = useState<number[][]>([
    [1, 2],
    [3, 4],
  ]);
  const [matrixB, setMatrixB] = useState<number[][]>([
    [2, 0],
    [1, 2],
  ]);
  const [operation, setOperation] = useState<string>('determinant');

  const handleSizeToggle = (newSize: 2 | 3) => {
    setSize(newSize);
    if (newSize === 2) {
      setMatrixA([
        [1, 2],
        [3, 4],
      ]);
      setMatrixB([
        [2, 0],
        [1, 2],
      ]);
    } else {
      setMatrixA([
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ]);
      setMatrixB([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
    }
  };

  const handleCellChange = (matrix: 'A' | 'B', row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    if (matrix === 'A') {
      const copy = matrixA.map((r, ri) => r.map((c, ci) => (ri === row && ci === col ? num : c)));
      setMatrixA(copy);
    } else {
      const copy = matrixB.map((r, ri) => r.map((c, ci) => (ri === row && ci === col ? num : c)));
      setMatrixB(copy);
    }
  };

  // Compute live determinant for display
  const computeDet2x2 = (m: number[][]) => {
    const a = m[0]?.[0] ?? 0;
    const b = m[0]?.[1] ?? 0;
    const c = m[1]?.[0] ?? 0;
    const d = m[1]?.[1] ?? 0;
    return a * d - b * c;
  };

  const computeDet3x3 = (m: number[][]) => {
    const a = m[0]?.[0] ?? 0;
    const b = m[0]?.[1] ?? 0;
    const c = m[0]?.[2] ?? 0;
    const d = m[1]?.[0] ?? 0;
    const e = m[1]?.[1] ?? 0;
    const f = m[1]?.[2] ?? 0;
    const g = m[2]?.[0] ?? 0;
    const h = m[2]?.[1] ?? 0;
    const i = m[2]?.[2] ?? 0;
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  };

  const detA = size === 2 ? computeDet2x2(matrixA) : computeDet3x3(matrixA);

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Matrix Dimension:
          </span>
          <div className="flex rounded-lg border border-white/10 bg-slate-950 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleSizeToggle(2)}
              className={`rounded px-2.5 py-1 ${size === 2 ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
            >
              2 × 2
            </button>
            <button
              type="button"
              onClick={() => handleSizeToggle(3)}
              className={`rounded px-2.5 py-1 ${size === 3 ? 'bg-brand-500 text-white' : 'text-slate-400'}`}
            >
              3 × 3
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
          >
            <option value="determinant">Determinant (det A)</option>
            <option value="inverse">Inverse Matrix (A⁻¹)</option>
            <option value="transpose">Transpose (Aᵀ)</option>
            <option value="multiply">Multiply (A × B)</option>
            <option value="add">Addition (A + B)</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Matrix A */}
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase text-brand-400 font-mono">
              Matrix A ({size}×{size})
            </h4>
            <span className="font-mono text-xs text-slate-400">det(A) = {detA}</span>
          </div>

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {matrixA.map((row, r) =>
              row.map((val, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  value={val}
                  onChange={(e) => handleCellChange('A', r, c, e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900 p-3 text-center font-mono text-sm font-bold text-white focus:border-brand-500 focus:outline-none"
                />
              )),
            )}
          </div>
        </div>

        {/* Matrix B (Shown if binary operation) */}
        {['multiply', 'add'].includes(operation) && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <h4 className="text-xs font-bold uppercase text-purple-400 font-mono">
              Matrix B ({size}×{size})
            </h4>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              }}
            >
              {matrixB.map((row, r) =>
                row.map((val, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    value={val}
                    onChange={(e) => handleCellChange('B', r, c, e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 p-3 text-center font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                  />
                )),
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onMatrixCalculate?.(matrixA, operation)}
        className="w-full rounded-2xl bg-brand-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-colors"
      >
        Compute Matrix Algebra
      </button>
    </div>
  );
}
