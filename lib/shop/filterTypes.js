/**
 * @typedef {Object} FilterConfig
 * @property {string} id - The URL query parameter key (e.g. 'brand', 'size')
 * @property {string} label - The human-readable name (e.g. 'Brand', 'Size')
 * @property {'checkbox' | 'swatch' | 'pills' | 'range'} type - The UI component to use
 * @property {Array<{label: string, value: string, hex?: string}>} options - The predefined options
 */

/** @type {FilterConfig[]} */
export const STOREFRONT_FILTERS = [
    {
        id: 'brand',
        label: 'Brand',
        type: 'checkbox',
        options: [
            { label: 'Nike', value: 'nike' },
            { label: 'Adidas', value: 'adidas' },
            { label: 'Puma', value: 'puma' },
            { label: 'Levi\'s', value: 'levis' },
            { label: 'Zara', value: 'zara' },
            { label: 'H&M', value: 'hm' }
        ]
    },
    {
        id: 'size',
        label: 'Size',
        type: 'pills',
        options: [
            { label: 'XS', value: 'xs' },
            { label: 'S', value: 's' },
            { label: 'M', value: 'm' },
            { label: 'L', value: 'l' },
            { label: 'XL', value: 'xl' },
            { label: 'XXL', value: 'xxl' }
        ]
    },
    {
        id: 'color',
        label: 'Color',
        type: 'swatch',
        options: [
            { label: 'Black', value: 'black', hex: '#000000' },
            { label: 'White', value: 'white', hex: '#ffffff' },
            { label: 'Red', value: 'red', hex: '#ef4444' },
            { label: 'Blue', value: 'blue', hex: '#3b82f6' },
            { label: 'Green', value: 'green', hex: '#22c55e' },
            { label: 'Yellow', value: 'yellow', hex: '#eab308' }
        ]
    }
];

export const VALID_FILTER_KEYS = ['category', 'sub_category', 'search', 'page', 'brand', 'size', 'color', 'min_price', 'max_price'];
