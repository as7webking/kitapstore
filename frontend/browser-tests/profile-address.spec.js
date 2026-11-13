import { test, expect } from '@playwright/test';
import en from '../src/i18n/locales/en/profile.json' with { type: 'json' };
import de from '../src/i18n/locales/de/profile.json' with { type: 'json' };
import qt from '../src/i18n/locales/qt/profile.json' with { type: 'json' };
import ru from '../src/i18n/locales/ru/profile.json' with { type: 'json' };

import enCommon from '../src/i18n/locales/en/common.json' with { type: 'json' };
import deCommon from '../src/i18n/locales/de/common.json' with { type: 'json' };
import qtCommon from '../src/i18n/locales/qt/common.json' with { type: 'json' };
import ruCommon from '../src/i18n/locales/ru/common.json' with { type: 'json' };
const dictionaries = { en, de, qt, ru };
const common = { en: enCommon, de: deCommon, qt: qtCommon, ru: ruCommon };
const origin = 'http://127.0.0.1:5197';
const profile = { _id: '507f1f77bcf86cd799439011', username: 'Test Reader', email: 'reader@example.test', address: 'Initial test address', role: 'user', avatar: '' };

async function fixture(page, language) {
  const state = { mode: 'success', writes: [], unexpected: [], release: null };
  await page.addInitScript(({ language, profile }) => {
    const token = `synthetic.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic`;
    localStorage.setItem('token', token); localStorage.setItem('id', profile._id);
    localStorage.setItem('role', 'user'); localStorage.setItem('kitapstore.language', language);
    sessionStorage.setItem('kitapstore.checkout.synthetic', 'preserve-test-cart-attempt');
  }, { language, profile });
  // No route.fetch(): every API is mocked; unexpected traffic fails closed.
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) { state.unexpected.push('external request'); return route.abort(); }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/v1/user/get-user-information' && request.method() === 'GET') return route.fulfill({ json: profile });
    if (url.pathname === '/api/v1/favourites/get-favourite-books' && request.method() === 'GET') return route.fulfill({ json: { data: [] } });
    if (url.pathname === '/api/v1/user/get-user-information' && request.method() === 'PUT') {
      const body = request.postDataJSON();
      state.writes.push(body);
      expect(Object.keys(body)).toEqual(['address']);
      if (state.mode === 'offline') return route.abort('internetdisconnected');
      if (state.mode === 'validation') return route.fulfill({ status: 400, json: { code: 'PROFILE_ADDRESS_INVALID', fieldCodes: { address: 'PROFILE_ADDRESS_INVALID' } } });
      if (state.mode === 'pending') await new Promise((resolve) => { state.release = resolve; });
      return route.fulfill({ json: { code: 'PROFILE_ADDRESS_UPDATED', address: body.address.trim() } });
    }
    state.unexpected.push(`${request.method()} ${url.pathname}`);
    return route.abort();
  });
  await page.goto('/profile/settings');
  await expect(page.locator('#profile-address')).toHaveValue(profile.address);
  return state;
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = await page.locator('#profile-address').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
}
for (const [language, text] of Object.entries(dictionaries)) {
  test.describe(language, () => {
    test('draft survives language changes and network failure, then saves successfully', async ({ page }) => {
      const state = await fixture(page, language);
      const address = page.locator('#profile-address');
      const draft = 'Synthetic test address\nBerlin 12345';
      await address.fill(draft);
      for (const next of ['en', 'de', 'qt', 'ru', language]) {
        await page.locator('#site-language').selectOption(next);
        await expect(address).toHaveValue(draft);
        await expect(page.getByRole('button', { name: dictionaries[next].update, exact: true })).toBeVisible();
        await noOverflow(page);
      }
      state.mode = 'offline';
      await page.getByRole('button', { name: text.update, exact: true }).click();
      await expect(page.locator('#profile-address-error')).toHaveText(common[language].network_error);
      await expect(address).toHaveValue(draft);
      await expect(address).toBeFocused();
      // Already displayed API errors must translate without losing the draft.
      state.mode = 'validation';
      await page.getByRole('button', { name: text.update, exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText(text.address_invalid);
      const next = language === 'de' ? 'ru' : 'de';
      await page.locator('#site-language').selectOption(next);
      await expect(page.getByRole('alert')).toHaveText(dictionaries[next].address_invalid);
      await expect(address).toHaveValue(draft);
      state.mode = 'success';
      await page.getByRole('button', { name: dictionaries[next].update, exact: true }).click();
      await expect(page.getByRole('status')).toHaveText(dictionaries[next].address_updated);
      await expect(address).toHaveValue(draft);
      expect(await page.evaluate(() => Boolean(localStorage.getItem('token')))).toBe(true);
      expect(await page.evaluate(() => sessionStorage.getItem('kitapstore.checkout.synthetic'))).toBe('preserve-test-cart-attempt');
      expect(state.unexpected).toEqual([]);
    });
    test('pending write disables editing and duplicate submit without extra requests', async ({ page }) => {
      const state = await fixture(page, language);
      state.mode = 'pending';
      const address = page.locator('#profile-address');
      await address.fill('Pending synthetic address');
      const button = page.getByRole('button', { name: text.update, exact: true });
      await button.click();
      await expect(page.getByRole('button', { name: text.saving_address, exact: true })).toBeDisabled();
      await expect(address).toHaveAttribute('readonly', '');
      await expect.poll(() => state.writes.length).toBe(1);
      await expect.poll(() => typeof state.release).toBe('function');
      // Bypass the disabled button to exercise the submission guard as well.
      await address.evaluate((element) => { element.form.requestSubmit(); element.form.requestSubmit(); });
      expect(state.writes).toHaveLength(1);
      state.release();
      await expect(page.getByRole('status')).toHaveText(text.address_updated);
      expect(state.writes).toHaveLength(1);
      expect(state.unexpected).toEqual([]);
    });
    test('Tab, Shift+Tab, Enter and invalid-address focus', async ({ page }) => {
      const state = await fixture(page, language);
      const address = page.locator('#profile-address');
      const button = page.getByRole('button', { name: text.update, exact: true });
      await address.focus();
      await page.keyboard.press('Tab'); await expect(button).toBeFocused();
      expect(await button.evaluate((element) => { const style = getComputedStyle(element); return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0; })).toBe(true);
      await page.keyboard.press('Shift+Tab'); await expect(address).toBeFocused();
      await address.fill('');
      await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
      await expect(address).toBeFocused();
      await expect(address).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert')).toHaveText(text.address_invalid);
      expect(state.writes).toHaveLength(0);
      await address.fill('Keyboard synthetic address');
      // Enter in a textarea is a newline, not an accidental submission.
      await page.keyboard.press('End'); await page.keyboard.press('Enter');
      await expect(address).toHaveValue('Keyboard synthetic address\n');
      expect(state.writes).toHaveLength(0);
      await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
      await expect(page.getByRole('status')).toHaveText(text.address_updated);
      await noOverflow(page);
      expect(state.unexpected).toEqual([]);
    });
  });
}
