/**
 * Regression tests for the dirty-field payload helpers in lib/utils.js.
 *
 * Context — production bug these guard against:
 *   The merchant Business Information form was PUT-ing its whole state to
 *   `public.merchants`. A blank nullable input round-tripped as '' while the
 *   column was NULL in the DB, and '' IS DISTINCT FROM NULL, so the
 *   merchants_sensitive_column_guard trigger raised
 *   "Column pan_number is protected and set during onboarding only."
 *   even when the merchant had only edited their phone number.
 *
 *   Sending only genuinely changed columns prevents that, and the broader class
 *   of "Column <x> is protected" errors caused by payload pollution.
 */
import { pickDirtyFields, toNullableText } from '../lib/utils';

describe('toNullableText', () => {
    it('maps blank / whitespace-only strings to null', () => {
        expect(toNullableText('')).toBeNull();
        expect(toNullableText('   ')).toBeNull();
        expect(toNullableText('\n\t')).toBeNull();
    });

    it('maps null and undefined to null', () => {
        expect(toNullableText(null)).toBeNull();
        expect(toNullableText(undefined)).toBeNull();
    });

    it('trims and preserves real values', () => {
        expect(toNullableText('  ABCDE1234F  ')).toBe('ABCDE1234F');
        expect(toNullableText('+919999999999')).toBe('+919999999999');
    });
});

describe('pickDirtyFields', () => {
    it('omits columns whose value is unchanged', () => {
        const payload = pickDirtyFields(
            { business_phone: '+919999999999', gst_number: '22AAAAA0000A1Z5' },
            { business_phone: '+919999999999', gst_number: '22AAAAA0000A1Z5' }
        );
        expect(payload).toEqual({});
    });

    it('includes only the changed column', () => {
        const payload = pickDirtyFields(
            { business_phone: '+918888888888', gst_number: '22AAAAA0000A1Z5' },
            { business_phone: '+919999999999', gst_number: '22AAAAA0000A1Z5' }
        );
        expect(payload).toEqual({ business_phone: '+918888888888' });
    });

    it('treats a blank string as equal to a NULL column (the reported bug)', () => {
        // DB pan_number is NULL, the empty input produced ''
        const payload = pickDirtyFields({ pan_number: '' }, { pan_number: null });
        expect(payload).toEqual({});
        expect(payload).not.toHaveProperty('pan_number');
    });

    it('treats NULL as equal to a blank string (reverse direction)', () => {
        expect(pickDirtyFields({ gst_number: null }, { gst_number: '' })).toEqual({});
    });

    it('ignores surrounding whitespace differences', () => {
        expect(pickDirtyFields({ pan_number: ' ABCDE1234F ' }, { pan_number: 'ABCDE1234F' })).toEqual({});
    });

    it('still reports a real change from NULL to a value', () => {
        expect(pickDirtyFields({ pan_number: 'ABCDE1234F' }, { pan_number: null }))
            .toEqual({ pan_number: 'ABCDE1234F' });
    });

    it('skips undefined candidates, so optional keys can be spread conditionally', () => {
        expect(pickDirtyFields({ business_name: undefined }, { business_name: 'Old' })).toEqual({});
    });

    it('handles a missing key in the persisted row as null', () => {
        expect(pickDirtyFields({ is_open: true }, {})).toEqual({ is_open: true });
        expect(pickDirtyFields({ is_open: null }, {})).toEqual({});
    });

    it('treats type changes as dirty (string vs number)', () => {
        expect(pickDirtyFields({ base_salary: 5000 }, { base_salary: '5000' }))
            .toEqual({ base_salary: 5000 });
    });

    it('does not mutate the candidate or current objects', () => {
        const candidate = { gst_number: '' };
        const current = { gst_number: null };
        pickDirtyFields(candidate, current);
        expect(candidate).toEqual({ gst_number: '' });
        expect(current).toEqual({ gst_number: null });
    });

    it('works with no arguments', () => {
        expect(pickDirtyFields()).toEqual({});
        expect(pickDirtyFields({ a: 1 })).toEqual({ a: 1 });
    });
});
describe('merchant Business Information save payload (integration contract)', () => {
    // Mirrors app/(merchant)/merchant/settings/page.jsx handleSave()
    const buildBusinessPayload = (formData, merchantProfile) => {
        const candidate = {
            gst_number: toNullableText(formData.gst_number),
            pan_number: toNullableText(formData.pan_number),
            business_phone: toNullableText(formData.business_phone),
            business_email: toNullableText(formData.business_email),
            business_name: formData.business_name,
        };
        return pickDirtyFields(candidate, merchantProfile);
    };

    const dbRow = {
        business_name: 'Acme Traders',
        gst_number: null,
        pan_number: null,
        business_phone: '+919999999999',
        business_email: 'acme@example.com',
    };

    it('sends ONLY business_phone when the merchant edits just the phone number', () => {
        const formData = {
            business_name: 'Acme Traders',
            gst_number: '',
            pan_number: '',
            business_phone: '+918888888888',
            business_email: 'acme@example.com',
        };
        expect(buildBusinessPayload(formData, dbRow)).toEqual({ business_phone: '+918888888888' });
    });

    it('produces an empty payload (no merchants UPDATE) when nothing changed', () => {
        const formData = {
            business_name: 'Acme Traders',
            gst_number: '',
            pan_number: '',
            business_phone: '+919999999999',
            business_email: 'acme@example.com',
        };
        expect(buildBusinessPayload(formData, dbRow)).toEqual({});
    });

    it('never emits protected columns it was not asked to change', () => {
        const payload = buildBusinessPayload(
            {
                business_name: 'Acme Traders',
                gst_number: '22AAAAA0000A1Z5',
                pan_number: '',
                business_phone: '+919999999999',
                business_email: 'acme@example.com',
            },
            dbRow
        );
        expect(Object.keys(payload)).toEqual(['gst_number']);
    });
});
