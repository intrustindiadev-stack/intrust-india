import { useMerchantApplyPopup } from '../hooks/useMerchantApplyPopup';

// Simple mock for React hooks in unit test environment
let stateValue;
let setStateFn;
let effects = [];

jest.mock('react', () => {
    const original = jest.requireActual('react');
    return {
        ...original,
        useState: (initial) => {
            stateValue = stateValue !== undefined ? stateValue : initial;
            setStateFn = jest.fn((newVal) => {
                stateValue = typeof newVal === 'function' ? newVal(stateValue) : newVal;
            });
            return [stateValue, setStateFn];
        },
        useCallback: (fn) => fn,
        useEffect: (fn, deps) => {
            effects.push({ fn, deps });
        }
    };
});

describe('useMerchantApplyPopup hook', () => {
    beforeEach(() => {
        stateValue = undefined;
        setStateFn = undefined;
        effects = [];
        // Mock sessionStorage
        const store = {};
        global.sessionStorage = {
            getItem: (key) => store[key] || null,
            setItem: (key, val) => { store[key] = String(val); },
            clear: () => { for (const k in store) delete store[k]; }
        };
    });

    it('returns isOpen, openMerchantPopup, closeMerchantPopup, and closePopup', () => {
        const hook = useMerchantApplyPopup({ merchantStatus: null, enabled: true });

        expect(hook.isOpen).toBe(false);
        expect(typeof hook.closeMerchantPopup).toBe('function');
        expect(typeof hook.closePopup).toBe('function');
        expect(hook.closePopup).toBe(hook.closeMerchantPopup);
    });

    it('closePopup updates state and sets sessionStorage dismissed key', () => {
        const hook = useMerchantApplyPopup({ merchantStatus: null, enabled: true });

        hook.closePopup();

        expect(setStateFn).toHaveBeenCalledWith(false);
        expect(sessionStorage.getItem('merchant_apply_popup_dismissed')).toBe('1');
    });

    it('closeMerchantPopup updates state and sets sessionStorage dismissed key', () => {
        const hook = useMerchantApplyPopup({ merchantStatus: null, enabled: true });

        hook.closeMerchantPopup();

        expect(setStateFn).toHaveBeenCalledWith(false);
        expect(sessionStorage.getItem('merchant_apply_popup_dismissed')).toBe('1');
    });
});
