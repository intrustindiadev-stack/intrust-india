import React from 'react';
import fs from 'fs';
import path from 'path';

let currentPathname = '/merchant/dashboard';

jest.mock('next/navigation', () => ({
    usePathname: () => currentPathname,
}));

jest.mock('next/link', () => {
    return ({ children, href, className }) => (
        <a href={href} className={className} data-testid={`nav-${href}`}>
            {children}
        </a>
    );
});

import MerchantBottomNav from '../components/layout/merchant/MerchantBottomNav';

describe('MerchantBottomNav Theme Responsiveness and Contract', () => {
    const componentPath = path.resolve(__dirname, '../components/layout/merchant/MerchantBottomNav.jsx');

    it('should have the source file existing', () => {
        expect(fs.existsSync(componentPath)).toBe(true);
    });

    it('should NOT have hardcoded dark background (bg-navy-800 dark:bg-navy-900)', () => {
        const source = fs.readFileSync(componentPath, 'utf8');
        expect(source).not.toContain('bg-navy-800 dark:bg-navy-900');
    });

    it('should support both light and dark themes on the container pill', () => {
        const source = fs.readFileSync(componentPath, 'utf8');
        expect(source).toContain('bg-white/90');
        expect(source).toContain('dark:bg-navy-800/90');
        expect(source).toContain('backdrop-blur-xl');
        expect(source).toContain('border-slate-200/80');
        expect(source).toContain('dark:border-white/10');
    });

    it('should have theme-aware active and inactive link classes', () => {
        const source = fs.readFileSync(componentPath, 'utf8');
        // Active item classes
        expect(source).toContain('bg-amber-500/10');
        expect(source).toContain('dark:bg-white/10');
        // Inactive item classes
        expect(source).toContain('text-slate-500');
        expect(source).toContain('dark:text-slate-400');
    });

    it('renders all 5 expected navigation items with correct hrefs', () => {
        currentPathname = '/merchant/dashboard';
        const rendered = MerchantBottomNav();

        // Check structure
        expect(rendered).toBeDefined();
        const navWrapper = rendered.props.children[1]; // <nav>
        const container = navWrapper.props.children; // <div> pill
        const links = container.props.children; // array of 5 Links

        expect(links).toHaveLength(5);
        const expectedHrefs = [
            '/merchant/dashboard',
            '/merchant/shopping/wholesale',
            '/merchant/shopping/inventory',
            '/merchant/wallet',
            '/merchant/profile'
        ];

        links.forEach((link, idx) => {
            expect(link.props.href).toBe(expectedHrefs[idx]);
        });
    });

    it('applies active styling to the current route and inactive styling to others', () => {
        currentPathname = '/merchant/dashboard';
        const rendered = MerchantBottomNav();
        const container = rendered.props.children[1].props.children;
        const links = container.props.children;

        const homeLink = links[0];
        const buyStockLink = links[1];

        // Active link (Home)
        expect(homeLink.props.className).toContain('bg-amber-500/10');
        expect(homeLink.props.className).toContain('dark:bg-white/10');

        // Inactive link (Buy Stock)
        expect(buyStockLink.props.className).toContain('text-slate-500');
        expect(buyStockLink.props.className).toContain('dark:text-slate-400');
    });

    it('preserves mobile/tablet responsive constraints', () => {
        const source = fs.readFileSync(componentPath, 'utf8');
        expect(source).toContain('lg:hidden');
        expect(source).toContain('pointer-events-none');
        expect(source).toContain('pointer-events-auto');
        expect(source).toContain('rounded-full');
    });
});
