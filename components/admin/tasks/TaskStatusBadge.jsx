export default function TaskStatusBadge({ status }) {
    const config = {
        pending:     { label: 'Pending',     classes: 'bg-amber-100 text-amber-700 border-amber-200' },
        in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
        done:        { label: 'Done',        classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        cancelled:   { label: 'Cancelled',   classes: 'bg-slate-100 text-slate-500 border-slate-200' },
    };

    const { label, classes } = config[status] || config.pending;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
            {label}
        </span>
    );
}
