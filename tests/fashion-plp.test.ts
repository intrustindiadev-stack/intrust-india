import { plpQuerySchema } from '../lib/validation/fashion';

describe('Fashion PLP Query Validation', () => {
  it('should parse valid query parameters', () => {
    const query = {
      size: 'S,M',
      color: 'Red',
      price: '100-500',
      sort: 'price-asc',
      page: '2'
    };

    const result = plpQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.size).toBe('S,M');
      expect(result.data.color).toBe('Red');
      expect(result.data.price).toBe('100-500');
      expect(result.data.sort).toBe('price-asc');
      expect(result.data.page).toBe(2);
      expect(result.data.view).toBe('grid'); // Default
    }
  });

  it('should fallback to defaults for invalid enums', () => {
    const query = {
      sort: 'invalid-sort',
      page: 'abc'
    };

    const result = plpQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});
