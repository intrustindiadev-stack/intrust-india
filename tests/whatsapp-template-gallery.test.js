const assert = require('assert');
const { normalizeTemplate } = require('../lib/whatsapp/templateAdapter');

console.log('--- Running WhatsApp Template Gallery Tests ---');

// Test 1: Template Normalization
const rawTemplate = {
    id: 'test_template_1',
    name: 'test_template',
    title: 'Test Template Title',
    text: 'Hello {{1}}, your order for {{2}} is confirmed.',
    variables: [
        { key: 'name', label: 'Customer Name', required: true, defaultFromContact: 'full_name' },
        { key: 'product', label: 'Product Name', required: true }
    ]
};

const normalized = normalizeTemplate(rawTemplate);
assert.strictEqual(normalized.id, 'test_template_1');
assert.strictEqual(normalized.title, 'Test Template Title');
assert.strictEqual(normalized.status, 'APPROVED');
assert.strictEqual(normalized.variables.length, 2);

// Check variable properties
assert.strictEqual(normalized.variables[0].key, 'name');
assert.strictEqual(normalized.variables[0].placeholderToken, '{{1}}');
assert.strictEqual(normalized.variables[0].required, true);

assert.strictEqual(normalized.variables[1].key, 'product');
assert.strictEqual(normalized.variables[1].placeholderToken, '{{2}}');

console.log('✔ Test 1 Passed: Template Normalization works as expected.');

// Test 2: Unapproved template filtering logic
const unapprovedTemplate = {
    id: 'unapproved_1',
    name: 'unapproved',
    status: 'REJECTED'
};

const normalizedUnapproved = normalizeTemplate(unapprovedTemplate);
assert.strictEqual(normalizedUnapproved.status, 'REJECTED');

console.log('✔ Test 2 Passed: Status preservation works.');

console.log('--- All WhatsApp Template Gallery Tests Passed Cleanly! ---');
