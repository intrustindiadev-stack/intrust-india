/**
 * SprintVerify Service (Real Implementation)
 * 
 * Integration with SprintVerify PAN Advanced API.
 */

class SprintVerifyService {
    constructor() {
        // Base URL from env or default to UAT
        // User should set SPRINT_VERIFY_BASE_URL to 'https://uat.paysprint.in/sprintverify-uat/api/v1' 
        // or 'https://api.paysprint.in/nm/api/v1' (Live)
        this.baseUrl = process.env.SPRINT_VERIFY_BASE_URL || 'https://uat.paysprint.in/sprintverify-uat/api/v1';

        this.jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
        this.authorizedKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
        this.maxRetries = 3; // Maximum retry attempts
        this.baseDelay = 1000; // Base delay in milliseconds (1 second)
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
     * Endpoint: /verification/pan_advanced (Assumed from docs)
     * @param {string} panNumber 
     * @returns {Promise<{valid: boolean, data: any, message: string}>}
     */
    async verifyPAN(panNumber) {
        if (!this.jwtKey || !this.authorizedKey) {
            console.error('Missing SprintVerify Keys');
            return { valid: false, message: 'Server Configuration Error: Missing Keys' };
        }

        const refId = String(Math.floor(Math.random() * 1000000) + Date.now());

        const makeRequest = async () => {
            console.log(`[SprintVerify] Verifying PAN: ${panNumber}`);

            // SprintVerify API endpoints (correct format from documentation)
            const endpoints = [
                `${this.baseUrl}/verification/pan-advance`,
                `${this.baseUrl}/api/v1/verification/pan-advance`
            ];

            let lastError;
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`[SprintVerify] Trying endpoint: ${endpoint}`);
                    
                    // SprintVerify API payload formats (from documentation)
                    const payloads = [
                        { refid: refId, pannumber: panNumber }
                    ];

                    for (const payload of payloads) {
                        try {
                            console.log(`[SprintVerify] Trying payload:`, payload);
                            
                            const response = await fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                    'Token': this.jwtKey,
                                    'authorisedkey': this.authorizedKey
                                },
                                body: JSON.stringify(payload)
                            });

                            console.log(`[SprintVerify] Response status: ${response.status} for ${endpoint} with payload`, payload);

                            if (response.ok) {
                                const data = await response.json();
                                console.log('[SprintVerify] Response:', JSON.stringify(data));
                                return { response, data };
                            } else {
                                lastError = `HTTP ${response.status}: ${response.statusText}`;
                                console.log(`[SprintVerify] Failed: ${lastError}`);
                            }
                        } catch (error) {
                            lastError = error.message;
                            console.log(`[SprintVerify] Error: ${error.message}`);
                        }
                    }
                } catch (error) {
                    lastError = error.message;
                    console.log(`[SprintVerify] Error: ${error.message}`);
                }
            }
            
            throw new Error(`All endpoints failed. Last error: ${lastError}`);
        };

        try {
            const { response, data } = await this.retryWithBackoff(makeRequest);
            
            // Check response status
            // SprintVerify returns: statuscode 201, status: true/false
            if (data.statuscode === 201 && data.status === true) {
                return {
                    valid: true,
                    message: data.message || 'PAN Verified Successfully',
                    data: {
                        full_name: data.full_name,
                        first_name: data.first_name,
                        last_name: data.last_name,
                        dob: data.dob,
                        gender: data.gender,
                        ref_id: data.reference_id || data.refid,
                        raw: data
                    }
                };
            } else {
                return {
                    valid: false,
                    message: data.message || 'Verification Failed',
                    data: data
                };
            }
        } catch (error) {
            console.error('[SprintVerify] All retry attempts failed:', error);
            return {
                valid: false,
                message: 'External Verification Service Unavailable after multiple attempts',
                error: error.message
            };
        }
    }

    /**
     * Verify Document (Placeholder for Future Implementation)
     * Since we only have PAN details now, we just mock this part for the file upload flow
     * so it doesn't break the submission.
     */
    async verifyDocument(fileUrl, type) {
        // Just return true to allow the flow to proceed
        return { valid: true, message: 'Document uploaded successfully' };
    }
}

export const sprintVerify = new SprintVerifyService();
