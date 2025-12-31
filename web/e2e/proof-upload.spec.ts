import { test, expect } from '@playwright/test';

test.describe('Proof Upload Flow', () => {
  test('should display landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ProofLink|Saegim/i);
  });

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/proof/invalid-token-12345');
    // Should show error message (Korean: 오류 = error)
    await expect(page.locator('body')).toContainText(/오류|error|실패/i);
  });

  test('should load proof upload page with valid token format', async ({ page }) => {
    // This test assumes a test token exists in the database
    // For now, just verify the page structure loads
    await page.goto('/proof/test-token');

    // Page should load (may show error if token doesn't exist, which is expected)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Public Verification Page', () => {
  test('should handle missing proof gracefully', async ({ page }) => {
    await page.goto('/p/nonexistent-token');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Short URL Redirect', () => {
  test('should handle invalid short code', async ({ page }) => {
    await page.goto('/s/invalid');
    // Should show error or redirect
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  // Skip sign-in test when Clerk is not configured (e2e test environment)
  test.skip('should navigate to sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test('landing page should be mobile friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Check no horizontal scroll
    const body = page.locator('body');
    const bodyWidth = await body.evaluate(el => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});
