import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import SponsorshipHistoryClient from './SponsorshipHistoryClient';

export const metadata = {
    title: 'My Sponsorship History | InTrust Marketing',
    description: 'Review your past and upcoming daily challenge sponsorships, featured billboard products, and official tax invoices.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SponsorshipHistoryPage() {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?returnUrl=/marketing/daily-challenge/sponsor/history');
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, email, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let merchant = null;
    const { data: directMerchant } = await adminSupabase
        .from('merchants')
        .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
        .eq('user_id', user.id)
        .maybeSingle();
    merchant = directMerchant;

    if (!merchant && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
        const { data: runnrMerchant } = await adminSupabase
            .from('merchants')
            .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
            .ilike('business_name', '%runnr%')
            .maybeSingle();
        merchant = runnrMerchant;
    }

    // Fallback placeholder merchant object if user doesn't have an approved merchant account yet
    if (!merchant) {
        merchant = {
            id: null,
            business_name: profile?.full_name || 'My Business',
            store_name: profile?.full_name || 'My Store',
            wallet_balance_paise: 0
        };
    }

    // 1. Fetch all sponsorships for this merchant (if id exists)
    let bookingsList = [];
    if (merchant.id) {
        const { data: rawBookings } = await adminSupabase
            .from('daily_challenge_sponsorships')
            .select('id, sponsor_date, product_ids, campaign_message, fee_paise, status, created_at')
            .eq('merchant_id', merchant.id)
            .order('sponsor_date', { ascending: false });
        bookingsList = rawBookings || [];
    }

    // Helper to safely extract image
    const extractImage = (prodImages, customImages) => {
        const tryParse = (val) => {
            if (!val) return null;
            if (Array.isArray(val) && val.length > 0) return val[0];
            if (typeof val === 'string') {
                if (val.startsWith('[') || val.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
                    } catch (e) {}
                }
                if (val.startsWith('http') || val.startsWith('/')) return val;
            }
            return null;
        };
        return tryParse(customImages) || tryParse(prodImages) || '/icons/intrustLogo.png';
    };

    // 2. Collect all referenced product IDs to hydrate billboard products
    const allProductIds = new Set();
    bookingsList.forEach(b => {
        if (Array.isArray(b.product_ids)) {
            b.product_ids.forEach(pid => pid && allProductIds.add(pid));
        }
    });

    let productsMap = {};
    if (allProductIds.size > 0) {
        const idList = Array.from(allProductIds);

        // Fetch from merchant_inventory first
        const { data: invProducts } = await adminSupabase
            .from('merchant_inventory')
            .select(`
                id,
                product_id,
                custom_title,
                custom_images,
                retail_price_paise,
                shopping_products (
                    id,
                    title,
                    slug,
                    product_images,
                    suggested_retail_price_paise
                )
            `)
            .in('id', idList);

        (invProducts || []).forEach(item => {
            const pId = item.id;
            const price = item.retail_price_paise 
                ? Math.round(item.retail_price_paise / 100)
                : (item.shopping_products?.suggested_retail_price_paise ? Math.round(item.shopping_products.suggested_retail_price_paise / 100) : 199);
            productsMap[pId] = {
                id: item.id,
                title: item.custom_title || item.shopping_products?.title || 'Store Product',
                price,
                image: extractImage(item.shopping_products?.product_images, item.custom_images),
                slug: item.shopping_products?.slug || item.id
            };
        });

        // Also check if any IDs are direct shopping_products
        const missingIds = idList.filter(id => !productsMap[id]);
        if (missingIds.length > 0) {
            const { data: directProducts } = await adminSupabase
                .from('shopping_products')
                .select('id, title, slug, product_images, suggested_retail_price_paise')
                .in('id', missingIds);

            (directProducts || []).forEach(p => {
                productsMap[p.id] = {
                    id: p.id,
                    title: p.title || 'InTrust Product',
                    price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
                    image: extractImage(p.product_images, null),
                    slug: p.slug
                };
            });
        }
    }

    // 3. Compute IST date status for each booking
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const formattedBookings = bookingsList.map(b => {
        let computedStatus = b.status || 'booked';
        if (b.sponsor_date === todayIST) {
            computedStatus = 'live';
        } else if (b.sponsor_date > todayIST) {
            computedStatus = 'upcoming';
        } else if (b.sponsor_date < todayIST) {
            computedStatus = 'completed';
        }

        const feePaise = Number(b.fee_paise || 99900);
        const cgstPaise = Math.round(feePaise * 0.09);
        const sgstPaise = Math.round(feePaise * 0.09);
        const totalPaise = feePaise + cgstPaise + sgstPaise;

        const resolvedProducts = (Array.isArray(b.product_ids) ? b.product_ids : [])
            .map(pid => productsMap[pid])
            .filter(Boolean);

        const invoiceNumber = `INV-MKT-${b.sponsor_date.replace(/-/g, '')}-${(b.id || '').slice(0, 6).toUpperCase() || 'SPN'}`;

        return {
            id: b.id,
            sponsorDate: b.sponsor_date,
            status: computedStatus,
            campaignMessage: b.campaign_message || "Exclusive quiz cashbacks & authentic community specials.",
            feePaise,
            totalPaise,
            feeRupees: feePaise / 100,
            totalRupees: totalPaise / 100,
            products: resolvedProducts,
            createdAt: b.created_at,
            invoice: {
                invoiceNumber,
                invoiceDate: b.created_at || new Date().toISOString(),
                serviceDate: b.sponsor_date,
                sacCode: '998365',
                serviceDescription: 'Daily Challenge Prime Placement & Sponsored Catalog Showcase (24 Hours)',
                merchantName: merchant.business_name,
                baseFeeRupees: feePaise / 100,
                cgstRupees: cgstPaise / 100,
                sgstRupees: sgstPaise / 100,
                totalRupees: totalPaise / 100,
                paymentMethod: 'wallet',
                status: 'PAID'
            }
        };
    });

    return (
        <SponsorshipHistoryClient
            user={user}
            profile={profile}
            merchant={merchant}
            isMerchant={isMerchant}
            bookings={formattedBookings}
            todayIST={todayIST}
        />
    );
}
