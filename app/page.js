import HomeClient from './HomeClient';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DisclaimerNote from '@/components/customer/dashboard/DisclaimerNote';

export async function generateMetadata() {
  return {
    title: "INTRUST",
    description: "Shop smarter with InTrust India. Discover eCommerce deals, buy gift cards instantly, and enjoy a seamless, secure shopping experience — all in one place.",
    alternates: {
      canonical: "/",
    },
  };
}


export default async function Home() {
  const supabase = await createServerSupabaseClient();

  let user = null;
  try {
    const getUserPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 3000)
    );
    const { data } = await Promise.race([getUserPromise, timeoutPromise]);
    user = data?.user;
  } catch (error) {
    // Auth timed out, user remains null. We skip logging to console to avoid Next.js dev overlay.
  }

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      redirect('/admin');
    }
    if (profile?.role === 'merchant') {
      redirect('/merchant/dashboard');
    }
  }

  return (
    <>
      <HomeClient />
      <DisclaimerNote />
    </>
  );
}
