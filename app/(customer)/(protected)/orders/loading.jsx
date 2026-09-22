export default function CustomerOrdersLoadingSkeleton() {
    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-pulse">
                <div className="h-40 rounded-[2rem] sm:rounded-[3rem] bg-slate-200 dark:bg-slate-800" />
                <div className="flex gap-2 pb-2 pt-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-10 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                    ))}
                </div>
                <div className="space-y-5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
                    ))}
                </div>
            </div>
        </div>
    );
}
