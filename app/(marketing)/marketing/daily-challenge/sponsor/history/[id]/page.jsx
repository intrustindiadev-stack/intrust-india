import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import SponsorshipDetailClient from './SponsorshipDetailClient';

export const metadata = { title: 'Sponsorship Analytics | InTrust Marketing', description: 'Detailed analytics for your daily challenge sponsorship.' };
export const dynamic = 'force-dynamic';
export const revalidate = 0;


function extractImage(images) {
    if (!images) return '/icons/intrustLogo.png';
    if (Array.isArray(images) && images.length > 0) return images[0];
    if (typeof images === 'string') {
        if (images.startsWith('[')) { try { const a = JSON.parse(images); if (Array.isArray(a) && a[0]) return a[0]; } catch {} }
        if (images.startsWith('http') || images.startsWith('/')) return images;
    }
    return '/icons/intrustLogo.png';
}

export default async function SponsorshipDetailPage({ params }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login?returnUrl=/marketing/daily-challenge/sponsor/history');

    const { data: profile } = await supabase.from('user_profiles')
        .select('id, role, full_name, email, phone, avatar_url').eq('id', user.id).maybeSingle();
    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isMerchant) redirect('/marketing/daily-challenge');

    let { data: merchant } = await adminSupabase.from('merchants')
        .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
        .eq('user_id', user.id).maybeSingle();
    if (!merchant && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
        const { data: runnrMerchant } = await adminSupabase.from('merchants')
            .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
            .ilike('business_name', '%runnr%').maybeSingle();
        merchant = runnrMerchant;
    }
    if (!merchant?.id) redirect('/marketing/daily-challenge/sponsor');

    const { data: booking } = await adminSupabase
        .from('daily_challenge_sponsorships')
        .select('id, sponsor_date, product_ids, campaign_message, fee_paise, status, created_at, merchant_id')
        .eq('id', id).eq('merchant_id', merchant.id).maybeSingle();
    if (!booking) redirect('/marketing/daily-challenge/sponsor/history');

    const [eventsRes, playsRes] = await Promise.all([
        adminSupabase.from('sponsorship_analytics_events').select('event_type, product_id, visitor_id, created_at, metadata').eq('sponsorship_id', booking.id),
        adminSupabase.from('daily_challenge_plays').select('user_id, score, cashback_awarded_paise, completed_at').eq('challenge_date', booking.sponsor_date),
    ]);

    const productIds = Array.isArray(booking.product_ids) ? booking.product_ids : [];
    const productsMap = {};
    if (productIds.length > 0) {
        const { data: invProds } = await adminSupabase.from('merchant_inventory')
            .select('id, custom_title, retail_price_paise, shopping_products(id, title, slug, product_images, suggested_retail_price_paise)').in('id', productIds);
        (invProds || []).forEach(item => {
            productsMap[item.id] = {
                id: item.id,
                title: item.custom_title || item.shopping_products?.title || 'Product',
                price: item.retail_price_paise ? Math.round(item.retail_price_paise / 100) : 199,
                image: extractImage(item.shopping_products?.product_images),
            };
        });
        const missing = productIds.filter(pid => !productsMap[pid]);
        if (missing.length > 0) {
            const { data: directProducts } = await adminSupabase.from('shopping_products')
                .select('id, title, slug, product_images, suggested_retail_price_paise').in('id', missing);
            (directProducts || []).forEach(p => { productsMap[p.id] = { id: p.id, title: p.title || 'InTrust Product', price: 249, image: extractImage(p.product_images) }; });
        }
    }

    const feePaise = Number(booking.fee_paise || 99900);
    const totalPaise = feePaise + Math.round(feePaise * 0.09) * 2;
    const invoiceNumber = `INV-MKT-${booking.sponsor_date.replace(/-/g, '')}-${(booking.id || '').slice(0, 6).toUpperCase() || 'SPN'}`;

    return (
        <SponsorshipDetailClient
            user={user} profile={profile} merchant={merchant}
            booking={{ id: booking.id, sponsorDate: booking.sponsor_date, status: booking.status, campaignMessage: booking.campaign_message, feePaise, totalPaise, feeRupees: feePaise / 100, totalRupees: totalPaise / 100, products: productIds.map(pid => productsMap[pid]).filter(Boolean), createdAt: booking.created_at, invoiceNumber }}
            invoice={{ invoiceNumber, invoiceDate: booking.created_at || new Date().toISOString(), serviceDate: booking.sponsor_date, sacCode: '998365', serviceDescription: 'Daily Challenge Prime Placement & Sponsored Catalog Showcase (24 Hours)', merchantName: merchant.business_name, baseFeeRupees: feePaise / 100, cgstRupees: Math.round(feePaise * 0.09) / 100, sgstRupees: Math.round(feePaise * 0.09) / 100, totalRupees: totalPaise / 100, paymentMethod: 'wallet', status: 'PAID' }}
            events={eventsRes.data || []}
            plays={playsRes.data || []}
            todayIST={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}
        />
    );
}
