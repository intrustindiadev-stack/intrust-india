'use client';

import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const WholesaleCartContext = createContext(null);

export const formatINR = (value) =>
    Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * WholesaleCartProvider — Single source of truth for Merchant Wholesale Shopping cart.
 *
 * Canonical financial units are PAISE (int).
 * UI displays formatted rupees (₹) at render time only.
 */
export function WholesaleCartProvider({
    products = [],
    merchant,
    children,
    onFlyAnimation,
}) {
    // cartMap: { [productId]: quantity }
    const [cartMap, setCartMap] = useState({});
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

    // Derived cart items
    const cartItems = useMemo(() => {
        return Object.entries(cartMap)
            .map(([id, qty]) => {
                const product = products.find((p) => p.id === id);
                if (!product || qty <= 0) return null;

                const unit_price_paise = Number(product.wholesale_price_paise) || 0;
                const retail_price_paise = Math.max(
                    Number(product.suggested_retail_price_paise) || 0,
                    Number(product.mrp_paise) || 0,
                    Number(product.platform_price_paise) || 0
                );
                const gst_percentage = Number(product.gst_percentage) || 0;

                return {
                    id: product.id,
                    title: product.title,
                    unit_price_paise,
                    retail_price_paise,
                    quantity: qty,
                    gst_percentage,
                    // Legacy rupee representations for backwards compatibility
                    unit_price: unit_price_paise / 100,
                    wholesale_price: unit_price_paise / 100,
                    retail_price: retail_price_paise / 100,
                    product,
                };
            })
            .filter(Boolean);
    }, [cartMap, products]);

    // Derived totals in PAISE (canonical)
    const cartTotalPaise = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.unit_price_paise * item.quantity, 0);
    }, [cartItems]);

    const gstTotalPaise = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const itemGst = Math.round((item.unit_price_paise * item.quantity * item.gst_percentage) / 100);
            return sum + itemGst;
        }, 0);
    }, [cartItems]);

    const grandTotalPaise = useMemo(() => {
        return cartTotalPaise + gstTotalPaise;
    }, [cartTotalPaise, gstTotalPaise]);

    const totalUnits = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);

    const lineCount = cartItems.length;

    // Wholesale Margin / Upside calculation (in PAISE)
    const estimatedMarginTotal = useMemo(() => {
        const totalRetailPaise = cartItems.reduce(
            (sum, item) => sum + item.retail_price_paise * item.quantity,
            0
        );
        return Math.max(0, totalRetailPaise - cartTotalPaise);
    }, [cartItems, cartTotalPaise]);

    const estimatedMarginPercent = useMemo(() => {
        return cartTotalPaise > 0 ? Math.round((estimatedMarginTotal / cartTotalPaise) * 100) : 0;
    }, [estimatedMarginTotal, cartTotalPaise]);

    const merchantBalancePaise = Number(merchant?.wallet_balance_paise) || 0;
    const merchantBalance = merchantBalancePaise / 100;

    // Cart actions
    const updateQuantity = useCallback((product, delta, evt) => {
        if (!product?.id) return;
        const productId = product.id;
        const maxStock = Number(product.admin_stock) || 0;

        // Trigger fly-to-cart animation on add if callback provided
        if (delta > 0 && evt && onFlyAnimation) {
            onFlyAnimation(evt, product);
        }

        setCartMap((prev) => {
            const currentQty = prev[productId] || 0;
            const newQty = Math.max(0, Math.min(maxStock, currentQty + delta));

            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [productId]: newQty };
        });
    }, [onFlyAnimation]);

    const addToCart = useCallback((product, qty = 1, evt) => {
        updateQuantity(product, qty, evt);
    }, [updateQuantity]);

    const decrement = useCallback((productId) => {
        setCartMap((prev) => {
            const currentQty = prev[productId] || 0;
            const newQty = currentQty - 1;
            if (newQty <= 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: newQty };
        });
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCartMap((prev) => {
            const { [productId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const clearCart = useCallback(() => {
        setCartMap({});
    }, []);

    const toggleCartDrawer = useCallback(() => {
        setCartDrawerOpen((prev) => !prev);
    }, []);

    const value = useMemo(() => ({
        cartMap,
        cartItems,
        cartTotalPaise,
        gstTotalPaise,
        grandTotalPaise,
        totalUnits,
        lineCount,
        estimatedMarginTotal,
        estimatedMarginPercent,
        merchantBalancePaise,
        merchantBalance,
        isDrawerOpen: cartDrawerOpen,
        cartDrawerOpen,
        setCartDrawerOpen,
        toggleCartDrawer,
        addToCart,
        decrement,
        removeFromCart,
        clearCart,
        updateQuantity,
    }), [
        cartMap,
        cartItems,
        cartTotalPaise,
        gstTotalPaise,
        grandTotalPaise,
        totalUnits,
        lineCount,
        estimatedMarginTotal,
        estimatedMarginPercent,
        merchantBalancePaise,
        merchantBalance,
        cartDrawerOpen,
        toggleCartDrawer,
        addToCart,
        decrement,
        removeFromCart,
        clearCart,
        updateQuantity,
    ]);

    return (
        <WholesaleCartContext.Provider value={value}>
            {children}
        </WholesaleCartContext.Provider>
    );
}

const defaultContext = {
    cartMap: {},
    cartItems: [],
    cartTotalPaise: 0,
    gstTotalPaise: 0,
    grandTotalPaise: 0,
    totalUnits: 0,
    lineCount: 0,
    estimatedMarginTotal: 0,
    estimatedMarginPercent: 0,
    merchantBalancePaise: 0,
    merchantBalance: 0,
    isDrawerOpen: false,
    cartDrawerOpen: false,
    setCartDrawerOpen: () => {},
    toggleCartDrawer: () => {},
    addToCart: () => {},
    decrement: () => {},
    removeFromCart: () => {},
    clearCart: () => {},
    updateQuantity: () => {},
};

export function useWholesaleCart() {
    const ctx = useContext(WholesaleCartContext);
    return ctx || defaultContext;
}
