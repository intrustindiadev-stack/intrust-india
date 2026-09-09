import 'server-only';
import nodemailer from 'nodemailer';
import { getEmailConfig, validateEmailConfig } from './emailConfig.js';

/**
 * lib/email/mailClient.js
 *
 * Centralized Nodemailer SMTP client for InTrust India.
 * Handles lazy initialization, connection caching, timeouts, and safe verification.
 */

/** @type {import('nodemailer').Transporter | null} */
let _cachedTransporter = null;

/**
 * Return cached nodemailer transporter or create one lazily.
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {import('nodemailer').Transporter}
 */
export function getMailTransporter({ forceRefresh = false } = {}) {
    if (_cachedTransporter && !forceRefresh) {
        return _cachedTransporter;
    }

    const config = validateEmailConfig(getEmailConfig());

    _cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.auth.user,
            pass: config.auth.pass,
        },
        connectionTimeout: config.timeouts.connectionTimeout,
        greetingTimeout: config.timeouts.greetingTimeout,
        socketTimeout: config.timeouts.socketTimeout,
    });

    return _cachedTransporter;
}

/**
 * Reset cached transporter (useful for testing or dynamic credential rotation).
 */
export function resetMailTransporter() {
    if (_cachedTransporter) {
        try {
            _cachedTransporter.close();
        } catch {
            // ignore close error
        }
        _cachedTransporter = null;
    }
}

/**
 * Safely verify SMTP connection handshake and authentication without leaking credentials.
 *
 * @returns {Promise<{ success: boolean, message?: string, error?: string, code?: string }>}
 */
export async function verifySmtpConnection() {
    try {
        const transporter = getMailTransporter();
        await transporter.verify();
        return {
            success: true,
            message: 'SMTP connection and authentication verified successfully',
        };
    } catch (err) {
        const error = /** @type {Error & { code?: string }} */ (err);
        return {
            success: false,
            error: error.message || 'Unknown SMTP connection error',
            code: error.code || 'ERR_SMTP_VERIFY_FAILED',
        };
    }
}
