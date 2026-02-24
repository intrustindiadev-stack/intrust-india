import { createAdminClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { Users } from 'lucide-react';
import UserCard from '@/components/admin/users/UserCard';
import UserSearch from '@/components/admin/users/UserSearch';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }) {
    const supabase = createAdminClient();

    // Await searchParams for Next.js 16 compatibility
    const params = await searchParams;

    // Pagination params
    const page = Number(params?.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = params?.search || '';

    // Single optimized query with JOIN (fixes N+1 problem)
    // Using explicit foreign key syntax !user_id to resolve ambiguous relationship
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
        console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        return (
            <div className="p-6 text-center text-red-600">
                Failed to load users. Please try again later.
            </div>
        );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)]">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div className="flex flex-col gap-1 flex-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        User Management
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">
                        Manage user profiles, roles, and KYC verification statuses.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <UserSearch />
                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-700 tracking-wide">
                            Total Users
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 font-extrabold text-sm">
                            {count || 0}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(users || []).map((user) => (
                    <UserCard key={user.id} user={user} />
                ))}
            </div>

            {/* Empty State */}
            {(!users || users.length === 0) && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No users found</h3>
                    <p className="text-slate-500 mt-1 font-medium">Try adjusting your search criteria</p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:px-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-sm font-medium text-slate-500">
                        Showing <span className="font-bold text-slate-900">{users?.length || 0}</span> of <span className="font-bold text-slate-900">{count || 0}</span> users
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            href={`/admin/users?page=${page > 1 ? page - 1 : 1}&search=${search}`}
                            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-sm font-bold transition-all
                                ${page <= 1
                                    ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50'
                                    : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'}`}
                            aria-disabled={page <= 1}
                        >
                            Previous
                        </Link>
                        <Link
                            href={`/admin/users?page=${page < totalPages ? page + 1 : totalPages}&search=${search}`}
                            className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-sm font-bold transition-all
                                ${page >= totalPages
                                    ? 'border border-slate-100 text-slate-400 pointer-events-none bg-slate-50'
                                    : 'border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white shadow-sm'}`}
                            aria-disabled={page >= totalPages}
                        >
                            Next
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
