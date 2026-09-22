export function CustomerLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA]/20 to-[#AFB3F7]/20 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-[#92BCEA]/30 border-t-[#92BCEA] rounded-full animate-spin" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium animate-pulse">
                    Loading...
                </p>
            </div>
        </div>
    );
}

export default CustomerLoadingSkeleton;
