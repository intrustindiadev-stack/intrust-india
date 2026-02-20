import SABPAISA_CONFIG from './config';
import { encrypt, decrypt } from './encryption';
import { mapStatusToInternal } from './utils';

class SabpaisaClient {
    constructor() {
        this.config = SABPAISA_CONFIG;
    }

    /**
     * Initiates a payment reqeust to Sabpaisa.
     * @param {object} paymentData 
     * @returns {object} { url, encData, clientCode }
     */
    async initiatePayment(paymentData) {
        const { amount, payerName, payerEmail, payerMobile, clientTxnId } = paymentData;

        // Ensure amount is formatted to 2 decimal places string
        const formattedAmount = Number(amount).toFixed(2);

        // Current Date in format YYYY-MM-DD HH:mm:ss
        const now = new Date();
        const transDate = now.toISOString().replace('T', ' ').substring(0, 19);

        // Construct payload parameters for encryption
        const params = new URLSearchParams();
        params.append('clientCode', this.config.clientCode);
        params.append('transUserName', this.config.username);
        params.append('transUserPassword', this.config.password);
        params.append('clientTxnId', clientTxnId);
        params.append('amount', formattedAmount);
        params.append('amountType', 'INR');
        params.append('channelId', 'W'); // W = Web
        params.append('mcc', '5666'); // Merchant Category Code (Default or from config)
        params.append('transDate', transDate);
        params.append('payerName', payerName || 'Guest');
        params.append('payerEmail', payerEmail || 'NA');
        params.append('payerMobile', payerMobile || 'NA');
        params.append('payerAddress', 'NA'); // Default
        params.append('callbackUrl', this.config.callbackUrl);
        params.append('udf1', 'NA');
        params.append('udf2', 'NA');
        params.append('udf3', 'NA');
        params.append('udf4', 'NA');
        params.append('udf5', 'NA');

        // Create query string
        // URLSearchParams encodes spaces as '+'. 
        // We replace '+' with '%20' so decodeURIComponent turns them into actual spaces ' '.
        // This ensures transDate "YYYY-MM-DD HH:mm:ss" has a space, not a plus.
        const queryString = params.toString().replace(/\+/g, '%20');

        // Decode URI component to get back special chars but keep spaces as spaces
        const rawQueryStr = decodeURIComponent(queryString);

        console.log('Sabpaisa Raw Query String:', rawQueryStr);

        const encryptedData = encrypt(rawQueryStr);

        if (!encryptedData) {
            throw new Error('Encryption failed');
        }

        // Ensure proper string format
        const cleanClientCode = (this.config.clientCode || '').trim();

        return {
            url: this.config.baseUrl + this.config.endpoints.payment,
            encData: encryptedData,
            clientCode: cleanClientCode
        };
    }

    /**
     * Decrypts and parses the callback response from Sabpaisa.
     * @param {string} encryptedResponse 
     */
    parseResponse(encryptedResponse) {
        try {
            const decryptedString = decrypt(encryptedResponse);
            if (!decryptedString) throw new Error('Decryption failed');

            // The parsed response is usually a query string or JSON
            // Assuming query string for legacy gateways like Sabpaisa
            const params = new URLSearchParams(decryptedString);

            const result = {
                clientTxnId: params.get('clientTxnId'),
                sabpaisaTxnId: params.get('sabpaisaTxnId') || params.get('transId'),
                amount: params.get('amount'),
                status: params.get('status'), // SUCCESS, FAILED etc.
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
     * Verifies a transaction status with Sabpaisa server-to-server.
     * @param {string} clientTxnId 
     */
    async verifyTransaction(clientTxnId) {
        // Implement Status Inquiry API call
        // Usually involves sending checking status endpoint with client code and txn ID
        // Placeholder implementation
        return { status: 'PENDING', message: 'Not implemented yet' };
    }
}

export default new SabpaisaClient();
