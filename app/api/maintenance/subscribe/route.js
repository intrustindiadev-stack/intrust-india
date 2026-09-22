import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { normalisePhone } from '@/lib/omniflow';
import { sendSubscriberConfirmation } from '@/lib/notifications/maintenanceNotifications';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
    try {
        const body = await request.json();
        let { contactType, contactValue } = body;

        if (!contactType || !contactValue) {
            return NextResponse.json(
                { error: 'Contact type and value are required.' },
                { status: 400 }
            );
        }

        contactType = contactType.trim().toLowerCase();
        contactValue = contactValue.trim();

        if (contactType !== 'email' && contactType !== 'whatsapp') {
            return NextResponse.json(
                { error: 'Invalid contact type. Must be "email" or "whatsapp".' },
                { status: 400 }
            );
        }

        // Validation
        if (contactType === 'email') {
            if (!EMAIL_REGEX.test(contactValue)) {
                return NextResponse.json(
                    { error: 'Please enter a valid email address.' },
                    { status: 400 }
                );
            }
            contactValue = contactValue.toLowerCase();
        } else if (contactType === 'whatsapp') {
            const digits = contactValue.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 13) {
                return NextResponse.json(
                    { error: 'Please enter a valid 10-digit mobile number.' },
                    { status: 400 }
                );
            }
            contactValue = normalisePhone(contactValue);
        }

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

        const supabase = createAdminClient();
        const { error } = await supabase
            .from('maintenance_subscribers')
            .upsert({
                contact_type: contactType,
                contact_value: contactValue,
                status: 'pending',
                ip_address: ip.slice(0, 100),
            }, {
                onConflict: 'contact_type,contact_value',
                ignoreDuplicates: false,
            });

        if (error) {
            console.error('[Maintenance:Subscribe] DB Error:', error.message);
            return NextResponse.json(
                { error: 'Could not record your notification request. Please try again later.' },
                { status: 500 }
            );
        }

        // Fire-and-forget confirmation notification
        sendSubscriberConfirmation({ contactType, contactValue }).catch(err => {
            console.warn('[Maintenance:Subscribe] Confirmation dispatch failed:', err.message);
        });

        return NextResponse.json({
            success: true,
            message: `Thank you! We will notify you via ${contactType === 'whatsapp' ? 'WhatsApp' : 'Email'} the moment we are back online.`,
        });
    } catch (err) {
        console.error('[Maintenance:Subscribe] Unexpected error:', err);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
