import { useEffect, useState } from 'react';

interface Task {
  id: string;
  title: string;
  tag?: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const DEFAULT_BOARD: Column[] = [
  {
    id: 'todo',
    title: '📌 To Do',
    tasks: [
      { id: '1', title: 'Audit website performance & SEO metrics', tag: 'High' },
      { id: '2', title: 'Test client-side audio transcription', tag: 'Core' },
    ],
  },
  {
    id: 'in-progress',
    title: '⚡ In Progress',
    tasks: [{ id: '3', title: 'Build modern Phase 8 AI tools & Kanban', tag: 'Phase 8' }],
  },
  {
    id: 'done',
    title: '✅ Completed',
    tasks: [
      { id: '4', title: 'Phase 7 CSS & Color engine launch', tag: 'Shipped' },
      { id: '5', title: 'Phase 6 SEO & Webmaster utilities release', tag: 'Shipped' },
    ],
  },
];

export function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const saved = localStorage.getItem('inwebtools_kanban_state');
      return saved ? JSON.parse(saved) : DEFAULT_BOARD;
    } catch {
      return DEFAULT_BOARD;
    }
  });

  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [selectedCol, setSelectedCol] = useState<string>('todo');

  useEffect(() => {
    try {
      localStorage.setItem('inwebtools_kanban_state', JSON.stringify(columns));
    } catch {
      // ignore
    }
  }, [columns]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      tag: 'Task',
    };

    setColumns((prev) =>
      prev.map((col) =>
        col.id === selectedCol ? { ...col, tasks: [newTask, ...col.tasks] } : col,
      ),
    );
    setNewTaskTitle('');
  };

  const handleDeleteTask = (colId: string, taskId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === colId ? { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) } : col,
      ),
    );
  };

  const handleMoveTask = (fromColId: string, toColId: string, task: Task) => {
    if (fromColId === toColId) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === fromColId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
        }
        if (col.id === toColId) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Task Form */}
      <form
        onSubmit={handleAddTask}
        className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md"
      >
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Enter new task or milestone..."
          className="flex-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
        />
        <select
          value={selectedCol}
          onChange={(e) => setSelectedCol(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-full sm:w-auto rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-colors"
        >
          + Add Task
        </button>
      </form>

      {/* Kanban Board Columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {col.title}
              </h3>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400 font-semibold">
                {col.tasks.length}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 flex-1 min-h-[160px]">
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  className="group rounded-xl border border-white/5 bg-slate-900/90 p-3.5 shadow transition-all hover:border-brand-400/30 hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-200 leading-snug">{task.title}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(col.id, task.id)}
                      className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                      title="Delete task"
                    >
                      ×
                    </button>
                  </div>

                  {/* Move Task Action Buttons */}
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px]">
                    <span className="rounded bg-brand-500/10 px-1.5 py-0.5 font-mono text-brand-300">
                      {task.tag || 'Task'}
                    </span>
                    <div className="flex items-center gap-1">
                      {columns
                        .filter((c) => c.id !== col.id)
                        .map((target) => (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() => handleMoveTask(col.id, target.id, task)}
                            className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            → {target.title.split(' ')[1]}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
