import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
    const rawParams = await params;
    const code = rawParams?.code;

    // Safe origin resolver that never throws
    const getBaseUrl = () => {
        try {
            if (request?.nextUrl?.origin) return request.nextUrl.origin;
            if (request?.url) return new URL(request.url).origin;
        } catch {
            // fallback
        }
        return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    };

    const baseUrl = getBaseUrl();

    if (!code) {
        return NextResponse.redirect(new URL('/shop', baseUrl));
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.redirect(new URL('/shop', baseUrl));
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // 1. Fetch link
        const { data: link, error } = await supabase
            .from('marketing_share_links')
            .select('id, user_id, user_type, merchant_id, product_id, product_type, code, clicks_count')
            .eq('code', code.toUpperCase())
            .maybeSingle();

        if (error || !link) {
            return NextResponse.redirect(new URL('/shop', baseUrl));
        }

        // 2. Determine destination URL & fetch product metadata for rich social previews
        let destinationPath = '/shop';
        let prod = null;

        if (link.product_id) {
            try {
                const { data: fetchedProd } = await supabase
                    .from('shopping_products')
                    .select('slug, id, title, product_images, suggested_retail_price_paise, platform_price_paise')
                    .eq('id', link.product_id)
                    .maybeSingle();

                prod = fetchedProd;

                if (prod?.slug) {
                    destinationPath = `/shop/product/${prod.slug}`;
                } else {
                    destinationPath = `/shop?ref_prod=${link.product_id}`;
                }
            } catch (e) {
                console.warn('[Referral Route] Failed to query product details:', e?.message || e);
                destinationPath = '/shop';
            }
        }

        const userAgent = request.headers?.get ? request.headers.get('user-agent') || '' : '';

        // 3. Bot Crawler Detection (WhatsApp, Telegram, Twitter, Facebook, LinkedIn, etc.)
        const isBot = /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|twitter|slack|linkedin|discord|embedly/i.test(userAgent);

        if (isBot) {
            const prodTitle = prod?.title || 'Exclusive Deal on InTrust';
            const rawImages = prod?.product_images;
            const prodImage = (Array.isArray(rawImages) && rawImages[0]) || (typeof rawImages === 'string' ? rawImages : `${baseUrl}/icons/intrustLogo.png`);
            const pricePaise = prod?.platform_price_paise || prod?.suggested_retail_price_paise;
            const priceStr = pricePaise ? `₹${Math.round(pricePaise / 100)}` : '';
            const prodDesc = priceStr 
                ? `Get "${prodTitle}" for ${priceStr} with guaranteed InTrust cashback and verified partner delivery.`
                : `Check out "${prodTitle}" on InTrust and earn instant cashback!`;

            const fullDestUrl = new URL(destinationPath, baseUrl).toString();

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${prodTitle} | InTrust</title>
    <meta name="description" content="${prodDesc}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="InTrust India">
    <meta property="og:title" content="${prodTitle} ${priceStr ? `— ${priceStr}` : ''}">
    <meta property="og:description" content="${prodDesc}">
    <meta property="og:image" content="${prodImage}">
    <meta property="og:url" content="${fullDestUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${prodTitle}">
    <meta name="twitter:description" content="${prodDesc}">
    <meta name="twitter:image" content="${prodImage}">
</head>
<body>
    <script>window.location.href = "${destinationPath}";</script>
</body>
</html>`;

            return new NextResponse(html, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 4. Real User Click: Increment clicks count atomically without blocking redirection
        try {
            await supabase.rpc('increment_marketing_link_clicks', { p_link_id: link.id });
        } catch (e) {
            console.warn('[Referral Route] Failed to atomically increment clicks count:', e?.message || e);
        }

        // 5. Log human CLICK event safely
        try {
            const forwarded = request.headers?.get ? request.headers.get('x-forwarded-for') : null;
            const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers?.get ? request.headers.get('x-real-ip') : null) || 'unknown';
            const referer = request.headers?.get ? request.headers.get('referer') || 'direct' : 'direct';

            await supabase
                .from('marketing_tracking_events')
                .insert({
                    link_id: link.id,
                    event_type: 'CLICK',
                    visitor_ip: ip,
                    user_agent: userAgent,
                    metadata: { referer, code: link.code }
                });
        } catch (e) {
            console.warn('[Referral Route] Failed to log tracking event:', e?.message || e);
        }

        // 6. Build Redirect response to destination URL with referral code parameter & attribution cookies
        const destUrl = new URL(destinationPath, baseUrl);
        destUrl.searchParams.set('ref', link.code);

        const response = NextResponse.redirect(destUrl);
        const cookieOptions = {
            path: '/',
            maxAge: 30 * 24 * 60 * 60, // 30-day persistent attribution
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        };

        response.cookies.set('intrust_affiliate_code', link.code, cookieOptions);
        if (link.user_id) {
            response.cookies.set('intrust_affiliate_user', link.user_id, cookieOptions);
        }
        if (link.merchant_id) {
            response.cookies.set('intrust_affiliate_merchant', link.merchant_id, cookieOptions);
        }

        return response;
    } catch (err) {
        console.error('Error handling marketing share link:', err);
        return NextResponse.redirect(new URL('/shop', baseUrl));
    }
}


