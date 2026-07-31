import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { format } from 'date-fns';
import AwardIncentiveModal from './AwardIncentiveModal';

export const dynamic = 'force-dynamic';

export default async function IncentivesPage() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch incentives
  const { data: incentives } = await supabase
    .from('incentives')
    .select(`
      *,
      user_profiles:employee_id ( full_name, email )
    `)
    .order('date_awarded', { ascending: false });

  // Fetch employees for the dropdown
  const { data: employees } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('role', [
        'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
        'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent'
    ])
    .order('full_name');

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Actions */}
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Incentives & Bonuses</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and award financial incentives to employees.</p>
          </div>
          <AwardIncentiveModal employees={employees || []} />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date Awarded</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!incentives || incentives.length === 0) && (
                  <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-400">No incentives awarded yet.</td>
                  </tr>
              )}
              {incentives?.map((incentive) => (
                <tr key={incentive.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {incentive.user_profiles?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">{incentive.type}</td>
                  <td className="px-6 py-4 truncate max-w-xs">{incentive.description || '-'}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ₹{incentive.amount}
                  </td>
                  <td className="px-6 py-4">
                    {format(new Date(incentive.date_awarded), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${incentive.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                      ${incentive.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                      ${incentive.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                    `}>
                      {incentive.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
