import 'server-only';
import { sendWhatsAppMessage, normalisePhone } from '@/lib/omniflow';
import { sendEmail } from '@/lib/email';
import { getAdminNotificationSettings } from '@/lib/notifications/adminAlerts';
import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Dispatches an automated Email and WhatsApp alert to platform administrators
 * regarding maintenance status (activated or resolved).
 *
 * @param {object} params
 * @param {'activated'|'deactivated'} params.status - Maintenance action state
 * @param {string} [params.durationWindow] - e.g. "12 to 24 hours"
 * @param {string} [params.bypassUrl] - Admin bypass URL
 * @param {string} [params.note] - Optional custom memo
 */
export async function sendAdminMaintenanceAlert({
    status = 'activated',
    durationWindow = '12 to 24 hours',
    bypassUrl = 'https://www.intrustindia.com/?bypass=intrust_admin_bypass_2026',
    note = null,
}) {
    const adminSettings = await getAdminNotificationSettings();
    const isActivated = status === 'activated';
    const timestamp = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date());

    const results = {
        whatsapp: { sent: false, error: null },
        email: { sent: false, error: null },
    };

    // ── 1. WhatsApp Alert to Admin ──────────────────────────────────────────
    if (adminSettings.phone && adminSettings.whatsappEnabled) {
        try {
            const adminPhone = normalisePhone(adminSettings.phone);
            const statusIcon = isActivated ? '⚠️' : '✅';
            const statusHeader = isActivated 
                ? '*Platform Maintenance Mode: ACTIVATED*' 
                : '*Platform Maintenance Mode: DEACTIVATED (LIVE)*';

            let whatsappText = `🔔 *InTrust India Infrastructure Alert*\n\n` +
                `${statusIcon} ${statusHeader}\n\n` +
                `• *Status:* ${isActivated ? 'Public Traffic Blocked (503 Active)' : 'Normal Public Traffic Restored'}\n` +
                `• *Expected Window:* ${durationWindow}\n` +
                `• *Timestamp (IST):* ${timestamp}\n`;

            if (isActivated && bypassUrl) {
                whatsappText += `\n🔑 *Admin Bypass Link:*\n${bypassUrl}\n\n` +
                    `_Use this link to access the live platform and test portals without restrictions._`;
            }

            if (note) {
                whatsappText += `\n\n📝 *Note:* ${note}`;
            }

            await sendWhatsAppMessage(adminPhone, whatsappText);
            results.whatsapp.sent = true;
        } catch (err) {
            console.error('[MaintenanceAlert:WhatsApp] Error sending admin WhatsApp alert:', err.message);
            results.whatsapp.error = err.message;
        }
    }

    // ── 2. Transactional Email to Admin ─────────────────────────────────────
    if (adminSettings.email && adminSettings.emailEnabled) {
        try {
            const subject = isActivated
                ? `[ALERT] InTrust India Maintenance Mode Activated (${timestamp})`
                : `[RESOLVED] InTrust India Platform is Back Online (${timestamp})`;

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070B14; color: #E2E8F0; margin: 0; padding: 24px; }
                .card { max-width: 580px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; }
                .logo { font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 24px; }
                .logo span { color: #3B82F6; }
                .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 20px; }
                .badge-active { background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.3); }
                .badge-resolved { background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.3); }
                h1 { font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0 0 16px; }
                p { font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 16px; }
                .details-box { background: #070B14; border: 1px solid #1E293B; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1E293B; }
                .detail-row:last-child { border-bottom: none; }
                .detail-label { color: #64748B; font-weight: 600; }
                .detail-val { color: #F1F5F9; font-weight: 500; }
                .btn { display: inline-block; background: #2563EB; color: #FFFFFF !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }
                .footer { font-size: 11px; color: #475569; text-align: center; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="logo">InTrust <span>India</span></div>
                <div class="badge ${isActivated ? 'badge-active' : 'badge-resolved'}">
                  ${isActivated ? '⚠️ Maintenance Active' : '✅ System Live'}
                </div>
                <h1>${isActivated ? 'Platform Placed Under Maintenance' : 'Maintenance Break Resolved'}</h1>
                <p>
                  ${isActivated 
                    ? 'The InTrust India platform has been switched to maintenance mode. All incoming public traffic is rewritten to the maintenance landing page and API requests will return HTTP 503.' 
                    : 'Scheduled maintenance is concluded. Public traffic and all platform services are fully live.'}
                </p>

                <div class="details-box">
                  <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-val">${isActivated ? 'Maintenance Break Active (503)' : 'Operational (200 OK)'}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Restoration Window</span>
                    <span class="detail-val">${durationWindow}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Logged Time</span>
                    <span class="detail-val">${timestamp} IST</span>
                  </div>
                </div>

                ${isActivated && bypassUrl ? `
                <p style="margin-top: 20px;">To access and test the platform without restrictions, use your secure bypass link:</p>
                <div style="text-align: center;">
                  <a href="${bypassUrl}" class="btn">Open InTrust Bypass Session &rarr;</a>
                </div>
                ` : ''}

                <div class="footer">
                  InTrust India Automated SRE &amp; Infrastructure Alert System &bull; Confidential
                </div>
              </div>
            </body>
            </html>
            `;

            await sendEmail({
                to: adminSettings.email,
                subject,
                html,
            });
            results.email.sent = true;
        } catch (err) {
            console.error('[MaintenanceAlert:Email] Error sending admin email alert:', err.message);
            results.email.error = err.message;
        }
    }

    return results;
}

/**
 * Sends an immediate subscription confirmation acknowledgment to a visitor.
 */
export async function sendSubscriberConfirmation({ contactType, contactValue }) {
    if (contactType === 'whatsapp') {
        const phone = normalisePhone(contactValue);
        const text = `✅ *InTrust India Notification Request*\n\n` +
            `Thank you for checking in! We have registered your number.\n\n` +
            `As soon as our scheduled system maintenance is complete and all services are back online, you will receive an instant notification here.\n\n` +
            `— *Team InTrust India*`;

        try {
            await sendWhatsAppMessage(phone, text);
            return { success: true };
        } catch (err) {
            console.warn('[SubscriberConfirm:WhatsApp] Failed:', err.message);
            return { success: false, error: err.message };
        }
    } else if (contactType === 'email') {
        const subject = 'InTrust India: We will notify you when we are back online';
        const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #070B14; color: #E2E8F0; padding: 24px;">
          <div style="max-width: 500px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 16px; padding: 28px; text-align: center;">
            <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 16px;">InTrust <span style="color:#3B82F6;">India</span></div>
            <h2 style="color: #FFFFFF; font-size: 18px; margin-bottom: 12px;">Notification Request Confirmed</h2>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
              Thank you for visiting. Our systems are currently undergoing scheduled optimization to deliver an improved experience.
            </p>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
              We have noted your email address and will notify you the moment InTrust India is back online.
            </p>
            <div style="font-size: 11px; color: #64748B; margin-top: 24px; border-top: 1px solid #1E293B; padding-top: 16px;">
              &copy; ${new Date().getFullYear()} InTrust India. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        `;

        try {
            await sendEmail({
                to: contactValue,
                subject,
                html,
            });
            return { success: true };
        } catch (err) {
            console.warn('[SubscriberConfirm:Email] Failed:', err.message);
            return { success: false, error: err.message };
        }
    }
    return { success: false, error: 'Invalid contact type' };
}

/**
 * Broadcasts a "Platform Back Online" notification to all pending subscribers.
 */
export async function broadcastMaintenanceResolved() {
    const supabase = createAdminClient();
    const { data: subscribers, error } = await supabase
        .from('maintenance_subscribers')
        .select('id, contact_type, contact_value')
        .eq('status', 'pending');

    if (error) {
        console.error('[BroadcastResolved] Failed to fetch subscribers:', error.message);
        throw error;
    }

    if (!subscribers || subscribers.length === 0) {
        return { total: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const notifiedIds = [];

    const whatsappMessage = `🎉 *InTrust India is Back Online!*\n\n` +
        `Our scheduled system maintenance is complete! All services, gift cards, and shopping portals are now fully operational.\n\n` +
        `Visit our platform to resume:\nhttps://www.intrustindia.com\n\n` +
        `Thank you for your patience and trust.\n— *Team InTrust India*`;

    const emailSubject = 'InTrust India is Back Online!';
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #070B14; color: #E2E8F0; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background: #0D1526; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin-bottom: 20px;">InTrust <span style="color:#3B82F6;">India</span></div>
        <div style="display:inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
          All Services Operational
        </div>
        <h1 style="color: #FFFFFF; font-size: 22px; margin: 0 0 16px;">We're Back Online!</h1>
        <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Our scheduled system maintenance is officially complete. All shopping catalogs, wallet transactions, and customer portals are live with improved speed and reliability.
        </p>
        <a href="https://www.intrustindia.com" style="display: inline-block; background: #2563EB; color: #FFFFFF !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px;">
          Visit InTrust India &rarr;
        </a>
        <div style="font-size: 11px; color: #475569; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} InTrust India. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    for (const sub of subscribers) {
        try {
            if (sub.contact_type === 'whatsapp') {
                const phone = normalisePhone(sub.contact_value);
                await sendWhatsAppMessage(phone, whatsappMessage);
            } else if (sub.contact_type === 'email') {
                await sendEmail({
                    to: sub.contact_value,
                    subject: emailSubject,
                    html: emailHtml,
                });
            }
            sent++;
            notifiedIds.push(sub.id);
        } catch (err) {
            console.error(`[BroadcastResolved] Failed for ${sub.contact_value}:`, err.message);
            failed++;
        }
    }

    // Mark notified in database
    if (notifiedIds.length > 0) {
        await supabase
            .from('maintenance_subscribers')
            .update({
                status: 'notified',
                notified_at: new Date().toISOString(),
            })
            .in('id', notifiedIds);
    }

    // Inform Admin of broadcast results
    await sendAdminMaintenanceAlert({
        status: 'deactivated',
        note: `Broadcast complete: ${sent} subscriber(s) notified (${failed} failed).`,
    });

    return { total: subscribers.length, sent, failed };
}
