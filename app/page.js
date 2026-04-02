import HomeClient from './HomeClient';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DisclaimerNote from '@/components/customer/dashboard/DisclaimerNote';

export async function generateMetadata() {
  return {
    title: "Intrust India",
    description: "InTrust India — Buy gift cards, explore NFC solutions, and enjoy a curated e-commerce experience. Fast, secure, and trusted by 10,000+ customers. Based in Bhopal, serving all of India.",
    keywords: [
      "gift cards online india",
      "nfc card india",
      "premium ecommerce india",
      "financial services india",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "InTrust India | E-commerce, Gift Cards & NFC",
      description: "Purchase gift cards, order NFC smart cards, and enjoy a curated e-commerce experience — all in one trusted platform across India.",
      url: "https://www.intrustindia.com",
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
