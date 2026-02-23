import HomeClient from './HomeClient';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'merchant') {
      redirect('/merchant/dashboard');
    }

    if (profile?.role === 'admin') {
      redirect('/admin');
    }
  }

  return <HomeClient />;
}
