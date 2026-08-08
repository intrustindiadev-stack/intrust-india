import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { Users, Building2, Search } from 'lucide-react';
import EmployeeGrid from '@/components/admin/employees/EmployeeGrid';
import { EMPLOYEE_ROLES } from '@/lib/utils/transactionHelpers';

export const dynamic = 'force-dynamic';

export default async function AdminEmployeesPage({ searchParams }) {
    const supabase = createAdminClient();

    // Await searchParams for Next.js 16 compatibility
    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const search = params?.search || '';

    // We fetch users whose role is considered an employee
    const employeeRoles = [
        'employee', 'hr_manager', 'relationship_exec', 'relationship_manager',
        'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent'
    ];

    let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .in('role', employeeRoles)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: employees, count, error } = await query;

    if (error) {
        console.error('Error fetching employees:', error);
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200 mt-10">
                Failed to load employees. Please try again later.
            </div>
        );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)] relative pb-20">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 text-indigo-700 text-xs font-bold w-fit border border-indigo-200/50 backdrop-blur-sm">
                            <Building2 size={14} /> Enterprise
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                            Employee Directory
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-xl">
                            Manage staff profiles, organizational structure, and compensation.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <form method="GET" action="/admin/employees" className="relative w-full sm:w-auto flex items-center">
                            <Search className="absolute left-4 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                name="search" 
                                defaultValue={search}
                                placeholder="Search employees..." 
                                className="w-full sm:w-80 pl-11 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg shadow-slate-200/40"
                            />
                        </form>
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/60 shadow-lg shadow-slate-200/40 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">
                                Total Staff
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-indigo-500 text-white font-extrabold text-sm shadow-sm">
                                {count || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Employee Client Grid with Edit Modal */}
                <EmployeeGrid initialEmployees={employees || []} />

                {/* Empty State */}
                {(!employees || employees.length === 0) && (
                    <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300 shadow-sm mt-8">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                            <Users size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">No employees found</h3>
                        <p className="text-slate-500 mt-2 font-medium">Try adjusting your search criteria</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 sm:px-8 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40">
                        <div className="text-sm font-medium text-slate-500">
                            Showing <span className="font-bold text-slate-900">{employees?.length || 0}</span> of <span className="font-bold text-slate-900">{count || 0}</span> staff
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Link
                                href={`/admin/employees?page=${page > 1 ? page - 1 : 1}&search=${search}`}
                                className={`flex-1 sm:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${page <= 1
                                        ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50/50'
                                        : 'border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 bg-white shadow-sm hover:shadow'}`}
                                aria-disabled={page <= 1}
                            >
                                Previous
                            </Link>
                            <span className="text-sm font-black text-slate-300 px-2">{page} / {totalPages}</span>
                            <Link
                                href={`/admin/employees?page=${page < totalPages ? page + 1 : totalPages}&search=${search}`}
                                className={`flex-1 sm:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${page >= totalPages
                                        ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50/50'
                                        : 'border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 bg-white shadow-sm hover:shadow'}`}
                                aria-disabled={page >= totalPages}
                            >
                                Next
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
