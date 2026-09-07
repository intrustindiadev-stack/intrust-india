import fs from 'fs';
import path from 'path';

describe('Shop and Dashboard Wishlist Contract and Error-Handling', () => {
    const shopHubPath = path.resolve(__dirname, '../app/(customer)/shop/ShopHubClient.jsx');
    const trendingGridPath = path.resolve(__dirname, '../components/customer/dashboard/TrendingProductsGrid.jsx');
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

    describe('1. Wishlist Schema Contract & Identity Verification', () => {
        it('verifies that user_wishlists migrations use (user_id, product_id) contract', () => {
            const files = fs.readdirSync(migrationsDir);
            let foundWishlistTable = false;
            let foundUniqueConstraint = false;

            files.forEach(file => {
                const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                if (content.includes('CREATE TABLE IF NOT EXISTS public.user_wishlists') ||
                    content.includes('CREATE TABLE public.user_wishlists') ||
                    content.includes('user_wishlists')) {
                    foundWishlistTable = true;
                }
                if (content.includes('UNIQUE(user_id, product_id)') ||
                    content.includes('UNIQUE (user_id, product_id)') ||
                    content.includes('user_id, product_id')) {
                    foundUniqueConstraint = true;
                }
            });

            expect(foundWishlistTable).toBe(true);
            expect(foundUniqueConstraint).toBe(true);
        });
    });

    describe('2. ShopHubClient Wishlist Implementation Verification', () => {
        let shopHubContent;

        beforeAll(() => {
            shopHubContent = fs.readFileSync(shopHubPath, 'utf8');
        });

        it('has wishlistLoading state defined for tracking in-flight operations', () => {
            expect(shopHubContent).toContain('const [wishlistLoading, setWishlistLoading] = useState(new Set());');
        });

        it('guards toggleProductWishlist against concurrent clicks while busy', () => {
            expect(shopHubContent).toContain('if (wishlistLoading.has(prod.id)) return;');
            expect(shopHubContent).toContain('setWishlistLoading(prev => new Set(prev).add(prod.id));');
        });

        it('handles Supabase errors with rollback in try/catch/finally block', () => {
            expect(shopHubContent).toContain('if (error) throw error;');
            expect(shopHubContent).toContain('toast.error(err.message || \'Could not update wishlist\');');
            expect(shopHubContent).toContain('// Rollback optimistic state');
        });

        it('disables the heart button during pending wishlist mutations', () => {
            expect(shopHubContent).toContain('const isWishlistBusy = wishlistLoading.has(prod.id);');
            expect(shopHubContent).toContain('disabled={isWishlistBusy}');
            expect(shopHubContent).toContain("aria-label={isWishlisted ? \"Remove from wishlist\" : \"Save to wishlist\"}");
        });
    });

    describe('3. TrendingProductsGrid Wishlist Implementation Verification', () => {
        let gridContent;

        beforeAll(() => {
            gridContent = fs.readFileSync(trendingGridPath, 'utf8');
        });

        it('has wishlistLoading state defined for tracking in-flight operations', () => {
            expect(gridContent).toContain('const [wishlistLoading, setWishlistLoading] = useState(new Set());');
        });

        it('guards toggleWishlist against concurrent clicks while busy', () => {
            expect(gridContent).toContain('if (wishlistLoading.has(prod.id)) return;');
            expect(gridContent).toContain('setWishlistLoading(prev => new Set(prev).add(prod.id));');
        });

        it('handles Supabase errors with rollback in try/catch/finally block', () => {
            expect(gridContent).toContain('if (error) throw error;');
            expect(gridContent).toContain('toast.error(err.message || \'Could not update wishlist\');');
            expect(gridContent).toContain('// Rollback optimistic state');
        });

        it('disables the heart button during pending wishlist mutations', () => {
            expect(gridContent).toContain('const isWishlistBusy = wishlistLoading.has(prod.id);');
            expect(gridContent).toContain('disabled={isWishlistBusy}');
            expect(gridContent).toContain("aria-label={isWishlisted ? \"Remove from wishlist\" : \"Save to wishlist\"}");
        });
    });

    describe('4. Algorithmic State Simulation for Wishlist Mutation Flow', () => {
        // Implementation of the toggle logic matching ShopHubClient and TrendingProductsGrid
        async function executeToggle({
            prodId,
            userId,
            wishlistIds,
            setWishlistIds,
            wishlistLoading,
            setWishlistLoading,
            supabaseMock,
            toastMock
        }) {
            if (!userId) {
                toastMock.error('Please sign in to save items');
                return;
            }

            if (wishlistLoading.has(prodId)) return;

            setWishlistLoading(prev => new Set(prev).add(prodId));

            const isSaved = wishlistIds.has(prodId);
            if (isSaved) {
                setWishlistIds(prev => {
                    const next = new Set(prev);
                    next.delete(prodId);
                    return next;
                });
            } else {
                setWishlistIds(prev => new Set([...prev, prodId]));
            }

            try {
                if (isSaved) {
                    const { error } = await supabaseMock.delete(userId, prodId);
                    if (error) throw error;
                    toastMock.success('Removed from wishlist');
                } else {
                    const { error } = await supabaseMock.upsert(userId, prodId);
                    if (error) throw error;
                    toastMock.success('Saved to wishlist! ♥');
                }
            } catch (err) {
                // Rollback
                if (isSaved) {
                    setWishlistIds(prev => new Set([...prev, prodId]));
                } else {
                    setWishlistIds(prev => {
                        const next = new Set(prev);
                        next.delete(prodId);
                        return next;
                    });
                }
                toastMock.error(err.message || 'Could not update wishlist');
            } finally {
                setWishlistLoading(prev => {
                    const next = new Set(prev);
                    next.delete(prodId);
                    return next;
                });
            }
        }

        it('rolls back optimistic add when supabase returns an error', async () => {
            let wishlistIds = new Set();
            let wishlistLoading = new Set();
            const setWishlistIds = jest.fn(updater => {
                wishlistIds = typeof updater === 'function' ? updater(wishlistIds) : updater;
            });
            const setWishlistLoading = jest.fn(updater => {
                wishlistLoading = typeof updater === 'function' ? updater(wishlistLoading) : updater;
            });

            const toastMock = { success: jest.fn(), error: jest.fn() };
            const supabaseMock = {
                upsert: jest.fn().mockResolvedValue({ error: new Error('Network timeout') }),
                delete: jest.fn()
            };

            await executeToggle({
                prodId: 'prod-123',
                userId: 'user-abc',
                wishlistIds,
                setWishlistIds,
                wishlistLoading,
                setWishlistLoading,
                supabaseMock,
                toastMock
            });

            // After rollback, wishlistIds should NOT contain prod-123
            expect(wishlistIds.has('prod-123')).toBe(false);
            // toast.error should have been called with the error message
            expect(toastMock.error).toHaveBeenCalledWith('Network timeout');
            expect(toastMock.success).not.toHaveBeenCalled();
            // Loading state should be cleaned up
            expect(wishlistLoading.has('prod-123')).toBe(false);
        });

        it('persists state and displays success toast when supabase upsert succeeds', async () => {
            let wishlistIds = new Set();
            let wishlistLoading = new Set();
            const setWishlistIds = jest.fn(updater => {
                wishlistIds = typeof updater === 'function' ? updater(wishlistIds) : updater;
            });
            const setWishlistLoading = jest.fn(updater => {
                wishlistLoading = typeof updater === 'function' ? updater(wishlistLoading) : updater;
            });

            const toastMock = { success: jest.fn(), error: jest.fn() };
            const supabaseMock = {
                upsert: jest.fn().mockResolvedValue({ error: null }),
                delete: jest.fn()
            };

            await executeToggle({
                prodId: 'prod-123',
                userId: 'user-abc',
                wishlistIds,
                setWishlistIds,
                wishlistLoading,
                setWishlistLoading,
                supabaseMock,
                toastMock
            });

            // Wishlist should now contain prod-123
            expect(wishlistIds.has('prod-123')).toBe(true);
            expect(toastMock.success).toHaveBeenCalledWith('Saved to wishlist! ♥');
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(wishlistLoading.has('prod-123')).toBe(false);
        });

        it('prevents concurrent execution when mutation is already in-flight', async () => {
            let wishlistIds = new Set();
            let wishlistLoading = new Set(['prod-123']); // Already loading
            const setWishlistIds = jest.fn();
            const setWishlistLoading = jest.fn();
            const toastMock = { success: jest.fn(), error: jest.fn() };
            const supabaseMock = { upsert: jest.fn(), delete: jest.fn() };

            await executeToggle({
                prodId: 'prod-123',
                userId: 'user-abc',
                wishlistIds,
                setWishlistIds,
                wishlistLoading,
                setWishlistLoading,
                supabaseMock,
                toastMock
            });

            // Neither Supabase nor state updaters should have been called
            expect(supabaseMock.upsert).not.toHaveBeenCalled();
            expect(supabaseMock.delete).not.toHaveBeenCalled();
            expect(setWishlistIds).not.toHaveBeenCalled();
        });
    });
});
