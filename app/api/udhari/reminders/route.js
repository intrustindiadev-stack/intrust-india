import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyCustomerUdhariDue } from '@/lib/notifications/userWhatsapp';

/**
 * GET /api/udhari/reminders
 * Trigger frequency: Once per hour/day
 * Purpose: Scan for nearing and overdue store credit payments and notify users.
 */
export async function GET(request) {
    const correlationId = crypto.randomUUID();
    
    try {
        const supabase = createAdminClient();
        
        // 1. Fetch all ACTIVE (approved) store credit requests that haven't been completed or cancelled
        const { data: activeRequests, error: fetchError } = await supabase
            .from('udhari_requests')
            .select(`
                *,
                customer:user_profiles!udhari_requests_customer_id_fkey(full_name),
                merchant:merchants(business_name, user_id)
            `)
            .eq('status', 'approved');

        if (fetchError) throw fetchError;
        if (!activeRequests || activeRequests.length === 0) {
            return NextResponse.json({ message: 'No active store credit requests to check.' });
        }

        const now = new Date();
        const results = {
            totalChecked: activeRequests.length,
            sentNotifications: 0,
            errors: []
        };

        for (const req of activeRequests) {
            if (!req.due_date) continue;
            
            const dueDate = new Date(req.due_date);
            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days remaining

            let reminderType = null;
            let notifyCustomer = false;
            let notifyMerchant = false;
            let messageTitle = "";
            let messageBody = "";

            // Determine check intervals
            if (diffDays === 3) reminderType = '3_day';
            else if (diffDays === 1) reminderType = '1_day';
            else if (diffDays === 0) reminderType = 'due_day';
            else if (diffDays < 0) reminderType = 'overdue';

            if (!reminderType) continue; // Not in a reminder window

            // 2. Check if this specific reminder was already sent
            const { data: existingReminder } = await supabase
                .from('udhari_reminders')
                .select('*')
                .eq('udhari_request_id', req.id)
                .eq('reminder_type', reminderType)
                .single();

            if (existingReminder) continue; // Already sent

            // 3. Prepare messages
            const amount = (req.amount_paise / 100).toFixed(2);
            const merchantName = req.merchant?.business_name || 'the merchant';

            if (reminderType === '3_day') {
                notifyCustomer = true;
                messageTitle = "Upcoming Payment Due ⏰";
                messageBody = `Your store credit payment of ₹${amount} to ${merchantName} is due in 3 days (${dueDate.toLocaleDateString()}).`;
            } else if (reminderType === '1_day') {
                notifyCustomer = true;
                messageTitle = "Payment Due Tomorrow ⏳";
                messageBody = `Reminder: ₹${amount} store credit payment to ${merchantName} is due tomorrow. Please pay to maintain your trust score.`;
            } else if (reminderType === 'due_day') {
                notifyCustomer = true;
                messageTitle = "Payment Due Today ⚡️";
                messageBody = `Action Required: Your payment of ₹${amount} to ${merchantName} is due TODAY. You can pay via your dashboard.`;
            } else if (reminderType === 'overdue') {
                notifyCustomer = true;
                notifyMerchant = true; // Alert merchant when overdue
                messageTitle = "Payment Overdue 🚨";
                messageBody = `Your payment of ₹${amount} to ${merchantName} is OVERDUE since ${dueDate.toLocaleDateString()}. Please settle immediately.`;
            }

            // 4. Send Customer Notification
            if (notifyCustomer) {
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: req.customer_id,
                    title: messageTitle,
                    body: messageBody,
                    type: reminderType === 'overdue' ? 'error' : 'warning',
                    reference_id: req.id,
                    reference_type: 'udhari_reminder'
                });
                
                if (notifError) {
                    console.error('Error sending customer notif:', notifError);
                    results.errors.push({ reqId: req.id, type: 'customer_notif', error: notifError.message });
                } else {
                    results.sentNotifications++;
                    // FIRE WHATSAPP NOTIFICATION
                    notifyCustomerUdhariDue({
                        userId: req.customer_id,
                        merchantName: merchantName,
                        amount: amount,
                        dueDate: dueDate.toLocaleDateString(),
                        status: reminderType === 'overdue' ? 'Overdue' : 'Due Soon'
                    }).catch(e => console.error('[Udhari Reminder WhatsApp] Failed:', e));
                }
            }

            // 5. Send Merchant Notification (Only for overdue)
            if (notifyMerchant && req.merchant?.user_id) {
                const customerName = req.customer?.full_name || 'a customer';
                await supabase.from('notifications').insert({
                    user_id: req.merchant.user_id,
                    title: 'Customer Payment Overdue 🚨',
                    body: `${customerName} is overdue on their ₹${amount} store credit payment which was due on ${dueDate.toLocaleDateString()}.`,
                    type: 'error',
                    reference_id: req.id,
                    reference_type: 'udhari_overdue_alert'
                });
            }

            // 6. Record that this reminder has been sent
            await supabase.from('udhari_reminders').insert({
                udhari_request_id: req.id,
                reminder_type: reminderType,
                channel: 'in_app'
            });
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('[Reminders API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/udhari/reminders
 * Body: { requestId }
 * Purpose: Allows a merchant to send an on-demand payment reminder for an approved/overdue request.
 * Enforces a 24-hour rate limit per request to prevent customer harassment.
 */
export async function POST(request) {
    const correlationId = crypto.randomUUID();

    try {
        const supabase = createAdminClient();

        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        // 2. Verify merchant identity
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, business_name, status')
            .eq('user_id', user.id)
            .maybeSingle();

        if (merchantError || !merchant || merchant.status !== 'approved') {
            return NextResponse.json({ error: 'Unauthorized. Approved merchant access required.' }, { status: 403 });
        }

        // 3. Parse request body
        const { requestId } = await request.json();
        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId parameter' }, { status: 400 });
        }

        // 4. Fetch the target udhari request
        const { data: udhariReq, error: reqError } = await supabase
            .from('udhari_requests')
            .select('id, customer_id, merchant_id, amount_paise, due_date, status, source_type')
            .eq('id', requestId)
            .eq('merchant_id', merchant.id)
            .maybeSingle();

        if (reqError || !udhariReq) {
            return NextResponse.json({ error: 'Store credit request not found or does not belong to you' }, { status: 404 });
        }

        if (udhariReq.status !== 'approved') {
            return NextResponse.json({ error: `Cannot send reminder. Request is currently "${udhariReq.status}".` }, { status: 400 });
        }

        // 5. Rate limit: check if a reminder was sent in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentReminders, error: recentError } = await supabase
            .from('udhari_reminders')
            .select('id, sent_at')
            .eq('udhari_request_id', requestId)
            .gte('sent_at', twentyFourHoursAgo)
            .limit(1);

        if (recentError) {
            console.error('[Merchant Reminder Rate Check Error]:', recentError);
        }

        if (recentReminders && recentReminders.length > 0) {
            return NextResponse.json({
                error: 'A reminder was already sent for this request in the last 24 hours. Please wait before sending another.'
            }, { status: 429 });
        }

        // 6. Build reminder message
        const now = new Date();
        const dueDate = udhariReq.due_date ? new Date(udhariReq.due_date) : now;
        const isOverdue = dueDate < now;
        const reminderType = isOverdue ? 'overdue' : 'due_day';
        const amount = (udhariReq.amount_paise / 100).toFixed(2);
        const merchantName = merchant.business_name || 'the merchant';

        const title = isOverdue 
            ? 'Payment Overdue 🚨' 
            : 'Payment Reminder ⏰';
        const body = isOverdue
            ? `Your store credit payment of ₹${amount} to ${merchantName} was due on ${dueDate.toLocaleDateString()} and is now OVERDUE. Please settle immediately.`
            : `Friendly reminder: Your store credit payment of ₹${amount} to ${merchantName} is due on ${dueDate.toLocaleDateString()}. You can pay directly from your store credits dashboard.`;

        // 7. Dispatch customer in-app notification
        const { error: notifError } = await supabase.from('notifications').insert({
            user_id: udhariReq.customer_id,
            title,
            body,
            type: isOverdue ? 'error' : 'warning',
            reference_id: udhariReq.id,
            reference_type: 'udhari_reminder',
        });

        if (notifError) {
            console.error('[Merchant Reminder Notif Insert Error]:', notifError);
        }

        // 8. Dispatch WhatsApp notification (fire-and-forget safe)
        try {
            notifyCustomerUdhariDue({
                userId: udhariReq.customer_id,
                merchantName,
                amount,
                dueDate: dueDate.toLocaleDateString(),
                status: isOverdue ? 'Overdue' : 'Due Soon'
            }).catch(e => console.error('[Merchant Triggered WhatsApp Reminder Error]:', e));
        } catch (waErr) {
            console.error('[Merchant Triggered WhatsApp Sync Error]:', waErr);
        }

        // 9. Record reminder in audit log
        await supabase.from('udhari_reminders').insert({
            udhari_request_id: udhariReq.id,
            reminder_type: reminderType,
            channel: 'in_app'
        });

        return NextResponse.json({
            success: true,
            message: `Reminder sent successfully to the customer.`,
            sentAt: new Date().toISOString()
        });

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'post_merchant_reminder_error', error: error?.message || String(error) }));
        return NextResponse.json({ error: 'Failed to send reminder. Please try again later.' }, { status: 500 });
    }
}

