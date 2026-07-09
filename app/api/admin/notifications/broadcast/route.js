import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { 
    notifyCustomerReferralInvite, 
    notifyCustomerGiftcardPromo, 
    notifyCustomerFeatureAnnounce, 
    notifyCustomerFestivalGreeting 
} from '@/lib/notifications/marketingWhatsapp';

/**
 * POST /api/admin/notifications/broadcast
 * Allows admins to send notifications to users.
 * Body: {
 *   target: 'all' | 'merchants' | 'customers' | 'hrm' | 'crm' | 'employee' | 'user_id',
 *   userId?: string, (if target is 'user_id')
 *   title: string,
 *   body: string,
 *   type: 'info' | 'success' | 'warning' | 'error',
 *   reference_type?: string,
 *   reference_id?: string
 * }
 */
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { target, userId, title, body: content, type, reference_type, reference_id } = body;

        if (!target || !title || !content || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const admin = createAdminClient();
        let targetUserIds = [];

        if (target === 'user_id') {
            if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
            targetUserIds = [userId];
        } else if (target === 'all') {
            const { data } = await admin.from('user_profiles').select('id');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'merchants') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'merchant');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'customers') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'customer');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'hrm') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'hrm');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'crm') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'crm');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'employee') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'employee');
            targetUserIds = data.map(p => p.id);
        }

        if (targetUserIds.length === 0) {
            return NextResponse.json({ error: 'No users found for target' }, { status: 404 });
        }

        // Insert notifications in batches to avoid payload limits
        const notifications = targetUserIds.map(uid => ({
            user_id: uid,
            title,
            body: content,
            type,
            reference_type,
            reference_id,
            read: false
        }));

        // Batch size of 100
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const { error: insertError } = await admin.from('notifications').insert(batch);
            if (insertError) throw insertError;
        }
        
        let whatsappStats = null;
        
        if (body.whatsapp && targetUserIds.length > 0) {
            const { templateKey, args = {} } = body.whatsapp;
            let sent = 0, skipped = 0, failed = 0;
            
            // For referral invite, we need to batch fetch referral codes
            let referralCodeMap = {};
            let nameMap = {}; // Used by festival greeting
            
            if (templateKey === 'referral_invite') {
                const { data: profiles } = await admin
                    .from('user_profiles')
                    .select('id, referral_code')
                    .in('id', targetUserIds);
                if (profiles) {
                    profiles.forEach(p => referralCodeMap[p.id] = p.referral_code);
                }
            } else if (templateKey === 'festival_greeting') {
                 const { data: profiles } = await admin
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', targetUserIds);
                if (profiles) {
                    profiles.forEach(p => {
                        nameMap[p.id] = (p.full_name || '').split(' ')[0]?.trim() || 'there';
                    });
                }
            }
            
            for (const userId of targetUserIds) {
                try {
                    let result;
                    if (templateKey === 'referral_invite') {
                        const referralCode = referralCodeMap[userId];
                        if (referralCode) {
                            result = await notifyCustomerReferralInvite({ userId, referralCode, bonusPoints: args.bonusPoints || '50' });
                        } else {
                            result = { skipped: true };
                        }
                    } else if (templateKey === 'giftcard_promo') {
                        result = await notifyCustomerGiftcardPromo({ userId, discountPct: args.discountPct, promoDetails: args.promoDetails });
                    } else if (templateKey === 'feature_announce') {
                        result = await notifyCustomerFeatureAnnounce({ userId, featureName: args.featureName, description: args.description });
                    } else if (templateKey === 'festival_greeting') {
                        const firstName = nameMap[userId] || 'there';
                        result = await notifyCustomerFestivalGreeting({ userId, firstName, festivalName: args.festivalName });
                    }
                    
                    if (result?.sent) sent++;
                    else if (result?.skipped) skipped++;
                    else sent++; // fallback if we don't return structured result
                    
                } catch (e) {
                    failed++;
                }
                await new Promise(r => setTimeout(r, 120));
            }
            whatsappStats = { sent, skipped, failed, total: targetUserIds.length };
        }

        return NextResponse.json({ success: true, count: targetUserIds.length, whatsapp: whatsappStats });
    } catch (error) {
        console.error('[API] Admin Broadcast Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
