import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/navigation';

export async function GET(request, { params }) {
    const { code } = await params;

    if (!code) {
        return NextResponse.redirect(new URL('/shop', request.url));
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch link
        const { data: link, error } = await supabase
            .from('marketing_share_links')
            .select('id, user_id, user_type, merchant_id, product_id, product_type, code, clicks_count')
            .eq('code', code.toUpperCase())
            .maybeSingle();

        if (error || !link) {
            return NextResponse.redirect(new URL('/shop', request.url));
        }

        // 2. Increment clicks count asynchronously
        const nextClicks = (Number(link.clicks_count) || 0) + 1;
        await supabase
            .from('marketing_share_links')
            .update({ clicks_count: nextClicks })
            .eq('id', link.id);

        // 3. Log CLICK event
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        const referer = request.headers.get('referer') || 'direct';

        await supabase
            .from('marketing_tracking_events')
            .insert({
                link_id: link.id,
                event_type: 'CLICK',
                visitor_ip: ip,
                user_agent: userAgent,
                metadata: { referer, code: link.code }
            });

        // 4. Determine destination URL & fetch product metadata for rich social previews
        let destinationUrl = '/shop';
        let prod = null;

        if (link.product_id) {
            const { data: fetchedProd } = await supabase
                .from('shopping_products')
                .select('slug, id, title, product_images, selling_price_paise, suggested_retail_price_paise')
                .eq('id', link.product_id)
                .maybeSingle();

            prod = fetchedProd;

            if (prod?.slug) {
                destinationUrl = `/shop/product/${prod.slug}`;
            } else {
                destinationUrl = `/shop?ref_prod=${link.product_id}`;
            }
        }

        // 5. Bot Crawler Detection (WhatsApp, Telegram, Twitter, Facebook, LinkedIn, etc.)
        const isBot = /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|twitter|slack|linkedin|discord|embedly/i.test(userAgent);

        if (isBot) {
            const prodTitle = prod?.title || 'Exclusive Deal on InTrust';
            const rawImages = prod?.product_images;
            const prodImage = (Array.isArray(rawImages) && rawImages[0]) || (typeof rawImages === 'string' ? rawImages : 'https://intrust.in/icons/intrustLogo.png');
            const pricePaise = prod?.selling_price_paise || prod?.suggested_retail_price_paise;
            const priceStr = pricePaise ? `₹${Math.round(pricePaise / 100)}` : '';
            const prodDesc = priceStr 
                ? `Get "${prodTitle}" for ${priceStr} with guaranteed InTrust cashback and verified partner delivery.`
                : `Check out "${prodTitle}" on InTrust and earn instant cashback!`;

            const fullDestUrl = new URL(destinationUrl, request.url).toString();

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
    <script>window.location.href = "${destinationUrl}";</script>
</body>
</html>`;

            return new NextResponse(html, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 6. Build Redirect response to destination URL with referral code parameter & attribution cookies
        const destUrl = new URL(destinationUrl, request.url);
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
        return NextResponse.redirect(new URL('/shop', request.url));
    }
}

