import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ShieldCheck } from 'lucide-react';
import UserRoleManager from '@/components/admin/users/UserRoleManager';
import PageGuideWrapper from '@/components/admin/PageGuideWrapper';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
    // Get current admin user ID for self-lockout protection in role manager
    const authSupabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await authSupabase.auth.getUser();
    const currentAdminId = currentUser?.id || null;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 space-y-6 font-[family-name:var(--font-outfit)] relative">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
                            <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
                                Control system access by assigning roles to users. Manage administrators, HR managers, and sales personnel.
                            </p>
                        </div>
                    </div>
                    <PageGuideWrapper pageKey="/admin/roles" />
                </div>

                {/* Role Management Section */}
                <div>
                    <UserRoleManager currentAdminId={currentAdminId} />
                </div>
            </div>
        </div>
    );
}
