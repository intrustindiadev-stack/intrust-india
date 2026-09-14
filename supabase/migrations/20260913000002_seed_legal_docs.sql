INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('terms','Terms and Conditions','Welcome to Intrust India (operated by Intrust Financial Services (India) Pvt. Ltd.). By accessing our platform, you agree to be bound by these Terms and Conditions.

## 1. Account Responsibility

Customers are solely responsible for maintaining the confidentiality of their login details (Username, Password, OTPs) and all activities performed under their account. Intrust will not be liable for any loss resulting from unauthorized access due to user negligence.

## 2. Payments & Transactions

All payments must be made through authorized channels only (UPI, Credit/Debit Cards, NetBanking). While we ensure a secure gateway, we are not liable for transaction failures or delays caused by bank-side technical issues, server downtimes, or network congestion.

## 3. User Conduct & Termination

Any fraudulent, abusive, or illegal activity will lead to immediate account termination and reporting to the appropriate authorities.

## 4. Force Majeure

We are not responsible for service delays or failures caused by unforeseen events beyond our control, such as strikes, natural disasters, pandemics, or government-mandated internet outages.','v1.0',true,'2026-03-31T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('privacy','Privacy Policy','At Intrust India, we take your privacy seriously. This policy dictates how we collect, use, and protect your personal data.

## 1. Information Collection

We collect information you provide during registration, KYC processing, and transactions: name, email, phone, government ID data, payment details.

## 2. Use of Information

We use your data to process transactions, verify identity per RBI guidelines, prevent fraud, and support you. We do not sell personal data.

## 3. Data Security

Industry-standard encryption and secure server architectures protect your information.','v1.0',true,'2026-01-10T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('shipping','Shipping & Delivery Policy','Intrust India delivery window: 3-7 business days.

## 1. Dispatch & Tracking

Tracking ID via SMS/Email.

## 2. Delivery Attempts

Up to 2-3 attempts; failed deliveries may incur a return fee.

## 3. Customer Responsibility

Provide a correct address and active contact number.

> Do NOT accept parcels with tampered packaging.','v1.0',true,'2026-03-31T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('product','Product Policy','## 1. Quality Assurance

All Intrust India items are QC-checked.

## 2. Standards

Products meet Indian safety standards.

## 3. Images

Minor color/packaging variations may occur.

## 4. Availability & Warranty

Subject to stock; warranty per Brand/Manufacturer or Seller.','v1.0',true,'2026-03-31T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('refund','Refund Policy','## 1. Digital Gift Cards

Final and non-refundable once delivered.

## 2. Failed Transactions

Auto-refunded in 3-5 business days.

## 3. Subscriptions

Current cycle non-refundable; cancel anytime.','v1.0',true,'2026-01-05T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
INSERT INTO public.legal_documents (slug,title,body_markdown,version,is_active,effective_from) VALUES ('kyc_terms','KYC Verification - Terms and Consent','Welcome to Intrust India (operated by Intrust Financial Services (India) Pvt. Ltd.). Acceptance is recorded as a signed digital agreement.

## 1. Purpose

Identity details verify you, meet RBI/PMLA obligations, prevent fraud.

## 2. Accuracy

All details must be true and yours; false documents lead to rejection and reporting.

## 3. PAN Verification

You authorise sharing PAN, name, DOB with our verification partner for this check only.

## 4. Storage

PAN is encrypted and masked; PDFs live in private storage on Indian servers.

## 5. Consent Record

We record name, masked PAN, version, timestamp, IP, device, and PDF hash as your signature.

## 6. Responsibility

Keep logins and OTPs confidential.

## 7. Outcomes

Instant or manual review (usually 24 hrs).

## 8. Grievances

Contact info@intrustindia.com or 18002030052.','v1.0',true,'2026-03-31T00:00:00+05:30') ON CONFLICT (slug,version) DO NOTHING;
