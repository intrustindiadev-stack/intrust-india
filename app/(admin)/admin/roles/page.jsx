import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { ShieldCheck } from 'lucide-react';
import UserRoleManager from '@/components/admin/users/UserRoleManager';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
    // Get current admin user ID for self-lockout protection in role manager
    const authSupabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await authSupabase.auth.getUser();
    const currentAdminId = currentUser?.id || null;

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
                            <ShieldCheck size={14} /> Permissions
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                            Role Management
                        </h1>
                        <p className="text-slate-500 font-medium text-lg max-w-xl">
                            Control system access by assigning roles to users. Manage administrators, HR managers, and sales personnel.
                        </p>
                    </div>
                </div>

                {/* Role Management Section */}
                <div className="mt-8">
                    <UserRoleManager currentAdminId={currentAdminId} />
                </div>
            </div>
        </div>
    );
}
