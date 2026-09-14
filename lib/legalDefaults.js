/**
 * Shared legal document defaults (seed content).
 * Admin edits in `legal_documents` always take precedence at runtime.
 */
export const LEGAL_SLUGS = ['terms','privacy','shipping','product','refund','kyc_terms'];
export const LEGAL_META = {
    terms: { title: 'Terms and Conditions', label: 'Terms & Conditions' },
    privacy: { title: 'Privacy Policy', label: 'Privacy Policy' },
    shipping: { title: 'Shipping & Delivery Policy', label: 'Shipping & Delivery' },
    product: { title: 'Product Policy', label: 'Product Policy' },
    refund: { title: 'Refund Policy', label: 'Refund Policy' },
    kyc_terms: { title: 'KYC Verification - Terms & Consent', label: 'KYC Terms' },
};
export const LEGAL_DEFAULTS = {
    terms: { title: 'Terms and Conditions', version: 'v1.0',
        effectiveFrom: '2026-03-31T00:00:00+05:30',
        body: "Welcome to Intrust India (operated by Intrust Financial Services (India) Pvt. Ltd.). "
        + "By accessing our platform, you agree to be bound by these Terms and Conditions.\n\n"
        + "## 1. Account Responsibility\n\nCustomers are solely responsible for maintaining the confidentiality "
        + "of their login details (Username, Password, OTPs) and all activities performed under their account. "
        + "Intrust will not be liable for any loss resulting from unauthorized access due to user negligence.\n\n"
        + "## 2. Payments & Transactions\n\nAll payments must be made through authorized channels only "
        + "(UPI, Credit/Debit Cards, NetBanking). While we ensure a secure gateway, we are not liable for "
        + "transaction failures or delays caused by bank-side technical issues, server downtimes, or network congestion.\n\n"
        + "## 3. User Conduct & Termination\n\nAny fraudulent, abusive, or illegal activity will lead to immediate "
        + "account termination and reporting to the appropriate authorities.\n\n"
        + "## 4. Force Majeure\n\nWe are not responsible for service delays or failures caused by unforeseen events "
        + "beyond our control, such as strikes, natural disasters, pandemics, or government-mandated internet outages." },
    privacy: { title: 'Privacy Policy', version: 'v1.0',
        effectiveFrom: '2026-01-10T00:00:00+05:30',
        body: "At Intrust India, we take your privacy seriously. "
        + "This policy dictates how we collect, use, and protect your personal data.\n\n"
        + "## 1. Information Collection\n\nWe collect information you provide during registration, KYC processing, "
        + "and transactions: name, email, phone, government ID data, payment details.\n\n"
        + "## 2. Use of Information\n\nWe use your data to process transactions, verify identity per RBI guidelines, "
        + "prevent fraud, and support you. We do not sell personal data.\n\n"
        + "## 3. Data Security\n\nIndustry-standard encryption and secure server architectures protect your information." },
    shipping: { title: 'Shipping & Delivery Policy', version: 'v1.0',
        effectiveFrom: '2026-03-31T00:00:00+05:30',
        body: "Intrust India delivery window: 3-7 business days.\n\n## 1. Dispatch & Tracking\n\nTracking ID via SMS/Email.\n\n## 2. Delivery Attempts\n\nUp to 2-3 attempts; failed deliveries may incur a return fee.\n\n## 3. Customer Responsibility\n\nProvide a correct address and active contact number.\n\n> Do NOT accept parcels with tampered packaging." },
    product: { title: 'Product Policy', version: 'v1.0',
        effectiveFrom: '2026-03-31T00:00:00+05:30',
        body: "## 1. Quality Assurance\n\nAll Intrust India items are QC-checked.\n\n## 2. Standards\n\nProducts meet Indian safety standards.\n\n## 3. Images\n\nMinor color/packaging variations may occur.\n\n## 4. Availability & Warranty\n\nSubject to stock; warranty per Brand/Manufacturer or Seller." },
    refund: { title: 'Refund Policy', version: 'v1.0',
        effectiveFrom: '2026-01-05T00:00:00+05:30',
        body: "## 1. Digital Gift Cards\n\nFinal and non-refundable once delivered.\n\n## 2. Failed Transactions\n\nAuto-refunded in 3-5 business days.\n\n## 3. Subscriptions\n\nCurrent cycle non-refundable; cancel anytime." },
    kyc_terms: { title: 'KYC Verification - Terms & Consent', version: 'v1.0',
        effectiveFrom: '2026-03-31T00:00:00+05:30',
        body: "Welcome to Intrust India (operated by Intrust Financial Services (India) Pvt. Ltd.). Acceptance is recorded as a signed digital agreement.\n\n## 1. Purpose\n\nIdentity details verify you, meet RBI/PMLA obligations, prevent fraud.\n\n## 2. Accuracy\n\nAll details must be true and yours; false documents lead to rejection and reporting.\n\n## 3. PAN Verification\n\nYou authorise sharing PAN, name, DOB with our verification partner for this check only.\n\n## 4. Storage\n\nPAN is encrypted and masked; PDFs live in private storage on Indian servers.\n\n## 5. Consent Record\n\nWe record name, masked PAN, version, timestamp, IP, device, and PDF hash as your signature.\n\n## 6. Responsibility\n\nKeep logins and OTPs confidential.\n\n## 7. Outcomes\n\nInstant or manual review (usually 24 hrs).\n\n## 8. Grievances\n\nContact info@intrustindia.com or 18002030052." },
};
