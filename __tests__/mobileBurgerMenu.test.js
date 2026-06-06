import React from 'react';

// Mock state trackers
let mockMenuOpen = false;
let mockSetMenuOpen = jest.fn((val) => {
    mockMenuOpen = typeof val === 'function' ? val(mockMenuOpen) : val;
});

let stateIndex = 0;
// Mock react before importing Navbar
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            stateIndex++;
            if (stateIndex === 2) {
                return [mockMenuOpen, mockSetMenuOpen];
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {})
    };
});

import Navbar from '../components/layout/Navbar';
import MobileNav from '../components/layout/MobileNav';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    })
}));

// Mock Auth Context
jest.mock('@/lib/contexts/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        user: { id: 'test-user-uuid', email: 'test@example.com' },
        profile: { full_name: 'Test User', is_gold_verified: false }
    })
}));

// Mock Theme Context
jest.mock('@/lib/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        toggleTheme: jest.fn()
    })
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Menu: () => 'MenuIcon',
    X: () => 'XIcon',
    ChevronRight: () => 'ChevronRightIcon',
    User: () => 'UserIcon',
    Moon: () => 'MoonIcon',
    Sun: () => 'SunIcon',
    Gift: () => 'GiftIcon',
    Sparkles: () => 'SparklesIcon',
    History: () => 'HistoryIcon',
    ShoppingBag: () => 'ShoppingBagIcon',
    CreditCard: () => 'CreditCardIcon',
    ScanFace: () => 'ScanFaceIcon',
    ChevronDown: () => 'ChevronDownIcon'
}));

// Mock subcomponents
jest.mock('@/components/ui/GoldBadge', () => () => 'GoldBadge');
jest.mock('@/components/notifications/NotificationBell', () => () => 'NotificationBell');
jest.mock('@/components/ui/ConfirmModal', () => () => 'ConfirmModal');
jest.mock('../components/layout/MobileNav', () => jest.fn(() => <div data-testid="mobile-nav" />));

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

const renderNavbar = () => {
    stateIndex = 0;
    return Navbar();
};

describe('UI-04: Mobile Burger Menu Responsiveness Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockMenuOpen = false;
    });

    it('Burger Button: Contains responsive class to hide on desktop and show on mobile', () => {
        const rendered = renderNavbar();

        // Find the burger toggle button by aria-label
        const burgerButton = findElement(rendered, (node) => 
            node.props && node.props['aria-label'] === 'Toggle menu'
        );

        expect(burgerButton).not.toBeNull();
        // Assert burger button has lg:hidden (hidden on screens >= 1024px)
        expect(burgerButton.props.className).toContain('lg:hidden');
    });

    it('Desktop Menu: Contains responsive class to show on desktop and hide on mobile', () => {
        const rendered = renderNavbar();

        // Find the desktop menu container which contains the menuItems map
        const desktopMenu = findElement(rendered, (node) => 
            node.props && node.props.className && node.props.className.includes('hidden lg:flex')
        );

        expect(desktopMenu).not.toBeNull();
    });

    it('Toggles MobileNav open when burger button is clicked', () => {
        const rendered = renderNavbar();

        // 1. Initially closed
        expect(mockMenuOpen).toBe(false);

        // 2. Click burger button
        const burgerButton = findElement(rendered, (node) => 
            node.props && node.props['aria-label'] === 'Toggle menu'
        );
        burgerButton.props.onClick();

        expect(mockSetMenuOpen).toHaveBeenCalledWith(true);
        expect(mockMenuOpen).toBe(true);

        // 3. Re-render and verify MobileNav receives isOpen=true
        const newRendered = renderNavbar();
        // Force lazy-resolution of the MobileNav component
        findElement(newRendered, (node) => node.props && node.props['data-testid'] === 'mobile-nav');

        expect(MobileNav).toHaveBeenCalledWith(
            expect.objectContaining({ isOpen: true })
        );
    });

    it('Toggles MobileNav closed when close action triggers onClose', () => {
        mockMenuOpen = true; // start open

        const rendered = renderNavbar();
        // Force lazy-resolution of MobileNav to record initial call
        findElement(rendered, (node) => node.props && node.props['data-testid'] === 'mobile-nav');

        // Verify initially rendered as open
        expect(MobileNav).toHaveBeenCalledWith(
            expect.objectContaining({ isOpen: true })
        );

        // Extract onClose from MobileNav call args and trigger it
        const onCloseCallback = MobileNav.mock.calls[MobileNav.mock.calls.length - 1][0].onClose;
        onCloseCallback();

        expect(mockSetMenuOpen).toHaveBeenCalledWith(false);
        expect(mockMenuOpen).toBe(false);

        // Re-render and verify MobileNav receives isOpen=false
        const newRendered = renderNavbar();
        findElement(newRendered, (node) => node.props && node.props['data-testid'] === 'mobile-nav');

        expect(MobileNav).toHaveBeenCalledWith(
            expect.objectContaining({ isOpen: false })
        );
    });
});
