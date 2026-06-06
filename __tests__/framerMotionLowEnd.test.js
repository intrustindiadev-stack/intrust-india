import React from 'react';

// Global hooks trackers for testing ScratchCard
let mockStates = [];
let stateIndex = 0;

let mockRefs = [];
let refIndex = 0;

// Mock react to support synchronous execution of hooks outside standard ReactDOM render loop
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            const index = stateIndex++;
            if (mockStates[index] === undefined) {
                mockStates[index] = typeof init === 'function' ? init() : init;
            }
            const setter = jest.fn((newVal) => {
                mockStates[index] = typeof newVal === 'function' ? newVal(mockStates[index]) : newVal;
            });
            return [mockStates[index], setter];
        }),
        useRef: jest.fn((init) => {
            const index = refIndex++;
            if (mockRefs[index] === undefined) {
                mockRefs[index] = { current: init };
            }
            return mockRefs[index];
        }),
        useEffect: jest.fn((fn) => fn && fn()),
        useLayoutEffect: jest.fn((fn) => fn && fn()),
        useCallback: jest.fn((fn) => fn),
        useMemo: jest.fn((fn) => fn()),
        useContext: jest.fn(() => ({}))
    };
});

// Mock Framer Motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        canvas: ({ children, ...props }) => <canvas {...props}>{children}</canvas>,
        h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
        p: ({ children, ...props }) => <p {...props}>{children}</p>
    },
    AnimatePresence: ({ children }) => children
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    X: () => 'XIcon',
    ChevronRight: () => 'ChevronRightIcon',
    Moon: () => 'MoonIcon',
    Sun: () => 'SunIcon',
    Gift: () => 'GiftIcon',
    Sparkles: () => 'SparklesIcon',
    History: () => 'HistoryIcon',
    ShoppingBag: () => 'ShoppingBagIcon',
    CreditCard: () => 'CreditCardIcon',
    ScanFace: () => 'ScanFaceIcon',
    ChevronDown: () => 'ChevronDownIcon',
    Trophy: () => 'TrophyIcon',
    Star: () => 'StarIcon',
    ShieldCheck: () => 'ShieldCheckIcon'
}));

// Mock subcomponents
jest.mock('next/image', () => ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />);
jest.mock('@/components/notifications/NotificationBell', () => () => 'NotificationBell');
jest.mock('@/lib/auth', () => ({
    displayInitial: () => 'T',
    displayEmail: (email) => email
}));
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    })
}));

// Mock Confetti Provider
jest.mock('@/components/ui/ConfettiProvider', () => ({
    useConfetti: () => ({
        trigger: jest.fn()
    })
}));

// Setup global browser API mocks
global.window = global;

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

global.addEventListener = jest.fn();
global.removeEventListener = jest.fn();

// Pre-define document and fonts API
global.document = {
    fonts: {
        load: jest.fn(() => Promise.resolve())
    },
    createElement: jest.fn((type) => {
        if (type === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: jest.fn(() => ({
                    globalCompositeOperation: '',
                    createLinearGradient: jest.fn(() => ({
                        addColorStop: jest.fn()
                    })),
                    fillRect: jest.fn(),
                    beginPath: jest.fn(),
                    moveTo: jest.fn(),
                    lineTo: jest.fn(),
                    stroke: jest.fn(),
                    arc: jest.fn(),
                    fill: jest.fn(),
                    fillText: jest.fn(),
                }))
            };
        }
        return {};
    })
};

import ScratchCard from '../components/ui/ScratchCard';
import MobileNav from '../components/layout/MobileNav';

// Helpers for element traversal
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

describe('UI-05: Framer Motion Low-End Responsiveness Verification', () => {
    let mockCanvas;
    let mockCtx;
    let mockContainer;
    let checkPercentageCallback;

    beforeEach(() => {
        mockStates = [];
        stateIndex = 0;
        mockRefs = [];
        refIndex = 0;
        jest.clearAllMocks();

        // Setup stable mock context
        mockCtx = {
            globalCompositeOperation: '',
            lineJoin: '',
            lineCap: '',
            lineWidth: 0,
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            drawImage: jest.fn(),
            getImageData: jest.fn(() => ({
                data: new Uint8ClampedArray(60 * 60 * 4) // 60x60 region size
            }))
        };

        // Setup mock canvas
        mockCanvas = {
            getContext: jest.fn(() => mockCtx),
            getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
            width: 100,
            height: 100,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        mockContainer = {
            getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 }))
        };

        // Prepopulate standard refs for ScratchCard
        mockRefs[0] = { current: mockCanvas }; // canvasRef
        mockRefs[1] = { current: mockContainer }; // containerRef
        mockRefs[2] = { current: false }; // isDrawingRef
        mockRefs[3] = { current: false }; // rafScheduledRef
        mockRefs[4] = { current: false }; // completedRef
        mockRefs[5] = { current: null }; // drawCoverRef
        mockRefs[6] = { current: { width: 100, height: 100 } }; // coverCacheRef (init with mock cache)

        // Mock requestAnimationFrame to capture callback
        checkPercentageCallback = null;
        global.requestAnimationFrame = jest.fn((cb) => {
            checkPercentageCallback = cb;
            return 1;
        });
    });

    describe('ScratchCard Animations & Calculations', () => {
        it('Throttles scratch percentage checks using requestAnimationFrame', () => {
            const rendered = ScratchCard({
                id: 'test-card',
                prizePoints: 100,
                onComplete: jest.fn()
            });

            const canvasNode = findElement(rendered, (node) => node.type === 'canvas');
            expect(canvasNode).not.toBeNull();

            // Simulate scratch interactions
            // 1. Mouse down triggers drawing state
            canvasNode.props.onMouseDown({ clientX: 10, clientY: 10 });
            expect(mockRefs[2].current).toBe(true); // isDrawingRef becomes true

            // 2. Mouse move schedules requestAnimationFrame
            canvasNode.props.onMouseMove({
                clientX: 20,
                clientY: 20,
                preventDefault: jest.fn(),
                cancelable: true
            });

            expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);
            expect(mockRefs[3].current).toBe(true); // rafScheduledRef is true

            // 3. Consecutive mouse moves DO NOT call requestAnimationFrame again (throttled!)
            canvasNode.props.onMouseMove({
                clientX: 21,
                clientY: 21,
                preventDefault: jest.fn(),
                cancelable: true
            });
            expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);

            // 4. Invoking the rAF callback runs checkPercentage and resets throttle
            expect(checkPercentageCallback).not.toBeNull();
            checkPercentageCallback();
            expect(mockRefs[3].current).toBe(false); // rafScheduledRef reset to false

            // 5. Subsequent mouse move schedules rAF again
            canvasNode.props.onMouseMove({
                clientX: 25,
                clientY: 25,
                preventDefault: jest.fn(),
                cancelable: true
            });
            expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2);
        });

        it('Optimizes performance via centre-weighted pixel sampling & sampling steps', () => {
            const rendered = ScratchCard({
                id: 'test-card',
                prizePoints: 100,
                onComplete: jest.fn()
            });

            const canvasNode = findElement(rendered, (node) => node.type === 'canvas');
            canvasNode.props.onMouseDown({ clientX: 10, clientY: 10 });
            canvasNode.props.onMouseMove({
                clientX: 20,
                clientY: 20,
                preventDefault: jest.fn(),
                cancelable: true
            });

            const ctx = mockCanvas.getContext();
            ctx.getImageData.mockClear();

            // Run checkPercentage calculation
            checkPercentageCallback();

            // Assert it samples only the inner 60% region (x=20, y=20, w=60, h=60) instead of the full 100x100 canvas
            expect(ctx.getImageData).toHaveBeenCalledWith(20, 20, 60, 60);

            // Verify performance: check execution time of sampling logic is extremely lightweight
            const startTime = process.hrtime();
            for (let i = 0; i < 100; i++) {
                checkPercentageCallback();
            }
            const diff = process.hrtime(startTime);
            const totalMs = (diff[0] * 1e9 + diff[1]) / 1e6;
            const avgMs = totalMs / 100;

            // Average execution time of the loop must be under 0.5 ms to protect low-end CPUs
            expect(avgMs).toBeLessThan(0.5);
        });

        it('Reuses offscreen canvas cache on resize rather than doing expensive repaints', () => {
            // Render ScratchCard
            ScratchCard({
                id: 'test-card',
                prizePoints: 100,
                onComplete: jest.fn()
            });

            // Retrieve ResizeObserver callback
            const roInstance = global.ResizeObserver.mock.results[0].value;
            expect(global.ResizeObserver).toHaveBeenCalled();
            const resizeHandler = global.ResizeObserver.mock.calls[0][0];

            const ctx = mockCanvas.getContext();
            ctx.drawImage.mockClear();

            // Trigger a resize event
            resizeHandler();

            // Assert that the resize blits from the cache instead of recreating canvas content
            expect(ctx.drawImage).toHaveBeenCalledWith(
                mockRefs[6].current, // coverCacheRef
                0, 0,
                mockCanvas.width, mockCanvas.height
            );
        });
    });

    describe('MobileNav Interactions & Animation Hardware Acceleration', () => {
        it('Applies compositor-friendly styles (willChange: transform) and animations', () => {
            const rendered = MobileNav({
                isOpen: true,
                onClose: jest.fn(),
                isAuthenticated: true,
                profile: { full_name: 'Test' },
                user: { email: 'test@example.com' },
                theme: 'light',
                toggleTheme: jest.fn(),
                handleSignOut: jest.fn(),
                menuItems: [],
                apiPath: '/api/notifications'
            });

            // Find the main sliding menu panel
            const panel = findElement(rendered, (node) => 
                node.props && node.props.style && node.props.style.willChange === 'transform'
            );

            expect(panel).not.toBeNull();
            // Assert that it animates x (transform translation) instead of layout properties like width or left/right
            expect(panel.props.animate).toEqual({ x: 0 });
            expect(panel.props.initial).toEqual({ x: '100%' });
            expect(panel.props.exit).toEqual({ x: '100%' });
        });

        it('Ensures interactive buttons and links inside remain enabled', () => {
            const onCloseMock = jest.fn();
            const rendered = MobileNav({
                isOpen: true,
                onClose: onCloseMock,
                isAuthenticated: true,
                profile: { full_name: 'Test' },
                user: { email: 'test@example.com' },
                theme: 'light',
                toggleTheme: jest.fn(),
                handleSignOut: jest.fn(),
                menuItems: [{ label: 'MockLink', href: '/mock' }],
                apiPath: '/api/notifications'
            });

            // Find close button
            const closeButton = findElement(rendered, (node) =>
                node.props && node.props['aria-label'] === 'Close menu'
            );
            expect(closeButton).not.toBeNull();
            expect(closeButton.props.disabled).toBeUndefined();

            // Click the close button and assert onClose callback gets fired instantly
            closeButton.props.onClick();
            expect(onCloseMock).toHaveBeenCalled();
        });
    });
});
