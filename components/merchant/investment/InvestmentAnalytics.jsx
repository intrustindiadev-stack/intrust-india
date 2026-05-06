'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ShieldCheck, Clock, Info, IndianRupee } from 'lucide-react';

export default function InvestmentAnalytics({ orders }) {
    if (!orders || orders.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Info size={32} className="text-slate-300" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No order data available yet</p>
            </div>
        );
    }

    // Process orders to get daily profit
    const processData = () => {
        const dailyData = {};
        orders.forEach(order => {
            const date = new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!dailyData[date]) {
                dailyData[date] = { name: date, Profit: 0, Volume: 0 };
            }
            dailyData[date].Profit += (order.profit_paise / 100);
            dailyData[date].Volume += (order.amount_paise / 100);
        });

        return Object.values(dailyData).reverse().slice(-14); // Last 14 days
    };

    const chartData = processData();

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xl shadow-slate-200/50">
                    <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] mb-3">{label}</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-slate-500 text-[10px] font-bold">Total Volume</span>
                            <span className="text-slate-900 font-black text-xs">₹{payload[1].value.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                            <span className="text-emerald-600 text-[10px] font-bold">Your Profit</span>
                            <span className="text-emerald-600 font-black text-xs">₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="h-[250px] md:h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.05} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="Profit"
                            stroke="#10B981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                            activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="Volume"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorVolume)"
                            strokeDasharray="5 5"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Earnings</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        ₹{chartData.reduce((sum, d) => sum + d.Profit, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <IndianRupee size={14} className="text-blue-500" />
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Volume</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                        ₹{chartData.reduce((sum, d) => sum + d.Volume, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                </div>
            </div>
        </div>
    );
}
