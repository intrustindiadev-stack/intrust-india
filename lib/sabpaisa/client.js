import { sabpaisaConfig as SABPAISA_CONFIG } from './config';
import { encrypt, decrypt } from './encrypt';
import { mapStatusToInternal } from './utils';

class SabpaisaClient {
    constructor() {
        this.config = SABPAISA_CONFIG;
    }

    /**
     * Initiates a payment request to Sabpaisa.
     * @param {object} paymentData
     * @returns {object} { url, encData, clientCode }
     */
    async initiatePayment(paymentData) {
        const { amount, payerName, payerEmail, payerMobile, clientTxnId } = paymentData;

        // Ensure amount is formatted to 2 decimal places string
        // Construct payload parameters exactly as the official sabpaisa-pg-dev npm package does
        // It uses URLSearchParams.toString() which applies URL encoding to all values including callbackUrl
        const params = new URLSearchParams({
            payerName: payerName || 'Guest',
            payerEmail: payerEmail || 'NA',
            payerMobile: paymentData.payerMobile || '9999999999',
            clientTxnId: clientTxnId,
            amount: formattedAmount,
            clientCode: this.config.clientCode,
            transUserName: this.config.username,
            transUserPassword: this.config.password,
            callbackUrl: this.config.callbackUrl,
            channelId: 'W',
            udf1: paymentData.udf1 || '',
            udf2: paymentData.udf2 || '',
            udf3: paymentData.udf3 || '',
            udf4: paymentData.udf4 || '',
            udf5: paymentData.udf5 || '',
            udf6: paymentData.udf6 || '',
            udf7: paymentData.udf7 || '',
            udf8: paymentData.udf8 || '',
            udf9: paymentData.udf9 || '',
            udf10: paymentData.udf10 || '',
            udf11: paymentData.udf11 || '',
            udf12: paymentData.udf12 || '',
            udf13: paymentData.udf13 || '',
            udf14: paymentData.udf14 || '',
            udf15: paymentData.udf15 || '',
            udf16: paymentData.udf16 || '',
            udf17: paymentData.udf17 || '',
            udf18: paymentData.udf18 || '',
            udf19: paymentData.udf19 || '',
            udf20: paymentData.udf20 || '',
            // Explicit empty fields from npm package
            payerVpa: '',
            modeTransfer: '',
            byPassFlag: '',
            cardHolderName: '',
            pan: '',
            cardExpMonth: '',
            cardExpYear: '',
            cardType: '',
            cvv: '',
            browserDetails: '',
            bankId: ''
        });

        const rawQueryStr = params.toString();
        // Omit passwords/PII from logs
        console.log('[Sabpaisa] Encrypting Payload Format:', rawQueryStr.replace(/=(.*?)(&|$)/g, '=***$2').substring(0, 100) + '...');

        const encryptedData = encrypt(rawQueryStr);

        if (!encryptedData) {
            throw new Error('Encryption failed');
        }

        const cleanClientCode = (this.config.clientCode || '').trim();

        return {
            url: this.config.baseUrl + this.config.endpoints.payment,
            encData: encryptedData,
            clientCode: cleanClientCode
        };
    }

    /**
     * Decrypts and parses the callback/webhook response from Sabpaisa.
     * @param {string} encryptedResponse - Hex-encoded encrypted response
     * @returns {object | null} Parsed response with internalStatus
     */
    parseResponse(encryptedResponse) {
        try {
            const decryptedString = decrypt(encryptedResponse);

            if (!decryptedString) throw new Error('Decryption failed');

            // The response is a query string
            const params = new URLSearchParams(decryptedString);

            const result = {
                clientTxnId: params.get('clientTxnId'),
                sabpaisaTxnId: params.get('sabpaisaTxnId') || params.get('transId'),
                amount: params.get('amount'),
                paidAmount: params.get('paidAmount'),
                status: params.get('status'), // SUCCESS, FAILED, ABORTED, PENDING
                statusCode: params.get('statusCode'),
                paymentMode: params.get('paymentMode'),
                bankName: params.get('bankName'),
                message: params.get('transMsg') || params.get('sabpaisaMessage'),
                bankTxnId: params.get('bankTxnId'),
                rrn: params.get('rrn')
            };

            return {
                ...result,
                internalStatus: mapStatusToInternal(result.statusCode || result.status)
            };

        } catch (error) {
            console.error('Error parsing Sabpaisa response:', error);
            return null;
        }
    }

    /**
     * Verifies a transaction status with Sabpaisa server-to-server
     * using the Transaction Enquiry API.
     *
     * @param {string} clientTxnId - The client transaction ID to verify
     * @returns {object} Parsed transaction status response
     */
    async verifyTransaction(clientTxnId) {
        try {
            // 1. Build the query string to encrypt
            const queryStr = `clientCode=${this.config.clientCode}&clientTxnId=${clientTxnId}`;

            // 2. Encrypt using the same encrypt function
            const statusTransEncData = encrypt(queryStr);

            if (!statusTransEncData) {
                throw new Error('Failed to encrypt status inquiry payload');
            }

            // 3. POST to the status inquiry endpoint
            const statusUrl = this.config.baseUrl + this.config.endpoints.status;

            const response = await fetch(statusUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientCode: this.config.clientCode,
                    statusTransEncData: statusTransEncData
                })
            });

            if (!response.ok) {
                throw new Error(`Status inquiry failed with HTTP ${response.status}`);
            }

            const jsonResponse = await response.json();

            // 4. Decrypt the statusResponseData field
            if (!jsonResponse.statusResponseData) {
                console.error('[Sabpaisa] Status inquiry returned no statusResponseData:', jsonResponse);
                return {
                    status: 'ERROR',
                    message: 'No response data from gateway',
                    raw: jsonResponse
                };
            }

            const decryptedString = decrypt(jsonResponse.statusResponseData);

            if (!decryptedString) {
                throw new Error('Failed to decrypt status response');
            }

            // 5. Parse the decrypted query string
            const params = new URLSearchParams(decryptedString);

            const result = {
                clientTxnId: params.get('clientTxnId'),
                sabpaisaTxnId: params.get('sabpaisaTxnId'),
                amount: params.get('amount'),
                paidAmount: params.get('paidAmount'),
                status: params.get('status'),
                statusCode: params.get('statusCode'),
                responseCode: params.get('responseCode'),
                paymentMode: params.get('paymentMode'),
                bankName: params.get('bankName'),
                message: params.get('sabpaisaMessage'),
                bankTxnId: params.get('bankTxnId'),
                rrn: params.get('rrn'),
                transDate: params.get('transDate'),
                settlementStatus: params.get('settlementStatus'),
                refundStatusCode: params.get('refundStatusCode')
            };

            return {
                ...result,
                internalStatus: mapStatusToInternal(result.statusCode || result.status)
            };

        } catch (error) {
            console.error('[Sabpaisa] Transaction verification error:', error);
            return {
                status: 'ERROR',
                message: error.message,
                internalStatus: 'PENDING' // Safe default — don't mark as FAILED on network error
            };
        }
    }
}

export default new SabpaisaClient();
