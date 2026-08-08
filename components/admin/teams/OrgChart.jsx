'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import OrgChartNode from './OrgChartNode';
import OrgChartEdge from './OrgChartEdge';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Layers } from 'lucide-react';

const NODE_WIDTH = 288; // 72 (w-72) = 288px
const NODE_HEIGHT = 240; // approx height
const HORIZONTAL_GAP = 320;
const VERTICAL_GAP = 300;

export default function OrgChart({
    teams = [],
    onEditTeam,
    onAssignMember,
    onRemoveMember,
    onReassignMember,
    onServiceAreas,
    isReadOnly = false
}) {
    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Expanded nodes state: map of teamId -> boolean (default true)
    const [expandedNodes, setExpandedNodes] = useState({});

    const containerRef = useRef(null);

    const toggleExpand = (teamId) => {
        setExpandedNodes(prev => ({
            ...prev,
            [teamId]: prev[teamId] === undefined ? false : !prev[teamId]
        }));
    };

    // 1. Build hierarchy tree from flat teams list
    const tree = useMemo(() => {
        const teamMap = {};
        teams.forEach(t => {
            teamMap[t.id] = { ...t, children: [] };
        });

        const roots = [];
        teams.forEach(t => {
            if (t.parent_team_id && teamMap[t.parent_team_id]) {
                teamMap[t.parent_team_id].children.push(teamMap[t.id]);
            } else {
                roots.push(teamMap[t.id]);
            }
        });

        return roots;
    }, [teams]);

    // 2. Compute X and Y layout coordinates for tree nodes recursively
    const layoutNodes = useMemo(() => {
        const nodePositions = [];
        const edges = [];

        let currentX = 0;

        function calcSubtreeWidth(node) {
            const isExpanded = expandedNodes[node.id] !== false;
            if (!isExpanded || !node.children || node.children.length === 0) {
                return HORIZONTAL_GAP;
            }
            let width = 0;
            node.children.forEach(child => {
                width += calcSubtreeWidth(child);
            });
            return Math.max(HORIZONTAL_GAP, width);
        }

        function positionNode(node, level, startX) {
            const isExpanded = expandedNodes[node.id] !== false;
            const subtreeWidth = calcSubtreeWidth(node);
            const x = startX + subtreeWidth / 2 - NODE_WIDTH / 2;
            const y = level * VERTICAL_GAP + 50;

            nodePositions.push({
                team: node,
                x,
                y,
                level,
                isExpanded
            });

            if (isExpanded && node.children && node.children.length > 0) {
                let childStartX = startX;
                node.children.forEach(child => {
                    const childWidth = calcSubtreeWidth(child);
                    const childPos = positionNode(child, level + 1, childStartX);
                    
                    // Edge from parent bottom-center to child top-center
                    edges.push({
                        id: `${node.id}-${child.id}`,
                        x1: x + NODE_WIDTH / 2,
                        y1: y + NODE_HEIGHT,
                        x2: childPos.x + NODE_WIDTH / 2,
                        y2: childPos.y,
                        color: node.color || '#6366f1'
                    });

                    childStartX += childWidth;
                });
            }

            return { x, y };
        }

        let startX = 0;
        tree.forEach(root => {
            const w = calcSubtreeWidth(root);
            positionNode(root, 0, startX);
            startX += w + 60;
        });

        return { nodePositions, edges };
    }, [tree, expandedNodes]);

    // Mouse Pan events
    const handleMouseDown = (e) => {
        // Only start pan if clicking on background (not node or buttons)
        if (e.target.closest('.select-none') && !e.target.classList.contains('canvas-bg')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Zoom Controls
    const handleZoomIn = () => setZoom(z => Math.min(z + 0.15, 2.0));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.15, 0.4));
    const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // Touch Pan events for mobile
    const handleTouchStart = (e) => {
        if (e.target.closest('.select-none') && !e.target.classList.contains('canvas-bg')) return;
        if (e.touches.length !== 1) return;
        setIsDragging(true);
        setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        setPan({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => setIsDragging(false);

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="relative w-full h-[650px] bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm cursor-grab active:cursor-grabbing canvas-bg touch-none"
            style={{
                backgroundImage: 'radial-gradient(rgba(156, 163, 175, 0.2) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            }}
        >
            {/* Control Bar Floating Overlay */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={16} />
                </button>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                <button
                    onClick={handleResetView}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Reset View"
                >
                    <Maximize2 size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400 px-2">
                    {Math.round(zoom * 100)}%
                </span>
            </div>

            {/* Empty State */}
            {teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                    <Layers size={40} className="text-gray-300 dark:text-gray-600" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-base">No units created yet</p>
                    <p className="text-sm text-gray-500">Click &quot;+ Create Team&quot; to build your organization hierarchy.</p>
                </div>
            ) : (
                /* Transform Canvas Container */
                <div
                    className="absolute inset-0 transition-transform duration-75 origin-top-left"
                    style={{
                        transform: `translate(${pan.x + 100}px, ${pan.y + 40}px) scale(${zoom})`
                    }}
                >
                    {/* SVG Connections Layer */}
                    <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
                        {layoutNodes.edges.map(edge => (
                            <OrgChartEdge
                                key={edge.id}
                                x1={edge.x1}
                                y1={edge.y1}
                                x2={edge.x2}
                                y2={edge.y2}
                                color={edge.color}
                            />
                        ))}
                    </svg>

                    {/* Team Nodes Layer */}
                    <div className="relative z-10 w-[5000px] h-[5000px] pointer-events-auto">
                        {layoutNodes.nodePositions.map(({ team, x, y, isExpanded }) => (
                            <div
                                key={team.id}
                                className="absolute"
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                            >
                                <OrgChartNode
                                    team={team}
                                    isExpanded={isExpanded}
                                    onToggleExpand={() => toggleExpand(team.id)}
                                    onEditTeam={onEditTeam}
                                    onAssignMember={onAssignMember}
                                    onRemoveMember={onRemoveMember}
                                    onReassignMember={onReassignMember}
                                    onServiceAreas={onServiceAreas}
                                    isReadOnly={isReadOnly}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
