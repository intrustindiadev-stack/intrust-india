import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
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

        // 4. Determine destination URL
        let destinationUrl = '/shop';
        if (link.product_id) {
            // Find product slug if platform product
            const { data: prod } = await supabase
                .from('shopping_products')
                .select('slug, id')
                .eq('id', link.product_id)
                .maybeSingle();

            if (prod?.slug) {
                destinationUrl = `/shop/product/${prod.slug}`;
            } else {
                destinationUrl = `/shop?ref_prod=${link.product_id}`;
            }
        }

        // 5. Build Redirect response and attach attribution cookies (30-day validity)
        const response = NextResponse.redirect(new URL(destinationUrl, request.url));
        const cookieOptions = { maxAge: 60 * 60 * 24 * 30, path: '/', httpOnly: false };

        response.cookies.set('intrust_ref_code', link.code, cookieOptions);
        response.cookies.set('intrust_ref_user', link.user_id, cookieOptions);
        if (link.merchant_id) {
            response.cookies.set('intrust_ref_merchant', link.merchant_id, cookieOptions);
        }

        return response;
    } catch (err) {
        console.error('Error handling referral link:', err);
        return NextResponse.redirect(new URL('/shop', request.url));
    }
}
