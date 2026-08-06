import { MapPin } from 'lucide-react';

export default function TerritoryBadge({ type, value }) {
    if (!type || !value) return null;
    
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wider">
            <MapPin size={10} />
            {type}: {value}
        </span>
    );
}
