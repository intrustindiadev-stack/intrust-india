export const OOS_LABEL = 'Out of Stock';

export function isPlatformProductOOS(product) {
    return (product?.admin_stock ?? 0) <= 0;
}

export function isInventoryRowOOS(row) {
    return row?.is_active === false || (row?.stock_quantity ?? 0) <= 0;
}

export function isStorefrontItemOOS(item) {
    if (item?.is_platform_direct === true) {
        return isPlatformProductOOS(item.shopping_products);
    }
    return isInventoryRowOOS(item);
}

export function isPdpProductOOS({ product, inventory }) {
    const platformOOS = isPlatformProductOOS(product);
    
    if (!inventory || inventory.length === 0) {
        return platformOOS;
    }

    const allInventoryOOS = inventory.every(row => isInventoryRowOOS(row));
    return platformOOS && allInventoryOOS;
}
