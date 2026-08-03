import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { sendTemplateMessage, OmniflowError } from '@/lib/omniflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * POST /api/whatsapp/send-template
 * 
 * Body:
 * {
 *   recipientType: 'contact' | 'custom_number',
 *   contactId?: string,
 *   phoneE164?: string,
 *   templateId: string,
 *   templateName: string,
 *   templateLanguage?: string,
 *   variables?: Record<string, string>
 * }
 */
export async function POST(request) {
    try {
        // 1. Authenticate user
        let user = null;
        const authHeader = request.headers.get('Authorization');

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const tempSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user: authUser } } = await tempSupabase.auth.getUser(token);
            user = authUser;
        }

        if (!user) {
            try {
                const supabaseClient = await createServerSupabaseClient();
                const { data: { user: sessionUser } } = await supabaseClient.auth.getUser();
                user = sessionUser;
            } catch (err) {
                // Session error or cookie missing
            }
        }

        if (!user) {
            return NextResponse.json(
                { error: { type: 'unauthorized', message: 'Authentication required. Please log in.' } },
                { status: 401 }
            );
        }

        const agentId = user.id;

        // 2. Authorize user (check user profile / role)
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', agentId)
            .maybeSingle();

        const allowedRoles = ['relationship_exec', 'relationship_manager', 'admin', 'super_admin', 'employee'];
        if (profile?.role && !allowedRoles.includes(profile.role)) {
            return NextResponse.json(
                { error: { type: 'forbidden', message: 'You do not have permission to send WhatsApp templates.' } },
                { status: 403 }
            );
        }

        // 3. Parse and Validate Request Body
        const body = await request.json().catch(() => ({}));
        const {
            recipientType,
            contactId,
            phoneE164,
            templateId,
            templateName,
            templateLanguage = 'en',
            variables = {}
        } = body;

        const validationErrors = [];

        if (!['contact', 'custom_number'].includes(recipientType)) {
            validationErrors.push({ field: 'recipientType', message: 'recipientType must be "contact" or "custom_number".' });
        }

        if (!templateId || !templateName) {
            validationErrors.push({ field: 'templateId', message: 'templateId and templateName are required.' });
        }

        let targetPhone = '';
        let resolvedContactId = null;

        if (recipientType === 'contact') {
            if (!contactId) {
                validationErrors.push({ field: 'contactId', message: 'contactId is required when recipientType is "contact".' });
            } else {
                resolvedContactId = contactId;
                const { data: contact, error: contactError } = await adminClient
                    .from('crm_leads')
                    .select('id, full_name, phone')
                    .eq('id', contactId)
                    .maybeSingle();

                if (contactError || !contact) {
                    validationErrors.push({ field: 'contactId', message: 'Contact not found or invalid.' });
                } else if (!contact.phone) {
                    validationErrors.push({ field: 'contactId', message: 'Selected contact does not have a phone number.' });
                } else {
                    let cleanedPhone = contact.phone.trim();
                    if (!cleanedPhone.startsWith('+')) {
                        cleanedPhone = '+' + cleanedPhone.replace(/\D/g, '');
                    }
                    if (!E164_REGEX.test(cleanedPhone)) {
                        validationErrors.push({ field: 'contactId', message: `Contact phone number (${contact.phone}) is not in valid E.164 format.` });
                    } else {
                        targetPhone = cleanedPhone;
                    }
                }
            }
        } else if (recipientType === 'custom_number') {
            if (!phoneE164) {
                validationErrors.push({ field: 'phoneE164', message: 'phoneE164 is required when recipientType is "custom_number".' });
            } else {
                const cleanedPhone = phoneE164.trim();
                if (!E164_REGEX.test(cleanedPhone)) {
                    validationErrors.push({ field: 'phoneE164', message: 'Invalid phone number format. Must be E.164 (e.g. +919876543210).' });
                } else {
                    targetPhone = cleanedPhone;
                }
            }
        }

        if (validationErrors.length > 0) {
            return NextResponse.json(
                {
                    error: {
                        type: 'validation_error',
                        message: 'Validation failed for request parameters.',
                        details: validationErrors
                    }
                },
                { status: 400 }
            );
        }

        // 4. Build Omniflow components payload
        // Maps object variables { var1: 'val1', var2: 'val2' } into component parameter array
        const varValues = Object.values(variables);
        const components = varValues.length > 0 ? [
            {
                type: 'body',
                parameters: varValues.map((val) => ({
                    type: 'text',
                    text: String(val ?? '')
                }))
            }
        ] : [];

        const payloadSent = {
            phone: targetPhone,
            template_name: templateName,
            template_language: templateLanguage,
            variables
        };

        // 5. Call Omniflow Provider
        let sendResult = null;
        let providerMessageId = null;
        let logStatus = 'queued';
        let errorCode = null;
        let errorMessage = null;
        let sentAt = null;
        let failedAt = null;

        try {
            sendResult = await sendTemplateMessage(targetPhone, templateName, templateLanguage, components);
            providerMessageId = sendResult?.messageId || null;
            logStatus = 'sent';
            sentAt = new Date().toISOString();
        } catch (err) {
            logStatus = 'failed';
            failedAt = new Date().toISOString();
            errorMessage = err.message || 'Failed to send template message via Omniflow.';
            if (err instanceof OmniflowError) {
                errorCode = err.code || 'OMNIFLOW_ERROR';
            } else {
                errorCode = 'SEND_ERROR';
            }
        }

        // 6. Insert log into whatsapp_message_logs
        const { data: logEntry, error: logError } = await adminClient
            .from('whatsapp_message_logs')
            .insert({
                agent_id: agentId,
                contact_id: resolvedContactId,
                recipient_type: recipientType,
                recipient_phone_e164: targetPhone,
                template_id: templateId,
                template_name: templateName,
                template_language: templateLanguage,
                variables,
                payload_sent: payloadSent,
                provider_message_id: providerMessageId,
                status: logStatus,
                error_code: errorCode,
                error_message: errorMessage,
                sent_at: sentAt,
                failed_at: failedAt
            })
            .select('id')
            .single();

        if (logError) {
            console.error('[send-template] Error saving log to whatsapp_message_logs:', logError);
        }

        // 7. Return Response
        if (logStatus === 'failed') {
            return NextResponse.json(
                {
                    error: {
                        type: 'provider_error',
                        message: errorMessage || 'Failed to deliver message via provider.',
                        details: { errorCode, logId: logEntry?.id }
                    }
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            logId: logEntry?.id,
            status: logStatus,
            providerMessageId,
            recipientPhone: targetPhone
        }, { status: 200 });

    } catch (error) {
        console.error('[send-template] Internal server error:', error);
        return NextResponse.json(
            { error: { type: 'server_error', message: error.message || 'An unexpected error occurred.' } },
            { status: 500 }
        );
    }
}
