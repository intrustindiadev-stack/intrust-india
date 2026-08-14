'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ChevronLeft, ChevronRight, Search, Users, CheckCircle, XCircle, Clock, CalendarDays, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import StatusBadge from '@/components/hrm/StatusBadge';
import { formatDateIST, formatTimeIST, calculateDuration, getISTDateString } from '@/lib/hrm/date';
import { computeAttendanceMetrics, getLocationStatusBadge } from '@/lib/hrm/attendance';

export default function AttendanceOverviewPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Month navigation
  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-');
    const prev = new Date(parseInt(year), parseInt(month) - 2, 1);
    setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-');
    const next = new Date(parseInt(year), parseInt(month), 1);
    setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const fetchMonthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [year, month] = currentMonth.split('-');
      // Start and end of month
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      // Fetch all attendance for this month joined with user profile
      const { data, error } = await supabase.from('attendance')
        .select('*, user_profiles(id, full_name, department, employee_id, role)')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load monthly attendance');
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Aggregate metrics per employee
  const employeeData = useMemo(() => {
    const map = new Map();
    
    // Group records by employee
    records.forEach(r => {
      const p = r.user_profiles;
      if (!p) return;
      
      if (!map.has(p.id)) {
        map.set(p.id, {
          profile: p,
          records: []
        });
      }
      map.get(p.id).records.push(r);
    });

    const [year, month] = currentMonth.split('-');
    const windowStartStr = `${year}-${month}-01`;
    const windowEndStr = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    const aggregated = Array.from(map.values()).map(({ profile, records }) => {
      // Use existing compute metrics if possible. We might not have join date, holidays, etc. here
      // But we can just use the records themselves to calculate raw metrics.
      const present = records.filter(r => r.status === 'present' || r.status === 'wfh').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const halfDay = records.filter(r => r.status === 'half_day').length;
      const leave = records.filter(r => r.status === 'holiday' || r.status === 'leave').length; // assuming holiday/leave
      
      // Calculate working days in month (naive approximation: exclude weekends if we don't have accurate holiday calendar)
      // Since this is just an overview and computeAttendanceMetrics might need more params, we will do a simple calc.
      const metrics = computeAttendanceMetrics(records, windowStartStr, windowEndStr);

      return {
        profile,
        records,
        present: present + late,
        absent,
        late,
        halfDay,
        leave,
        totalRecords: records.length,
        attendanceRate: metrics.attendanceRatePct,
        workingDays: metrics.expectedWorkingDays
      };
    });

    return aggregated.sort((a, b) => a.profile.full_name?.localeCompare(b.profile.full_name));
  }, [records, currentMonth]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalEmployees = employeeData.length;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;
    let totalRate = 0;

    employeeData.forEach(e => {
      totalPresent += e.present;
      totalAbsent += e.absent;
      totalLate += e.late;
      totalLeave += e.leave;
      totalRate += e.attendanceRate;
    });

    return {
      totalEmployees,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
      avgAttendance: totalEmployees ? Math.round(totalRate / totalEmployees) : 0
    };
  }, [employeeData]);

  const filteredEmployees = employeeData.filter(e =>
    !search || 
    e.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.profile?.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 min-h-screen bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Monthly Attendance Overview</h1>
          <p className="text-xs text-slate-500 mt-1">Review employee attendance, absences, late arrivals and working days for the selected month.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden shadow-xs">
            <button onClick={handlePrevMonth} className="px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-300 dark:border-slate-700">
              <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
            <input 
              type="month" 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none bg-transparent"
            />
            <button onClick={handleNextMonth} className="px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-300 dark:border-slate-700">
              <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
          
          <button onClick={fetchMonthData} aria-label="Refresh" className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-xs">
            <RefreshCw size={16} className={`text-slate-600 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Employees" value={summary.totalEmployees} icon={<Users size={16} />} color="emerald" />
        <MetricCard title="Total Present" value={summary.totalPresent} icon={<CheckCircle size={16} />} color="indigo" />
        <MetricCard title="Total Absent" value={summary.totalAbsent} icon={<XCircle size={16} />} color="rose" />
        <MetricCard title="Total Late" value={summary.totalLate} icon={<Clock size={16} />} color="amber" />
        <MetricCard title="Total Leave" value={summary.totalLeave} icon={<CalendarDays size={16} />} color="blue" />
        <MetricCard title="Avg Attendance" value={`${summary.avgAttendance}%`} icon={<RefreshCw size={16} />} color="emerald" />
      </div>

      {/* Search & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center">
            <RefreshCw size={24} className="animate-spin text-slate-300 mb-2" />
            Loading overview...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={28} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No attendance records found for {currentMonth}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-center">Working Days</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 text-center">Leave</th>
                  <th className="px-4 py-3 text-center">Half Day</th>
                  <th className="px-4 py-3 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map(emp => (
                  <tr 
                    key={emp.profile.id} 
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 transition-colors">{emp.profile.full_name}</div>
                      <div className="text-[10px] text-slate-500">{emp.profile.employee_id} • {emp.profile.department || emp.profile.role?.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{emp.workingDays}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-bold">{emp.present}</td>
                    <td className="px-4 py-3 text-center text-rose-600 font-bold">{emp.absent}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{emp.late}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-bold">{emp.leave}</td>
                    <td className="px-4 py-3 text-center text-indigo-600 font-bold">{emp.halfDay}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md font-bold ${
                        emp.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-700' :
                        emp.attendanceRate >= 75 ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {emp.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Drawer */}
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeDetailDrawer 
            employee={selectedEmployee} 
            month={currentMonth}
            onClose={() => setSelectedEmployee(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-1.5 rounded-lg border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function EmployeeDetailDrawer({ employee, month, onClose }) {
  const [year, m] = month.split('-');
  const monthName = new Date(parseInt(year), parseInt(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
      />
      <motion.div 
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{employee.profile.full_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{employee.profile.employee_id} • {monthName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Attendance</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{employee.attendanceRate}%</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">Present</div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{employee.present} <span className="text-[10px] text-emerald-500 dark:text-emerald-400/70 font-medium">/ {employee.workingDays}</span></div>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Daily Breakdown</h3>
          
          <div className="space-y-3">
            {employee.records.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs">No records found.</div>
            ) : (
              employee.records.map(r => (
                <div key={r.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-1">{formatDateIST(r.work_date)}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{formatTimeIST(r.check_in)}</span>
                      <span>→</span>
                      <span>{formatTimeIST(r.check_out)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={r.status} type="attendance" />
                    {r.check_in && r.check_out && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {calculateDuration(r.check_in, r.check_out)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
