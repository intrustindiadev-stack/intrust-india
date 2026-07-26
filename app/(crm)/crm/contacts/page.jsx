import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ContactsClient from './ContactsClient';

export const metadata = {
    title: 'Contacts — InTrust CRM',
    description: 'Manage CRM contacts and address book',
};

export default async function ContactsPage() {
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await authSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['sales_exec', 'sales_manager', 'admin', 'super_admin'].includes(profile?.role)) {
        redirect('/crm');
    }

    return <ContactsClient currentUserId={user.id} currentUserRole={profile.role} />;
}
