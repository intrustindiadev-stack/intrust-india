import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

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
