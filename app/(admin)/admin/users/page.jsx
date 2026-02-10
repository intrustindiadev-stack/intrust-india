import { createAdminClient } from '@/lib/supabaseServer';
import UsersTable from './UsersTable';

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

    // Build query
    let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Apply search if present
    if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;

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

            <UsersTable
                initialUsers={users || []}
                initialTotal={count || 0}
                currentPage={page}
                totalPages={totalPages}
            />
        </div>
    );
}
