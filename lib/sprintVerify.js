/**
 * SprintVerify Service 
 * 
 * Integration with SprintVerify PAN Advanced API.
 */

import jwt from 'jsonwebtoken';

class SprintVerifyService {
    constructor() {
        // Base URL from env or default to UAT
        // UAT:  'https://uat.paysprint.in/sprintverify-uat/api/v1'
        // LIVE: 'https://api.paysprint.in/api/v1'
        this.baseUrl = process.env.SPRINT_VERIFY_BASE_URL || 'https://uat.paysprint.in/sprintverify-uat/api/v1';

        this.jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
        this.authorizedKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
        this.partnerId = process.env.SPRINT_VERIFY_PARTNER_ID;

        // Warn in development if keys are missing
        if (process.env.NODE_ENV !== 'production') {
            if (!this.jwtKey || !this.authorizedKey || !this.partnerId) {
                console.warn('[SprintVerify] WARNING: Missing environment variables (SPRINT_VERIFY_JWT_KEY, SPRINT_VERIFY_AUTHORIZED_KEY, or SPRINT_VERIFY_PARTNER_ID). KYC verification will fail.');
            }
        }

        this.maxRetries = 3; // Maximum retry attempts
        this.baseDelay = 1000; // Base delay in milliseconds (1 second)
    }

    /**
     * Generate dynamic JWT for SprintVerify API requests
     * @returns {string} Generated JWT token
     */
    _generateToken() {
        if (!this.jwtKey || !this.partnerId) return null;

        const timestamp = Math.floor(Date.now() / 1000);
        const payload = {
            timestamp: timestamp,
            partnerId: this.partnerId,
            reqid: Date.now().toString() // Unique per-request identifier
        };

        // SprintVerify expects HS256 signature
        return jwt.sign(payload, this.jwtKey, { algorithm: 'HS256' });
    }

    /**
     * Retry mechanism with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} retries - Number of retries remaining
     * @param {number} delay - Current delay in milliseconds
     * @returns {Promise} Result of the function
     */
    async retryWithBackoff(fn, retries = this.maxRetries, delay = this.baseDelay) {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) {
                throw error;
            }

            console.warn(`[SprintVerify] Retry attempt ${this.maxRetries - retries + 1} failed. Retrying in ${delay}ms...`, error.message);

            // Wait for the delay
            await new Promise(resolve => setTimeout(resolve, delay));

            // Exponential backoff: delay doubles each time
            return this.retryWithBackoff(fn, retries - 1, delay * 2);
        }
    }

    /**
     * Verify PAN Number
     * 
     * Endpoint varies by environment:
     *   - UAT:  /verification/pan_verify
     *   - LIVE: /verification/pan_advanced
     * 
     * The correct endpoint is determined by SPRINT_VERIFY_BASE_URL.
     * UAT base URL uses pan_verify; production base URL uses pan_advanced.
     * Currently configured for UAT (/pan_verify). Switch to /pan_advanced for production.
     * 
     * @param {string} panNumber 
     * @returns {Promise<{valid: boolean, data: unknown, message: string}>}
     */
    async verifyPAN(panNumber) {
        // UAT endpoint: /verification/pan_verify
        // Production endpoint: /verification/pan_advanced
        const isProduction = this.baseUrl.includes('api.paysprint.in');
        const endpoint = isProduction ? '/verification/pan_advanced' : '/verification/pan_verify';

        return this._callVerificationAPI(endpoint, { pannumber: panNumber }, (data) => ({
            full_name: data.full_name,
            first_name: data.first_name,
            last_name: data.last_name,
            dob: data.dob,
            gender: data.gender,
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }

    /**
     * Verify GSTIN
     * Endpoint: /verification/gstinv2
     * @param {string} gstin 
     * @returns {Promise<{valid: boolean, data: unknown, message: string}>}
     */
    async verifyGSTIN(gstin) {
        return this._callVerificationAPI('/verification/gstinv2', { gstin }, (data) => ({
            trade_name: data.trade_name || data.legal_name,
            legal_name: data.legal_name,
            status: data.status,
            address: data.address,
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }

    /**
     * Verify Bank Account (Penny Drop)
     * Endpoint: /verification/bank_account
     * @param {string} account 
     * @param {string} ifsc 
     * @returns {Promise<{valid: boolean, data: unknown, message: string}>}
     */
    async verifyBank(account, ifsc) {
        return this._callVerificationAPI('/verification/bank_account', { account, ifsc }, (data) => ({
            account_name: data.beneficiary_name || data.account_name,
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }

    /**
     * Helper to call SprintVerify APIs
     * Handles authentication, retries, and standard response parsing
     */
    async _callVerificationAPI(endpointSuffix, payload, dataMapper) {
        if (!this.jwtKey || !this.authorizedKey || !this.partnerId) {
            console.error('Missing SprintVerify Keys or Partner ID');
            return { valid: false, message: 'Server Configuration Error: Missing Keys' };
        }

        const refId = String(Math.floor(Math.random() * 1000000) + Date.now());
        const fullPayload = { ...payload, refid: refId };

        const makeRequest = async () => {
            // Clean double slashes just in case
            const url = `${this.baseUrl.replace(/\/+$/, '')}/${endpointSuffix.replace(/^\/+/, '')}`;
            const token = this._generateToken();

            console.log(`[SprintVerify] Calling ${url}`, fullPayload);
            console.log(`[SprintVerify] Headers:`, {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Token': token ? '*** (Dynamic JWT)' : 'MISSING',
                'authorisedkey': this.authorizedKey ? '***' : 'MISSING'
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Token': token,
                    'authorisedkey': this.authorizedKey
                },
                body: JSON.stringify(fullPayload)
            });

            console.log(`[SprintVerify] Response Status: ${response.status}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[SprintVerify] Response Error Text: ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            return data;
        };

        try {
            const data = await this.retryWithBackoff(makeRequest);
            console.log(`[SprintVerify] Response from ${endpointSuffix}:`, JSON.stringify(data));

            // SprintVerify success check:
            // PAN API returns { status: true, response_code: 1, statuscode: 200 }
            // Other APIs may return statuscode: 201
            const isSuccess = data.status === true && (data.response_code === 1 || data.statuscode === 200 || data.statuscode === 201);

            if (isSuccess) {
                return {
                    valid: true,
                    message: data.message || 'Verified Successfully',
                    data: dataMapper ? dataMapper(data) : data
                };
            } else {
                return {
                    valid: false,
                    message: data.message || 'Verification Failed',
                    data: data
                };
            }
        } catch (error) {
            console.error(`[SprintVerify] Error calling ${endpointSuffix}:`, error);
            // Don't block user on network/api failure, allow manual review
            return {
                valid: 'manual_review',
                message: 'Verification Service Unavailable',
                error: error.message
            };
        }
    }
    /**
     * OCR Document Verification
     * Endpoint: /verification/ocr_doc
     * @param {string} file - Base64 string of the image
     * @param {string} type - Type of document (PAN, AADHAR, VOTERID, etc.)
     * @param {string} [link] - Optional URL to the image
     * @returns {Promise<{valid: boolean, data: unknown, message: string}>}
     */
    async ocrDoc(file, type = 'PAN', link = '') {
        const payload = { type };
        if (file) payload.file = file;
        if (link) payload.link = link;

        return this._callVerificationAPI('/verification/ocr_doc', payload, (data) => ({
            details: data.details || data.data,
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }
}

export const sprintVerify = new SprintVerifyService();
