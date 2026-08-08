const { normalizePhone, normalizeEmail, CrmLeadCsvRowSchema } = require('./lib/crm/validation');

console.log("=== 1. INDIAN PHONE NORMALIZATION TESTS ===");

const phoneTests = [
    { input: "+91 9876543210", expected: "9876543210", valid: true },
    { input: "+919876543210", expected: "9876543210", valid: true },
    { input: "98765 43210", expected: "9876543210", valid: true },
    { input: "9876543210", expected: "9876543210", valid: true },
    { input: "09876543210", expected: "9876543210", valid: true },
    { input: "1234567890", expected: "1234567890", valid: false }, // Starts with 1 -> Invalid Indian mobile
    { input: "987654321", expected: "987654321", valid: false },   // 9 digits -> Invalid
    { input: "invalid_phone", expected: "invalid_phone", valid: false }
];

phoneTests.forEach(t => {
    const norm = normalizePhone(t.input);
    const parsed = CrmLeadCsvRowSchema.safeParse({ contact_name: "Test", phone: t.input });
    const success = parsed.success && parsed.data.phone === t.expected;
    const isInvalidRejected = !t.valid && !parsed.success;

    if ((t.valid && success) || isInvalidRejected) {
        console.log(`[PASS] Input: "${t.input}" -> Normalized: "${parsed.data?.phone || 'REJECTED'}" (Valid: ${parsed.success})`);
    } else {
        console.log(`[FAIL] Input: "${t.input}" -> Normalized: "${parsed.data?.phone}" (Expected: ${t.expected}, Valid: ${parsed.success})`);
    }
});

console.log("\n=== 2. EMAIL TRIMMING & CASE NORMALIZATION TESTS ===");

const emailTests = [
    { input: "  test@example.com ", expected: "test@example.com" },
    { input: "TEST@EXAMPLE.COM", expected: "test@example.com" },
    { input: "  USER.NAME@Domain.Co.In ", expected: "user.name@domain.co.in" }
];

emailTests.forEach(t => {
    const norm = normalizeEmail(t.input);
    const parsed = CrmLeadCsvRowSchema.safeParse({ contact_name: "Test", email: t.input });
    if (parsed.success && parsed.data.email === t.expected) {
        console.log(`[PASS] Input: "${t.input}" -> Normalized: "${parsed.data.email}"`);
    } else {
        console.log(`[FAIL] Input: "${t.input}" -> Normalized: "${parsed.data?.email}" (Expected: ${t.expected})`);
    }
});

