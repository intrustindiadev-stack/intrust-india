/**
 * Sends an OTP via SMSIndiaHub HTTP API.
 * @param {string} phone - The recipient's phone number.
 * @param {string} otp - The OTP to send.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the SMS sending operation.
 */
export async function sendOTP(phone, otp) {
    try {
        const user = process.env.SMSINDIAHUB_USER;
        const password = process.env.SMSINDIAHUB_PASSWORD;
        const senderId = process.env.SMSINDIAHUB_SENDER_ID || 'INTRUS';
        const templateId = process.env.SMSINDIAHUB_TEMPLATE_ID || '1007579603405215069';

        // Construct the message - MUST MATCH DLT TEMPLATE EXACTLY
        // Template: Your OTP for secure login is ##Field##. Please do not share this code with anyone for your security INTRUST FINANCIAL SERVICE INDIA PVT. LTD. 18002030052
        const message = `Your OTP for secure login is ${otp}. Please do not share this code with anyone for your security INTRUST FINANCIAL SERVICE INDIA PVT. LTD. 18002030052`;

        // Construct the URL with query parameters
        const url = new URL('https://cloud.smsindiahub.in/vendorsms/pushsms.aspx');
        url.searchParams.append('user', user);
        url.searchParams.append('password', password);
        url.searchParams.append('msisdn', phone);
        url.searchParams.append('sid', senderId);
        url.searchParams.append('msg', message);
        url.searchParams.append('fl', '0');
        url.searchParams.append('gwid', '2');
        url.searchParams.append('templateid', templateId);

        console.log('Sending SMS to:', phone);

        // Make the request
        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        const responseText = await response.text();
        console.log('SMSIndiaHub Raw Response:', responseText);

        if (!response.ok) {
            console.error('SMSIndiaHub API Error:', response.status, responseText);
            return { success: false, error: `SMS API Error: ${response.status}` };
        }

        // Try to parse as JSON first (Provider often returns JSON on success)
        try {
            const data = JSON.parse(responseText);
            // Success: {"ErrorCode":"000","ErrorMessage":"Done"...}
            if (data.ErrorCode === '000') {
                return { success: true };
            }

            console.error('SMSIndiaHub returned error JSON:', data);
            return { success: false, error: data.ErrorMessage || 'SMS Provider Error' };

        } catch (e) {
            // Not JSON, fall back to text check
            // "Message Accepted" or ID usually means success
            const lowerRes = responseText.toLowerCase();
            if (lowerRes.includes('error') || lowerRes.includes('fail') || lowerRes.includes('invalid')) {
                console.error('SMSIndiaHub text error:', responseText);
                return { success: false, error: responseText };
            }
        }

        // Default to success if no error detected
        return { success: true };

    } catch (error) {
        console.error('Failed to send SMS:', error);
        return { success: false, error: error.message };
    }
}
