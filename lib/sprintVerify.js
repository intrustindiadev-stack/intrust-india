/**
 * SprintVerify Service 
 * 
 * Integration with SprintVerify PAN Advanced API.
 */

import jwt from 'jsonwebtoken';

class SprintVerifyService {
    constructor() {
        // Base URL from env or default to UAT
        // User should set SPRINT_VERIFY_BASE_URL to 'https://uat.paysprint.in/sprintverify-uat/api/v1' 
        // or 'https://api.paysprint.in/api/v1' (Live)
        this.baseUrl = process.env.SPRINT_VERIFY_BASE_URL || 'https://uat.paysprint.in/sprintverify-uat/api/v1';

        this.jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
        this.authorizedKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
        this.partnerId = process.env.SPRINT_VERIFY_PARTNER_ID;
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
            reqid: Date.now().toString()
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
     * Endpoint: /verification/pan_advanced
     * @param {string} panNumber 
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
     */
    async verifyPAN(panNumber) {
        return this._callVerificationAPI('/verification/pan_verify', { pannumber: panNumber }, (data) => ({
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
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
     */
    async verifyGSTIN(gstin) {
        // According to docs, endpoint is /verification/gstinv2 or /verification/gstin
        // Payload: { gstin: "..." }
        return this._callVerificationAPI('/verification/gstinv2', { gstin }, (data) => ({
            trade_name: data.trade_name || data.legal_name,
            legal_name: data.legal_name,
            status: data.status,
            address: data.address, // Might be nested, depends on exact response
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }

    /**
     * Verify Bank Account (Penny Drop)
     * Endpoint: /verification/bank_account
     * @param {string} account 
     * @param {string} ifsc 
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
     */
    async verifyBank(account, ifsc) {
        return this._callVerificationAPI('/verification/bank_account', { account, ifsc }, (data) => ({
            account_name: data.beneficiary_name || data.account_name, // Adjust based on actual response
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
            // Support both UAT and Prod structures if needed, but usually base URL covers it
            // We'll try the base URL + suffix
            // e.g. https://uat.paysprint.in/sprintverify-uat/api/v1/verification/pan-advance

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

            // Standardize success check
            // Most SprintVerify APIs return { status: true, statuscode: 201, message: "..." }
            // Some might differ, but this is the common pattern
            const isSuccess = (data.status === true || data.status === 'success') && (data.statuscode === 201 || data.response_code === 1);

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
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
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

    /**
     * Face Match Verification
     * Endpoint: /verification/face_match
     * @param {string} image1 - Base64 string of face 1
     * @param {string} image2 - Base64 string of face 2
     * @param {string} threshold - Confidence threshold (default "0.5")
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
     */
    async faceMatch(image1, image2, threshold = "0.5") {
        const payload = { threshold };

        // Detect if image1/image2 are URLs or base64
        if (image1.startsWith('http')) payload.image1_url = image1;
        else payload.image1 = image1;

        if (image2.startsWith('http')) payload.image2_url = image2;
        else payload.image2 = image2;

        return this._callVerificationAPI('/verification/face_match', payload, (data) => ({
            score: data.score || data.match_score,
            is_match: data.match === true || (data.score && parseFloat(data.score) > parseFloat(threshold)),
            ref_id: data.reference_id || data.refid,
            raw: data
        }));
    }
}

export const sprintVerify = new SprintVerifyService();
