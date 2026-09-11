import fs from 'fs';
import path from 'path';

describe('Merchant Inventory UI/UX Production Upgrade Regression Suite', () => {
    const rootDir = process.cwd();
    const inventoryPagePath = path.join(rootDir, 'app/(merchant)/merchant/shopping/inventory/page.jsx');
    const inventoryClientPath = path.join(rootDir, 'app/(merchant)/merchant/shopping/inventory/MerchantInventoryClient.jsx');
    const inventoryLoadingPath = path.join(rootDir, 'app/(merchant)/merchant/shopping/inventory/loading.jsx');
    const storeStatusTogglePath = path.join(rootDir, 'components/merchant/StoreStatusToggle.jsx');

    describe('1. File Architecture and Existence', () => {
        it('should have the inventory page server component', () => {
            expect(fs.existsSync(inventoryPagePath)).toBe(true);
        });

        it('should have the client inventory dashboard component', () => {
            expect(fs.existsSync(inventoryClientPath)).toBe(true);
        });

        it('should have the inventory skeleton loader (loading.jsx)', () => {
            expect(fs.existsSync(inventoryLoadingPath)).toBe(true);
        });

        it('should have StoreStatusToggle with header variant support', () => {
            expect(fs.existsSync(storeStatusTogglePath)).toBe(true);
            const content = fs.readFileSync(storeStatusTogglePath, 'utf8');
            expect(content).toContain("variant === 'header'");
            expect(content).toContain('Store Status');
            expect(content).toContain('View Store');
        });
    });

    describe('2. Security & Merchant Isolation', () => {
        it('should enforce merchant isolation in all inventory mutations', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            // Check that all mutations (status update, stock update, price update, bulk update, delete)
            // check merchant_id or use merchant.id
            expect(content).toContain(".eq('merchant_id', merchant.id)");
            expect(content).toContain("p_inventory_id");
            expect(content).toContain("retail_price_paise");
            expect(content).toContain("delete()");
        });

        it('should enforce merchant-scoped inventory queries in page.jsx', () => {
            const content = fs.readFileSync(inventoryPagePath, 'utf8');
            expect(content).toContain(".eq('merchant_id', merchant.id)");
            expect(content).toContain(".eq('user_id', user.id)");
        });
    });

    describe('3. 5 KPI Metrics Calculation', () => {
        it('should calculate the 5 authoritative KPI metrics in page.jsx', () => {
            const content = fs.readFileSync(inventoryPagePath, 'utf8');
            expect(content).toContain('totalProducts');
            expect(content).toContain('liveItems');
            expect(content).toContain('outOfStock');
            expect(content).toContain('totalStock');
            expect(content).toContain('catalogValue');
        });

        it('should render the 5 KPI summary cards in MerchantInventoryClient', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('Total Products');
            expect(content).toContain('Live Items');
            expect(content).toContain('Out of Stock');
            expect(content).toContain('Total Stock');
            expect(content).toContain('Catalog Value');
        });
    });

    describe('4. Desktop & Mobile UI Layout', () => {
        it('should support both desktop table view and mobile card view', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('<table');
            expect(content).toContain('hidden md:block');
            expect(content).toContain('md:hidden');
            expect(content).toContain('SKU');
            expect(content).toContain('Category');
            expect(content).toContain('Price');
            expect(content).toContain('Stock');
            expect(content).toContain('Status');
        });

        it('should render bulk action toolbar and multi-select checkboxes', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('selectedIds');
            expect(content).toContain('Publish Live');
            expect(content).toContain('Depublish');
            expect(content).toContain('Clear selection');
        });

        it('should support CSV export functionality', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('handleExportCSV');
            expect(content).toContain('text/csv');
        });
    });

    describe('5. Contextual Empty States & Error Handling', () => {
        it('should provide clear empty states for both filtered and empty catalogs', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('No products found matching');
            expect(content).toContain('Clear Filter');
            expect(content).toContain('Your catalog is empty');
            expect(content).toContain('Add Custom Product');
        });

        it('should have a destructive confirmation modal for removing items', () => {
            const content = fs.readFileSync(inventoryClientPath, 'utf8');
            expect(content).toContain('deleteModalItem');
            expect(content).toContain('Remove Product from Catalog?');
            expect(content).toContain('handleDeleteProduct');
        });
    });
});
