import { createAdminClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { Users } from 'lucide-react';
import UserCard from '@/components/admin/users/UserCard';

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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-500 mt-1">Manage user profiles and KYC verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(users || []).map((user) => (
                    <UserCard key={user.id} user={user} />
                ))}
            </div>

            {/* Empty State */}
            {(!users || users.length === 0) && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No users found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
                </div>
            )}

            {/* Pagination Controls */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="text-sm text-gray-500">
                    Showing <span className="font-semibold text-gray-900">{users?.length || 0}</span> of <span className="font-semibold text-gray-900">{count || 0}</span> users
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/admin/users?page=${page > 1 ? page - 1 : 1}&search=${search}`}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors
                            ${page <= 1
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
                        aria-disabled={page <= 1}
                    >
                        Previous
                    </Link>
                    <Link
                        href={`/admin/users?page=${page < totalPages ? page + 1 : totalPages}&search=${search}`}
                        className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors
                            ${page >= totalPages
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'}`}
                        aria-disabled={page >= totalPages}
                    >
                        Next
                    </Link>
                </div>
            </div>
        </div>
    );
}
