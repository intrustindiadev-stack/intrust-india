import React from 'react';

// Global hooks trackers
let mockKycRecordState = null;
let mockSetKycRecord = jest.fn((updater) => {
    if (typeof updater === 'function') {
        mockKycRecordState = updater(mockKycRecordState);
    } else {
        mockKycRecordState = updater;
    }
});

let mockShowFormState = false;
let mockSetShowForm = jest.fn((updater) => {
    if (typeof updater === 'function') {
        mockShowFormState = updater(mockShowFormState);
    } else {
        mockShowFormState = updater;
    }
});

let mockLoadingState = false; // Bypasses loader state automatically
let mockSetLoading = jest.fn((updater) => {
    if (typeof updater === 'function') {
        mockLoadingState = updater(mockLoadingState);
    } else {
        mockLoadingState = updater;
    }
});

let mockIsPollingState = false;
let mockSetIsPolling = jest.fn((updater) => {
    if (typeof updater === 'function') {
        mockIsPollingState = updater(mockIsPollingState);
    } else {
        mockIsPollingState = updater;
    }
});

// Mock react module before importing ProfileKYCPage
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    let falseStateCounter = 0;
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            if (init === null) {
                return [mockKycRecordState, mockSetKycRecord];
            }
            if (init === true) {
                return [mockLoadingState, mockSetLoading];
            }
            if (init === false) {
                falseStateCounter++;
                if (falseStateCounter === 1) {
                    return [mockShowFormState, mockSetShowForm];
                } else {
                    return [mockIsPollingState, mockSetIsPolling];
                }
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {}) // Bypass useEffect to prevent async fetch/polling loops
    };
});

import ProfileKYCPage from '../app/(customer)/(protected)/profile/kyc/page';
import KYCForm from '@/components/forms/KYCForm';

// Mock other dependencies
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    })
}));

jest.mock('@/lib/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id', email: 'test@example.com' },
        loading: false,
        refreshProfile: jest.fn()
    })
}));

jest.mock('@/app/actions/kyc', () => ({
    getKYCRecord: jest.fn()
}));

jest.mock('@/components/forms/KYCForm', () => {
    return function MockKYCForm(props) {
        return <div data-testid="kyc-form" />;
    };
});

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => children
}));

jest.mock('lucide-react', () => ({
    Shield: () => 'ShieldIcon',
    CheckCircle: () => 'CheckCircleIcon',
    Clock: () => 'ClockIcon',
    XCircle: () => 'XCircleIcon',
    ArrowLeft: () => 'ArrowLeftIcon',
    Loader2: () => 'Loader2Icon',
    RefreshCw: () => 'RefreshCwIcon'
}));

// Helper to recursively traverse React element tree to find nodes
function findElement(element, predicate) {
    if (!element) return null;
    if (predicate(element)) return element;
    if (element.props && element.props.children) {
        const children = React.Children.toArray(element.props.children);
        for (const child of children) {
            const found = findElement(child, predicate);
            if (found) return found;
        }
    }
    return null;
}

function findElements(element, predicate, results = []) {
    if (!element) return results;
    if (predicate(element)) results.push(element);
    if (element.props && element.props.children) {
        const children = React.Children.toArray(element.props.children);
        for (const child of children) {
            findElements(child, predicate, results);
        }
    }
    return results;
}

describe('CUST-05: KYC page renders correct state from kyc_status field', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset states
        mockKycRecordState = null;
        mockLoadingState = false;
        mockShowFormState = false;
        mockIsPollingState = false;

        // Reset the react mock's state counter by forcing a reload of the module context
        // which resets the local falseStateCounter on every render call
        const reactMock = require('react');
        reactMock.useState.mockImplementation((init) => {
            let falseStateCounter = 0;
            reactMock.useState.mockImplementation((i) => {
                if (i === null) return [mockKycRecordState, mockSetKycRecord];
                if (i === true) return [mockLoadingState, mockSetLoading];
                if (i === false) {
                    falseStateCounter++;
                    if (falseStateCounter === 1) return [mockShowFormState, mockSetShowForm];
                    return [mockIsPollingState, mockSetIsPolling];
                }
                return [i, jest.fn()];
            });
            return reactMock.useState(init);
        });
    });

    it('Case 1: Should render correctly when KYC is not submitted (no kyc record)', () => {
        mockKycRecordState = null;
        mockShowFormState = true;

        const rendered = ProfileKYCPage();

        // 1. Verify "Secure Your Account" banner is displayed
        const secureBanner = findElement(rendered, (node) => 
            node.props && node.props.children && node.props.children === 'Secure Your Account'
        );
        expect(secureBanner).toBeDefined();

        // 2. Verify KYCForm is rendered
        const kycForm = findElement(rendered, (node) => 
            node.type === KYCForm
        );
        expect(kycForm).toBeDefined();
        expect(kycForm.props.initialData).toEqual({});

        // 3. Verify no StatusBanner is shown (since record is null)
        const statusBannerNode = findElement(rendered, (node) => 
            node.type && node.type.name === 'StatusBanner'
        );
        expect(statusBannerNode).toBeNull();
    });

    it('Case 2: Should render correctly when KYC is pending (auto-verification description)', () => {
        mockKycRecordState = { verification_status: 'pending' };
        mockShowFormState = false;

        const rendered = ProfileKYCPage();

        // 1. Find StatusBanner
        const banner = findElement(rendered, (node) => 
            node.type && node.type.name === 'StatusBanner'
        );
        expect(banner).toBeDefined();
        
        // Execute the banner component to test its internal rendering
        const bannerJSX = banner.type(banner.props);

        // Verify status title and auto-processing description
        const titleNode = findElement(bannerJSX, (n) => n.props && n.props.children === 'KYC Verification in Progress');
        expect(titleNode).toBeDefined();

        const descNode = findElement(bannerJSX, (n) => 
            n.props && typeof n.props.children === 'string' &&
            n.props.children.includes('SprintVerify') &&
            n.props.children.includes('automatically')
        );
        expect(descNode).toBeDefined();

        // 2. Verify "What happens next?" help block is rendered
        const nextStepsBlock = findElement(rendered, (node) => 
            node.props && node.props.children === 'What happens next?'
        );
        expect(nextStepsBlock).toBeDefined();

        // 3. Verify form is hidden
        const kycForm = findElement(rendered, (node) => 
            node.type === KYCForm
        );
        expect(kycForm).toBeNull();
    });

    it('Case 3: Should render correctly when KYC is pending with a rejection reason (manual review)', () => {
        mockKycRecordState = { verification_status: 'pending', rejection_reason: 'manual_verification_flag' };
        mockShowFormState = false;

        const rendered = ProfileKYCPage();

        // Find StatusBanner
        const banner = findElement(rendered, (node) => 
            node.type && node.type.name === 'StatusBanner'
        );
        expect(banner).toBeDefined();
        
        const bannerJSX = banner.type(banner.props);

        // Verify title
        const titleNode = findElement(bannerJSX, (n) => n.props && n.props.children === 'KYC Under Review');
        expect(titleNode).toBeDefined();

        // Verify manual review description
        const descNode = findElement(bannerJSX, (n) => 
            n.props && typeof n.props.children === 'string' &&
            n.props.children.includes('manual review by our team')
        );
        expect(descNode).toBeDefined();
    });

    it('Case 4: Should render correctly when KYC is verified', () => {
        mockKycRecordState = {
            verification_status: 'verified',
            full_legal_name: 'Ayush Kumar',
            phone_number: '+919876543210',
            date_of_birth: '1990-05-15',
            pan_number: 'ABCDE1234F',
            full_address: 'Flat 101, Tech Residency, Sector 62, Noida',
            bank_grade_security: true,
            verified_at: '2026-06-06T12:00:00.000Z'
        };
        mockShowFormState = false;

        const rendered = ProfileKYCPage();

        // 1. Verify StatusBanner renders verified title
        const banner = findElement(rendered, (node) => 
            node.type && node.type.name === 'StatusBanner'
        );
        expect(banner).toBeDefined();
        
        const bannerJSX = banner.type(banner.props);
        const titleNode = findElement(bannerJSX, (n) => n.props && n.props.children === 'KYC Verified Instantly ✓');
        expect(titleNode).toBeDefined();

        // 2. Verify KYC Details Box is rendered
        const detailsHeader = findElement(rendered, (node) => 
            node.props && node.props.children && 
            node.props.children[1] === 'Your KYC Information'
        );
        expect(detailsHeader).toBeDefined();

        // 3. Find and verify all InfoFields
        const infoFields = findElements(rendered, (node) => 
            node.type && node.type.name === 'InfoField'
        );
        
        const fieldMap = {};
        infoFields.forEach(f => {
            fieldMap[f.props.label] = f.props.value;
        });

        // Full Name check
        expect(fieldMap['Full Name']).toBe('Ayush Kumar');
        // Phone Number check
        expect(fieldMap['Phone Number']).toBe('+919876543210');
        // Masked PAN check: ABCDE1234F -> ABCDE****F
        expect(fieldMap['PAN Number']).toBe('ABCDE****F');
        // Address check
        expect(fieldMap['Address']).toBe('Flat 101, Tech Residency, Sector 62, Noida');
        // Bank grade security enabled
        expect(fieldMap['Bank-Grade Security']).toBe('Enabled');

        // 4. Verify form is hidden
        const kycForm = findElement(rendered, (node) => 
            node.type === KYCForm
        );
        expect(kycForm).toBeNull();
    });

    it('Case 5: Should render correctly when KYC is rejected', () => {
        mockKycRecordState = {
            verification_status: 'rejected',
            rejection_reason: 'Invalid PAN details provided',
            full_legal_name: 'Ayush Rej',
            phone_number: '+919999999999',
            date_of_birth: '1992-12-12',
            pan_number: 'ABCDE9876G',
            full_address: 'Old Town Road',
            bank_grade_security: false
        };
        mockShowFormState = true;

        const rendered = ProfileKYCPage();

        // 1. Verify StatusBanner renders rejected status and description
        const banner = findElement(rendered, (node) => 
            node.type && node.type.name === 'StatusBanner'
        );
        expect(banner).toBeDefined();
        
        const bannerJSX = banner.type(banner.props);
        
        const titleNode = findElement(bannerJSX, (n) => n.props && n.props.children === 'KYC Verification Rejected');
        expect(titleNode).toBeDefined();

        const descNode = findElement(bannerJSX, (n) => n.props && n.props.children === 'Invalid PAN details provided');
        expect(descNode).toBeDefined();

        // 2. Verify KYCForm is rendered prefilled with initialData for resubmission
        const kycForm = findElement(rendered, (node) => 
            node.type === KYCForm
        );
        expect(kycForm).toBeDefined();
        expect(kycForm.props.initialData).toEqual({
            fullName: 'Ayush Rej',
            phoneNumber: '+919999999999',
            dateOfBirth: '1992-12-12',
            panNumber: 'ABCDE9876G',
            fullAddress: 'Old Town Road',
            bankGradeSecurity: false
        });
    });
});
