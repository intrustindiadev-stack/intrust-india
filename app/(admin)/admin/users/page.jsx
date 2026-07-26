import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { Users, Search, Filter } from 'lucide-react';
import UserCard from '@/components/admin/users/UserCard';
import UserSearch from '@/components/admin/users/UserSearch';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }) {
    const supabase = createAdminClient();

    // Get current admin user ID for self-lockout protection in role manager
    const authSupabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await authSupabase.auth.getUser();
    const currentAdminId = currentUser?.id || null;

    // Await searchParams for Next.js 16 compatibility
    const params = await searchParams;

    // Pagination params
    const page = Number(params?.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = params?.search || '';

    // Single optimized query with JOIN (fixes N+1 problem)
    let userQuery = supabase
        .from('user_profiles')
        .select('*, kyc_records!user_id(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply search if present
    if (search) {
        userQuery = userQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count, error } = await userQuery;

    if (error) {
        console.error('Error fetching users:', error);
        return (
            <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200 mt-10">
                Failed to load users. Please try again later.
            </div>
        );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-outfit)] relative pb-20">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-blue-50/80 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-40 left-10 w-96 h-96 bg-purple-200/30 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold w-fit border border-blue-200/50 backdrop-blur-sm">
                            <Users size={14} /> Directory
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                            User Management
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-xl">
                            Manage user profiles, roles, and monitor KYC verification statuses across the platform.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <UserSearch />
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/60 shadow-lg shadow-slate-200/40 whitespace-nowrap">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">
                                Total Users
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-blue-500 text-white font-extrabold text-sm shadow-sm">
                                {count || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* User Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(users || []).map((user) => (
                        <UserCard key={user.id} user={user} />
                    ))}
                </div>

                {/* Empty State */}
                {(!users || users.length === 0) && (
                    <div className="text-center py-24 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300 shadow-sm mt-8">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                            <Users size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">No users found</h3>
                        <p className="text-slate-500 mt-2 font-medium">Try adjusting your search criteria or clearing filters</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 sm:px-8 rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40">
                        <div className="text-sm font-medium text-slate-500">
                            Showing <span className="font-bold text-slate-900">{users?.length || 0}</span> of <span className="font-bold text-slate-900">{count || 0}</span> users
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Link
                                href={`/admin/users?page=${page > 1 ? page - 1 : 1}&search=${search}`}
                                className={`flex-1 sm:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${page <= 1
                                        ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50/50'
                                        : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 bg-white shadow-sm hover:shadow'}`}
                                aria-disabled={page <= 1}
                            >
                                Previous
                            </Link>
                            <span className="text-sm font-black text-slate-300 px-2">{page} / {totalPages}</span>
                            <Link
                                href={`/admin/users?page=${page < totalPages ? page + 1 : totalPages}&search=${search}`}
                                className={`flex-1 sm:flex-none text-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                                    ${page >= totalPages
                                        ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50/50'
                                        : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 bg-white shadow-sm hover:shadow'}`}
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
