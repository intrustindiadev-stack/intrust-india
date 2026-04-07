'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// ── Colour Palettes ─────────────────────────────────────────────────────────
const PERFORMER_COLORS = [
    '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981',
    '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

const STATUS_COLORS = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    done: '#10b981',
    cancelled: '#94a3b8',
};

const PRIORITY_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
};

const STATUS_LABEL_MAP = {
    pending: 'Pending',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
};

const PRIORITY_LABEL_MAP = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────
function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="bg-slate-900 border border-slate-700/50 px-4 py-2.5 rounded-2xl shadow-xl">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{name}</p>
            <p className="text-white font-extrabold text-lg">{value.toLocaleString('en-IN')}</p>
        </div>
    );
}

// ── Custom Legend ────────────────────────────────────────────────────────────
function CustomLegend({ data, colors }) {
    return (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4">
            {data.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: Array.isArray(colors) ? colors[i % colors.length] : colors }} />
                    <span className="text-xs font-semibold text-slate-500">{entry.name}</span>
                    <span className="text-xs font-extrabold text-slate-800">({entry.value})</span>
                </div>
            ))}
        </div>
    );
}

// ── Single Pie Widget ─────────────────────────────────────────────────────────
function PieWidget({ title, subtitle, badge, data, colors, topPerformer }) {
    const total = data.reduce((s, d) => s + d.value, 0);

    // Build a color array for rendering cells
    const colorArray = Array.isArray(colors)
        ? colors
        : data.map(entry => colors[entry.key] || '#94a3b8');

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                            {title}
                        </h3>
                        {badge && (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
                </div>
                <div className="flex-1 flex items-center justify-center py-12">
                    <p className="text-slate-400 text-sm font-medium">No data yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        {title}
                    </h3>
                    {badge && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-slate-400 text-xs font-medium">{subtitle}</p>
                {topPerformer && (
                    <p className="text-amber-600 text-xs font-bold mt-1.5 flex items-center gap-1">
                        🏆 {topPerformer.name} — {topPerformer.value} tasks done
                    </p>
                )}
            </div>

            <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {colorArray.map((c, i) => (
                                <radialGradient key={i} id={`grad-${title.replace(/\s/g, '-')}-${i}`} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                                </radialGradient>
                            ))}
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                            animationBegin={0}
                            animationDuration={700}
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={`url(#grad-${title.replace(/\s/g, '-')}-${i})`}
                                    stroke={colorArray[i % colorArray.length]}
                                    strokeWidth={1}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{total.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                </div>
            </div>

            <CustomLegend data={data} colors={colorArray} />
        </div>
    );
}

// ── Data Derivation Helpers ──────────────────────────────────────────────────
function derivePerformerData(tasks) {
    const counts = {};
    tasks
        .filter(t => t.status === 'done')
        .forEach(t => {
            const name = t.assigned_to_profile?.full_name || t.assigned_to_profile?.email || 'Unknown';
            counts[name] = (counts[name] || 0) + 1;
        });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

function deriveStatusData(tasks) {
    const counts = {};
    tasks.forEach(t => {
        counts[t.status] = (counts[t.status] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({
        name: STATUS_LABEL_MAP[key] || key,
        key,
        value,
    }));
}

function derivePriorityData(tasks) {
    const counts = {};
    tasks.forEach(t => {
        if (t.priority) {
            counts[t.priority] = (counts[t.priority] || 0) + 1;
        }
    });

    return Object.entries(counts).map(([key, value]) => ({
        name: PRIORITY_LABEL_MAP[key] || key,
        key,
        value,
    }));
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function TaskAnalyticsCharts({ tasks }) {
    const performerData = derivePerformerData(tasks);
    const statusData = deriveStatusData(tasks);
    const priorityData = derivePriorityData(tasks);

    const topPerformer = performerData[0] || null;

    // Build per-chart color arrays
    const statusColorArray = statusData.map(entry => STATUS_COLORS[entry.key] || '#94a3b8');
    const priorityColorArray = priorityData.map(entry => PRIORITY_COLORS[entry.key] || '#94a3b8');

    return (
        <section className="mb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight">
                        Task Analytics
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                        Visual breakdown of task performance and distribution
                    </p>
                </div>
            </div>

            {/* 3-column pie grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PieWidget
                    title="Top Performers"
                    subtitle="Completed tasks per assignee"
                    data={performerData}
                    colors={PERFORMER_COLORS}
                    topPerformer={topPerformer}
                />
                <PieWidget
                    title="Status Distribution"
                    subtitle="Breakdown of all task statuses"
                    data={statusData}
                    colors={statusColorArray}
                />
                <PieWidget
                    title="Priority Distribution"
                    subtitle="Breakdown of task priorities"
                    data={priorityData}
                    colors={priorityColorArray}
                />
            </div>
        </section>
    );
}
