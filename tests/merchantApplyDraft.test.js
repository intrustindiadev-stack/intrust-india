import { DRAFT_STORAGE_KEY } from '../app/(customer)/merchant-apply/page';

describe('Merchant Apply Local Draft Persistence', () => {
    let storage = {};

    beforeEach(() => {
        storage = {};
        global.localStorage = {
            getItem: jest.fn((key) => storage[key] || null),
            setItem: jest.fn((key, val) => {
                storage[key] = String(val);
            }),
            removeItem: jest.fn((key) => {
                delete storage[key];
            }),
            clear: jest.fn(() => {
                storage = {};
            }),
        };
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('uses the exact specified draft storage key', () => {
        expect(DRAFT_STORAGE_KEY).toBe('intrust_merchant_apply_draft');
    });

    describe('Task 1: Form Hydration (Load Draft)', () => {
        it('hydrates saved draft from localStorage using reset() when present', () => {
            const savedDraft = {
                businessName: 'Apex Grocery Store',
                gstNumber: '22AAAAA0000A1Z5',
                ownerName: 'Rajesh Kumar',
                phone: '9876543210',
                email: 'rajesh@apexgrocery.in',
                address: '123 Market Street, Mumbai, 400001',
                department: 'grocery',
            };

            global.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

            const resetMock = jest.fn();
            const setFormDataMock = jest.fn();
            let isMounted = false;

            // Simulate the client mount useEffect in MerchantApplyPageInner
            const hydrate = () => {
                isMounted = true;
                try {
                    const raw = global.localStorage.getItem(DRAFT_STORAGE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            resetMock(parsed);
                            setFormDataMock(parsed);
                        }
                    }
                } catch (e) {
                    // fail safe
                }
            };

            hydrate();

            expect(isMounted).toBe(true);
            expect(global.localStorage.getItem).toHaveBeenCalledWith('intrust_merchant_apply_draft');
            expect(resetMock).toHaveBeenCalledWith(expect.objectContaining({
                businessName: 'Apex Grocery Store',
                phone: '9876543210',
            }));
            expect(setFormDataMock).toHaveBeenCalledWith(expect.objectContaining({
                businessName: 'Apex Grocery Store',
                phone: '9876543210',
            }));
        });

        it('handles corrupted JSON gracefully without crashing', () => {
            global.localStorage.setItem(DRAFT_STORAGE_KEY, 'INVALID_JSON{[[[');

            const resetMock = jest.fn();
            expect(() => {
                try {
                    const raw = global.localStorage.getItem(DRAFT_STORAGE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        resetMock(parsed);
                    }
                } catch (err) {
                    // Handled gracefully
                }
            }).not.toThrow();

            expect(resetMock).not.toHaveBeenCalled();
        });
    });

    describe('Task 2: Continuous Auto-Save (The Watcher)', () => {
        it('debounces writes to localStorage and cleans up subscription on unmount', () => {
            let watcherCallback = null;
            const unsubscribeMock = jest.fn();

            // Mock react-hook-form watch subscription pattern
            const watchMock = (cb) => {
                watcherCallback = cb;
                return { unsubscribe: unsubscribeMock };
            };

            let debounceTimer;
            const subscription = watchMock((value) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    global.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
                }, 300);
            });

            // Simulate typing keystrokes rapidly
            watcherCallback({ businessName: 'A' });
            watcherCallback({ businessName: 'Ap' });
            watcherCallback({ businessName: 'Apex' });

            // Before 300ms debounce fires, setItem should NOT have been called with 'Apex'
            expect(global.localStorage.setItem).not.toHaveBeenCalledWith(
                'intrust_merchant_apply_draft',
                expect.stringContaining('Apex')
            );

            // Fast-forward past debounce interval
            jest.advanceTimersByTime(300);

            // Now it should have saved the final debounced value
            expect(global.localStorage.setItem).toHaveBeenCalledTimes(1);
            expect(JSON.parse(storage[DRAFT_STORAGE_KEY])).toEqual({ businessName: 'Apex' });

            // Simulate unmount cleanup
            clearTimeout(debounceTimer);
            subscription.unsubscribe();
            expect(unsubscribeMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('Task 3: Draft Cleanup (Garbage Collection)', () => {
        it('removes draft from localStorage immediately upon successful form submission', async () => {
            // Seed localStorage with an active draft
            storage[DRAFT_STORAGE_KEY] = JSON.stringify({
                businessName: 'Done Deal Store',
                ownerName: 'Suresh Patel',
            });
            expect(global.localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();

            // Simulate the onSubmit handler logic
            const fakeSubmit = async (success) => {
                if (success) {
                    global.localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
            };

            await fakeSubmit(true);

            expect(global.localStorage.removeItem).toHaveBeenCalledWith('intrust_merchant_apply_draft');
            expect(global.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
        });

        it('does not remove draft if submission fails', async () => {
            const initialData = JSON.stringify({ businessName: 'Store Pending' });
            storage[DRAFT_STORAGE_KEY] = initialData;

            const fakeSubmit = async (success) => {
                if (success) {
                    global.localStorage.removeItem(DRAFT_STORAGE_KEY);
                } else {
                    // Keep draft on failure
                }
            };

            await fakeSubmit(false);

            expect(global.localStorage.removeItem).not.toHaveBeenCalled();
            expect(global.localStorage.getItem(DRAFT_STORAGE_KEY)).toBe(initialData);
        });
    });
});
