'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];

export default function AnalyticsCharts({ revenueData, inventoryData, brandData }) {

    // Custom Tooltip for Revenue Chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="merchant-glass p-4 border border-black/5 dark:border-white/10 shadow-2xl rounded-2xl backdrop-blur-md">
                    <p className="text-slate-800 dark:text-slate-200 font-bold mb-2">{label}</p>
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                        ₹{payload[0].value.toFixed(2)}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Sales: <span className="text-slate-800 dark:text-slate-200">{payload[0].payload.salesCount}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Trend Chart */}
            <div className="merchant-glass p-6 rounded-3xl shadow-lg border border-black/5 dark:border-white/5 lg:col-span-2 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-display flex items-center relative z-10">
                    <span className="material-icons-round text-blue-500 dark:text-blue-400 mr-2">timeline</span>
                    Revenue Trend (Last 30 Days)
                </h3>
                <div className="h-[300px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={revenueData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/[0.05]" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Inventory Distribution */}
            <div className="merchant-glass p-6 rounded-3xl shadow-lg border border-black/5 dark:border-white/5 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-display flex items-center relative z-10">
                    <span className="material-icons-round text-purple-600 dark:text-purple-400 mr-2">pie_chart</span>
                    Inventory Status
                </h3>
                <div className="h-[300px] w-full flex flex-col items-center justify-center relative z-10">
                    {inventoryData.every(d => d.value === 0) ? (
                        <div className="text-center text-slate-500 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                                <span className="material-icons-round text-3xl opacity-50">data_usage</span>
                            </div>
                            <p className="font-semibold text-sm uppercase tracking-wider">No Data</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="transparent"
                                >
                                    {inventoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [value, 'Coupons']}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.05)', borderRadius: '16px', backdropFilter: 'blur(8px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    wrapperStyle={{ color: '#64748B', fontWeight: 600, fontSize: '13px' }}
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Top Brands Performance */}
            <div className="merchant-glass p-6 rounded-3xl shadow-lg border border-black/5 dark:border-white/5 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl group-hover:bg-[#D4AF37]/20 transition-all pointer-events-none"></div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 font-display flex items-center relative z-10">
                    <span className="material-icons-round text-[#D4AF37] mr-2">star</span>
                    Top Brands by Revenue
                </h3>
                <div className="h-[300px] w-full relative z-10">
                    {brandData.length === 0 ? (
                        <div className="text-center text-slate-500 h-full flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                                <span className="material-icons-round text-3xl opacity-50">bar_chart</span>
                            </div>
                            <p className="font-semibold text-sm uppercase tracking-wider">No Data</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={brandData}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.05)" className="dark:stroke-white/[0.05]" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fill: '#475569', fontSize: 13, fontWeight: 'bold' }}
                                    className="dark:fill-slate-200"
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)', className: 'dark:fill-white/[0.02]' }}
                                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(212,175,55,0.2)', borderRadius: '16px', backdropFilter: 'blur(8px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '16px' }}
                                    labelStyle={{ color: '#64748B', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                                <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={24}>
                                    {brandData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#D4AF37' : `rgba(212, 175, 55, ${1 - index * 0.15})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
