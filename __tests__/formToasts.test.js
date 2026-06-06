import React from 'react';

// Mock react-hot-toast first so it's globally stubbed for all imports
jest.mock('react-hot-toast', () => {
    const mToast = {
        success: jest.fn(),
        error: jest.fn()
    };
    return {
        __esModule: true,
        toast: mToast,
        default: mToast
    };
});

// Mock react with common hooks stubbed to prevent invalid hook calls
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            return [init, jest.fn()];
        }),
        useEffect: jest.fn((effect) => effect()),
        useMemo: jest.fn((fn) => fn()),
        useCallback: jest.fn((fn) => fn),
        useRef: jest.fn((init) => ({ current: init })),
        useContext: jest.fn(() => ({}))
    };
});

import toast from 'react-hot-toast';
import KYCForm from '../components/forms/KYCForm';
import NFCOrderForm from '../components/nfc/NFCOrderForm';
import EnterReferralCodeSection from '../components/merchant/EnterReferralCodeSection';
import { submitKYC } from '@/app/actions/kyc';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        refresh: jest.fn()
    })
}));

// Mock custom contexts & hooks
jest.mock('@/lib/contexts/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light' })
}));

jest.mock('@/hooks/useWallet', () => ({
    useWallet: () => ({
        balance: { balance: '1000.00', balance_paise: 100000 },
        fetchBalance: jest.fn()
    })
}));

jest.mock('@/components/payment/SabpaisaPaymentModal', () => () => 'SabpaisaPaymentModal');

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    ArrowLeft: () => 'ArrowLeft',
    ArrowRight: () => 'ArrowRight',
    Lock: () => 'Lock',
    Check: () => 'Check',
    Phone: () => 'Phone',
    MapPin: () => 'MapPin',
    Layers: () => 'Layers',
    Truck: () => 'Truck',
    Info: () => 'Info',
    Star: () => 'Star',
    Box: () => 'Box',
    AlertCircle: () => 'AlertCircle',
    CreditCard: () => 'CreditCard',
    Wallet: () => 'Wallet',
    Loader2: () => 'Loader2',
    ShieldCheck: () => 'ShieldCheck',
    Gift: () => 'Gift',
    CheckCircle: () => 'CheckCircle'
}));

// Mock subcomponents of KYCForm with validate functions exported properly
jest.mock('@/components/kyc/steps/StepProgressBar', () => () => 'StepProgressBar');
jest.mock('@/components/kyc/steps/Step1Identity', () => ({
    __esModule: true,
    default: () => 'Step1Identity',
    validateStep1: jest.fn(() => ({ valid: true, errors: {} }))
}));
jest.mock('@/components/kyc/steps/Step2PAN', () => ({
    __esModule: true,
    default: () => 'Step2PAN',
    validateStep2: jest.fn(() => ({ valid: true, errors: {} }))
}));
jest.mock('@/components/kyc/steps/Step3Address', () => ({
    __esModule: true,
    default: () => 'Step3Address',
    validateStep3: jest.fn(() => ({ valid: true, errors: {} }))
}));
jest.mock('@/components/kyc/steps/SuccessScreen', () => () => 'SuccessScreen');

// Mock KYC Actions
jest.mock('@/app/actions/kyc', () => ({
    submitKYC: jest.fn()
}));

// Mock Supabase client
const mockSupabase = {
    auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null })
    },
    from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { kyc_status: 'verified' }, error: null })
    }))
};
jest.mock('@/lib/supabaseClient', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

// Helpers for traversal
function resolveElement(element) {
    let current = element;
    while (current && typeof current.type === 'function') {
        try {
            current = current.type(current.props);
        } catch (e) {
            break;
        }
    }
    return current;
}

function findElement(element, predicate) {
    const resolved = resolveElement(element);
    if (!resolved) return null;
    if (predicate(resolved)) return resolved;
    if (resolved.props && resolved.props.children) {
        const children = React.Children.toArray(resolved.props.children);
        for (const child of children) {
            const found = findElement(child, predicate);
            if (found) return found;
        }
    }
    return null;
}

describe('UI-03: Form Submission Toasts Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    describe('KYCForm Submission', () => {
        it('triggers validation toast.error when step 3 address details are invalid/missing', async () => {
            const { validateStep3 } = require('@/components/kyc/steps/Step3Address');
            validateStep3.mockReturnValueOnce({ valid: false, errors: { fullAddress: 'Required' } });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 4) return [{ fullAddress: '', termsAccepted: false }, jest.fn()];
                return [init, jest.fn()];
            });

            const rendered = KYCForm({ userType: 'customer' });
            const form = findElement(rendered, (node) => node.type === 'form');
            
            const fakeEvent = { preventDefault: jest.fn() };
            await form.props.onSubmit(fakeEvent);

            expect(toast.error).toHaveBeenCalledWith('Please fix the errors before submitting');
        });

        it('triggers server action toast.error when submitKYC returns an error', async () => {
            const { validateStep3 } = require('@/components/kyc/steps/Step3Address');
            validateStep3.mockReturnValueOnce({ valid: true, errors: {} });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 4) return [{
                    fullName: 'Ayush Kumar',
                    phoneNumber: '9999999999',
                    dateOfBirth: '1995-01-01',
                    panNumber: 'ABCDE1234F',
                    gender: 'male',
                    fatherName: 'Father',
                    fullAddress: '123 Test Street',
                    bankGradeSecurity: true,
                    city: 'Noida',
                    state: 'UP',
                    pinCode: '201301',
                    termsAccepted: true
                }, jest.fn()];
                return [init, jest.fn()];
            });

            submitKYC.mockResolvedValue({ success: false, error: 'Database integrity error' });

            const rendered = KYCForm({ userType: 'customer' });
            const form = findElement(rendered, (node) => node.type === 'form');
            
            const fakeEvent = { preventDefault: jest.fn() };
            await form.props.onSubmit(fakeEvent);

            expect(submitKYC).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('Database integrity error');
        });
    });

    describe('EnterReferralCodeSection Submission', () => {
        it('triggers toast.success when referral API call is successful', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 1) return ['REFERRAL10', jest.fn()];
                return [init, jest.fn()];
            });

            const rendered = EnterReferralCodeSection({ hasReferrer: false });
            const button = findElement(rendered, (node) => node.type === 'button');
            
            await button.props.onClick();

            expect(global.fetch).toHaveBeenCalledWith('/api/merchant/referral/apply', expect.any(Object));
            expect(toast.success).toHaveBeenCalledWith('Referral code applied successfully!');
        });

        it('triggers toast.error when referral API returns an error message', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                json: async () => ({ error: 'Invalid referral code or self-referral' })
            });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 1) return ['SELFCODE', jest.fn()];
                return [init, jest.fn()];
            });

            const rendered = EnterReferralCodeSection({ hasReferrer: false });
            const button = findElement(rendered, (node) => node.type === 'button');
            
            await button.props.onClick();

            expect(toast.error).toHaveBeenCalledWith('Invalid referral code or self-referral');
        });
    });

    describe('NFCOrderForm Submission', () => {
        it('triggers toast.success when nfc order endpoint returns successfully for wallet payments', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, orderId: 'nfc-ord-123' })
            });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 1) return [3, jest.fn()]; // force step 3
                if (stateIndex === 5) return [{ cardHolderName: 'AYUSH', phone: '9999999999', deliveryAddress: 'Address' }, jest.fn()]; // formData
                if (stateIndex === 7) return ['wallet', jest.fn()]; // paymentMethod
                if (stateIndex === 8) return [{ id: 'u1' }, jest.fn()]; // user
                if (stateIndex === 9) return ['verified', jest.fn()]; // kycStatus
                if (stateIndex === 12) return [false, jest.fn()]; // hasExistingOrder
                return [init, jest.fn()];
            });

            const rendered = NFCOrderForm({ setIsSuccess: jest.fn() });
            const form = findElement(rendered, (node) => node.type === 'form');

            const fakeEvent = { preventDefault: jest.fn() };
            await form.props.onSubmit(fakeEvent);

            expect(toast.success).toHaveBeenCalledWith('Order placed! Paid via InTrust Wallet.');
        });

        it('triggers toast.error when nfc order endpoint fails', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                json: async () => ({ error: 'Insufficient wallet balance' })
            });

            let stateIndex = 0;
            React.useState.mockImplementation((init) => {
                stateIndex++;
                if (stateIndex === 1) return [3, jest.fn()];
                if (stateIndex === 5) return [{ cardHolderName: 'AYUSH', phone: '9999999999', deliveryAddress: 'Address' }, jest.fn()];
                if (stateIndex === 7) return ['wallet', jest.fn()];
                if (stateIndex === 8) return [{ id: 'u1' }, jest.fn()];
                if (stateIndex === 9) return ['verified', jest.fn()];
                if (stateIndex === 12) return [false, jest.fn()];
                return [init, jest.fn()];
            });

            const rendered = NFCOrderForm({ setIsSuccess: jest.fn() });
            const form = findElement(rendered, (node) => node.type === 'form');

            const fakeEvent = { preventDefault: jest.fn() };
            await form.props.onSubmit(fakeEvent);

            expect(toast.error).toHaveBeenCalledWith('Insufficient wallet balance');
        });
    });
});
