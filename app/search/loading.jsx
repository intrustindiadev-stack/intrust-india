import { Loader2 } from 'lucide-react';

export default function SearchLoading() {
    return (
        <div 
            className="min-h-screen flex items-center justify-center" 
            style={{ background: 'var(--bg-primary)' }}
        >
            <Loader2 className="w-10 h-10 text-[#92BCEA] animate-spin" />
        </div>
    );
}
