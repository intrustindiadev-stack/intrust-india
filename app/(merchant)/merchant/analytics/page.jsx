import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { BarChart3, DollarSign } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient();

    // 1. Get User & Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get Merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let merchant = null;

    if (profile?.role === 'admin') {
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        merchant = data;
    } else {
        const { data } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', user.id)
            .single();
        merchant = data;
    }

    if (!merchant) {
        redirect('/merchant-apply');
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Analytics
                    </h1>
                    <p className="text-gray-600">Track your business performance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Placeholder Stats */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-gray-600 font-medium">Total Revenue</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">₹0.00</h3>
                        <p className="text-sm text-green-600 mt-1">+0% from last month</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center py-20">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analytics Coming Soon</h3>
                    <p className="text-gray-500">We are building detailed charts and reports for your business.</p>
                </div>
            </div>
        </div>
    );
}
