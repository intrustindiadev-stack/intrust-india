'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export default function GrowthAnalytics({ investments = [] }) {
    // Generate simple monthly data based on investments created_at and amounts
    const chartData = useMemo(() => {
        if (!investments.length) return [];
        
        // Group by month
        const monthlyData = {};
        let runningTotal = 0;

        // Sort investments by date
        const sorted = [...investments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        sorted.forEach(inv => {
            const date = new Date(inv.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    name: month,
                    aum: runningTotal,
                    deployments: 0,
                    profitPaid: 0
                };
            }
            
            if (inv.status === 'active') {
                runningTotal += (inv.amount_paise / 100);
            }
            
            monthlyData[month].aum = runningTotal;
            monthlyData[month].deployments += (inv.amount_paise / 100);
            monthlyData[month].profitPaid += ((inv.total_profit_paid_paise || 0) / 100);
        });

        // Ensure we have at least a few points for a nice chart if data is sparse
        let data = Object.values(monthlyData);
        if (data.length === 1) {
            data = [
                { name: 'Prev', aum: 0, deployments: 0, profitPaid: 0 },
                ...data
            ];
        }

        return data;
    }, [investments]);

    if (!chartData.length) {
        return (
            <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                <p className="text-sm font-bold text-slate-400">Not enough data for analytics</p>
            </div>
        );
    }

    const currentAUM = chartData[chartData.length - 1]?.aum || 0;
    const previousAUM = chartData[chartData.length - 2]?.aum || 0;
    const growth = previousAUM === 0 ? 100 : ((currentAUM - previousAUM) / previousAUM) * 100;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* AUM Growth Chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-black text-slate-900 tracking-tight text-lg">AUM Growth Trend</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">Total Active Capital Deployed</p>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <TrendingUp size={14} className="text-emerald-600" />
                        <span className="text-xs font-black text-emerald-600">
                            +{growth.toFixed(1)}% this month
                        </span>
                    </div>
                </div>
                
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAum" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Total AUM']}
                                labelStyle={{ fontWeight: 'black', color: '#0f172a', marginBottom: '4px' }}
                            />
                            <Area type="monotone" dataKey="aum" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAum)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Profit Distribution */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl text-white flex flex-col">
                <div className="mb-6">
                    <h3 className="font-black text-white tracking-tight text-lg">Profit Activity</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">Paid out vs New Deployments</p>
                </div>
                
                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}}
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                cursor={{fill: '#1e293b'}}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}
                                formatter={(value, name) => [
                                    `₹${value.toLocaleString()}`, 
                                    name === 'deployments' ? 'Deployed' : 'Profit Paid'
                                ]}
                            />
                            <Bar dataKey="deployments" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="profitPaid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deployed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profits Paid</span>
                    </div>
                </div>
            </div>
            
        </div>
    );
}
