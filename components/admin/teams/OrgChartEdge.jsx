'use client';

export default function OrgChartEdge({ x1, y1, x2, y2, color = '#6366f1' }) {
    // Calculate smooth cubic bezier path between parent bottom (x1, y1) and child top (x2, y2)
    const midY = (y1 + y2) / 2;
    const pathData = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    return (
        <g className="transition-all duration-300">
            {/* Outer glow stroke */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeOpacity="0.15"
                strokeLinecap="round"
            />
            {/* Main connecting line */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                className="animate-[dash_20s_linear_infinite]"
            />
            {/* Origin & Destination connection dots */}
            <circle cx={x1} cy={y1} r="3" fill={color} />
            <circle cx={x2} cy={y2} r="3" fill={color} />
        </g>
    );
}
