const { test, expect } = require('@playwright/test');

test.describe('Fashion PLP', () => {
  test('should navigate to category and apply filters', async ({ page }) => {
    // Navigate to the seeded fashion category
    await page.goto('/shop/fashion/women/clothing/dresses/midi-dresses');
    
    // Expect the Hero title to be present
    await expect(page.locator('h1')).toContainText('Midi Dresses');
    
    // Check mega menu is present
    await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible();

    // Verify product card is visible (Floral Summer Midi Dress)
    await expect(page.getByText('Floral Summer Midi Dress')).toBeVisible();

    // Open filter drawer
    await page.getByRole('button', { name: /Filters/ }).click();
    
    // Check if drawer is open
    await expect(page.getByRole('dialog', { name: 'Filter & Sort' })).toBeVisible();

    // Click a size filter (assuming 'S' is a size)
    await page.getByRole('button', { name: /^S$/ }).click();
    
    // Apply filters
    await page.getByRole('button', { name: /Apply/ }).click();

    // Verify URL updated
    await expect(page).toHaveURL(/size=S/);
  });

  test('should open quick add sheet and simulate add to cart', async ({ page }) => {
    await page.goto('/shop/fashion/women/clothing/dresses/midi-dresses');
    
    // Desktop quick add is revealed on hover, but Playwright can force click
    // For mobile, it's a visible button. We'll use the visible button text.
    await page.getByRole('button', { name: 'Quick Add' }).first().click();

    // Verify sheet is open
    await expect(page.getByRole('dialog', { name: 'Add to Cart' })).toBeVisible();
    
    // Select a size
    const sizeButton = page.getByRole('button', { name: /^S$/ });
    await sizeButton.click();

    // Click Add to Cart
    const addButton = page.getByRole('button', { name: 'Add to Cart' }).nth(1);
    await addButton.click();

    // Expect success state
    await expect(page.getByText('Added to Cart')).toBeVisible({ timeout: 5000 });
  });
});
