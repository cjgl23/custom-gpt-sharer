import { chromium } from 'playwright-core';
import { SELECTORS, getFirstSelector, waitForAnySelector, WAIT_TIMES } from './selectors.js';
import { Utils } from './utils.js';

export class GPTSharer {
  constructor(options) {
    this.options = options;
    this.browser = null;
    this.context = null;
    this.page = null;
    this._antiBotNotified = false;
  }

  async waitForAntiBotChallengeToClear(maxWaitMs = 10 * 60 * 1000) {
    // Cloudflare / anti-bot pages can block automation until user completes the check.
    // We detect common text/title patterns and wait (headful) until it clears.
    const isChallengeVisible = async () => {
      const url = this.page.url().toLowerCase();
      const urlLooksLikeChallenge = url.includes('/cdn-cgi/') || url.includes('challenge-platform');

      let titleLooksLikeChallenge = false;
      try {
        const title = (await this.page.title()).toLowerCase();
        titleLooksLikeChallenge =
          title.includes('just a moment') ||
          title.includes('checking your browser') ||
          title.includes('attention required');
      } catch {
        // ignore
      }

      const turnstileIframe = this.page.locator('iframe[src*="challenges.cloudflare.com"]').first();
      const turnstileInputs = this.page.locator('input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]').first();

      let hasTurnstile = false;
      try {
        hasTurnstile = (await turnstileIframe.isVisible({ timeout: 300 })) || (await turnstileInputs.isVisible({ timeout: 300 }));
      } catch {
        hasTurnstile = false;
      }

      // Text-only checks can be noisy; keep them as a last resort.
      const challengeTexts = this.page.locator(
        'text=/checking your browser/i, text=/just a moment/i, text=/verify you are human/i, text=/are you human/i'
      ).first();
      let hasChallengeText = false;
      try {
        hasChallengeText = await challengeTexts.isVisible({ timeout: 300 });
      } catch {
        hasChallengeText = false;
      }

      return urlLooksLikeChallenge || titleLooksLikeChallenge || hasTurnstile || hasChallengeText;
    };

    if (!(await isChallengeVisible())) {
      this._antiBotNotified = false;
      return;
    }

    if (!this._antiBotNotified) {
      console.log('⚠️  Cloudflare / anti-bot check detected.');
      console.log('👉 Complete it in the opened Chrome window. The script will continue once the page redirects back.');
      this._antiBotNotified = true;
    }

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (!(await isChallengeVisible())) {
        console.log('✅ Anti-bot check cleared');
        this._antiBotNotified = false;
        return;
      }
      await Utils.randomDelay(1500, 2500);
    }

    throw new Error('Anti-bot check did not clear in time. Please complete it and re-run.');
  }

  async initialize() {
    console.log('Initializing Chrome...');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const userDataDir = this.options.profileDir;

    try {
      // Ensure the user data directory exists
      const createdProfileDir = Utils.ensureDirectoryExists(userDataDir);
      if (createdProfileDir) {
        console.log('\n⚠️  First run detected (new Chrome profile directory created).');
        console.log('You may need to complete ONE-TIME manual steps in the opened Chrome window:');
        console.log('- Cloudflare "are you human" check (if shown)');
        console.log('- ChatGPT login');
        console.log('Once completed, the automation will continue.\n');
      }

      // IMPORTANT: To use a real Chrome profile directory, Playwright requires a persistent context.
      this.context = await chromium.launchPersistentContext(userDataDir, {
        executablePath: chromePath,
        headless: false, // Run in headful mode to allow user interaction/login
        args: [
          '--no-sandbox', // Recommended for some environments
        ],
        timeout: WAIT_TIMES.EXTRA_LONG * 6
      });

      // Keep a browser reference for backward compatibility (contexts expose browser())
      this.browser = this.context.browser();

      // Get the first page or create a new one
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

      console.log('✅ Chrome launched and connected successfully');
      console.log(`Using Chrome profile: ${userDataDir}`);

    } catch (error) {
      throw new Error(`Failed to launch or connect to Chrome: ${error.message}`);
    }
  }

  async ensureLoggedIn() {
    console.log('Checking ChatGPT login status...');

    // Always start at the homepage first to validate auth state.
    await this.page.goto('https://chatgpt.com', {
      waitUntil: 'domcontentloaded',
      timeout: WAIT_TIMES.EXTRA_LONG * 6
    });

    await Utils.randomDelay(1500, 2500);
    await this.waitForAntiBotChallengeToClear();

    const isLoggedOut = async () => {
      const url = this.page.url().toLowerCase();
      if (url.includes('/auth') || url.includes('login')) return true;

      const loginCtas = this.page.locator(
        'a:has-text("Log in"), button:has-text("Log in"), a:has-text("Sign up"), button:has-text("Sign up")'
      );

      try {
        return await loginCtas.first().isVisible({ timeout: 1000 });
      } catch {
        return false;
      }
    };

    if (await isLoggedOut()) {
      console.log('⚠️  You are not logged into ChatGPT yet.');
      console.log('👉 Please complete login in the opened Chrome window. Waiting up to 10 minutes...');

      const start = Date.now();
      const timeoutMs = 10 * 60 * 1000;

      while (Date.now() - start < timeoutMs) {
        await this.waitForAntiBotChallengeToClear(60 * 1000).catch(() => {});
        if (!(await isLoggedOut())) {
          console.log('✅ Login detected');
          return;
        }
        await Utils.randomDelay(1500, 2500);
      }

      throw new Error('Login was not completed in time. Please login to chatgpt.com and re-run.');
    }

    console.log('✅ ChatGPT appears to be logged in');
  }

  async navigateToGPTEditor() {
    // Validate login first, then go to the editor URL.
    await this.ensureLoggedIn();
    console.log(`Navigating to: ${this.options.url}`);

    try {
      await this.page.goto(this.options.url, {
        waitUntil: 'domcontentloaded',
        timeout: WAIT_TIMES.EXTRA_LONG * 6
      });

      // Wait a bit for dynamic content to load
      await Utils.randomDelay(2000, 3000);
      await this.waitForAntiBotChallengeToClear();

      // If we landed on the generic ChatGPT page after navigation (e.g., after login redirect),
      // try navigating to the specific GPT editor URL again.
      if (!this.page.url().includes('/gpts/editor/') && this.page.url().includes('chatgpt.com')) {
        console.log('⚠️  Landed on generic ChatGPT page, re-navigating to editor URL...');
        await this.page.goto(this.options.url, {
          waitUntil: 'domcontentloaded',
          timeout: WAIT_TIMES.EXTRA_LONG * 6
        });
        await Utils.randomDelay(2000, 3000); // Additional delay after re-navigation
        await this.waitForAntiBotChallengeToClear();
      }

      // Verify we're on the GPT editor page
      const isOnEditor = await this.page.url().includes('/gpts/editor/');
      if (!isOnEditor) {
        throw new Error('Not on GPT editor page. Please check the URL and ensure you are logged in.');
      }

      console.log('✅ Successfully loaded GPT editor');
    } catch (error) {
      throw new Error(`Failed to navigate to GPT editor: ${error.message}`);
    }
  }

  async clickShareButton() {
    console.log('Looking for Share button...');

    const findShareButton = async () => {
      // Wait for any known Share selector to become visible (editor can take a while to hydrate).
      await waitForAnySelector(this.page, SELECTORS.shareButtons, WAIT_TIMES.EXTRA_LONG * 3);
      return await getFirstSelector(this.page, SELECTORS.shareButtons);
    };

    let shareButton = await findShareButton();

    // If we just passed an anti-bot redirect, the editor UI sometimes needs a reload to hydrate the top bar.
    if (!shareButton) {
      console.log('⚠️  Share button not detected yet; waiting and retrying once...');
      await Utils.randomDelay(3000, 4500);
      await this.waitForAntiBotChallengeToClear().catch(() => {});
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: WAIT_TIMES.EXTRA_LONG * 6 }).catch(() => {});
      await Utils.randomDelay(2000, 3000);
      shareButton = await findShareButton();
    }

    if (!shareButton) {
      throw new Error('Share button not found. Please ensure you\'re on a GPT editor page.');
    }

    try {
      await shareButton.scrollIntoViewIfNeeded().catch(() => {});
      await shareButton.click({ timeout: WAIT_TIMES.EXTRA_LONG * 3 });
      console.log('✅ Clicked Share button');

      // Wait for share modal to appear
      await Utils.randomDelay(1000, 2000);

      // Some versions don't expose a nice dialog selector; the presence of the known input is a strong signal.
      const modalVisible = await waitForAnySelector(
        this.page,
        [...SELECTORS.shareModal, 'input#share-with-input'],
        WAIT_TIMES.EXTRA_LONG * 3
      );
      if (!modalVisible) {
        throw new Error('Share modal did not appear after clicking Share button');
      }

      console.log('✅ Share modal opened');
    } catch (error) {
      throw new Error(`Failed to open share modal: ${error.message}`);
    }
  }

  async addEmailToShare(email) {
    console.log(`Adding email: ${email}`);

    try {
      // Find the add people input
      const inputField = await getFirstSelector(this.page, SELECTORS.addPeopleInput);
      if (!inputField) {
        throw new Error('Could not find email input field in share modal');
      }

      await inputField.scrollIntoViewIfNeeded().catch(() => {});
      await inputField.click({ timeout: WAIT_TIMES.LONG }).catch(() => {});

      // Clear and type the email (typing helps trigger the suggestion list)
      await inputField.fill('');
      await inputField.type(email, { delay: 60 });

      // Wait for suggestions to appear, then explicitly select the email/invite row.
      const suggestionsSelector = SELECTORS.emailSuggestions.join(', ');
      const suggestions = this.page.locator(suggestionsSelector);
      await suggestions.first().waitFor({ state: 'visible', timeout: WAIT_TIMES.EXTRA_LONG }).catch(() => {});

      const emailSuggestion = suggestions.filter({ hasText: email }).first();
      if (await emailSuggestion.isVisible().catch(() => false)) {
        await emailSuggestion.click({ timeout: WAIT_TIMES.LONG });
      } else {
        // Fallback: keyboard select the first suggestion
        await this.page.keyboard.press('ArrowDown').catch(() => {});
        await this.page.keyboard.press('Enter').catch(() => {});
      }

      // Verify: the email must appear somewhere in the modal's visible text (not just the input value).
      const emailAdded = await this.page
        .waitForFunction(
          (targetEmail) => {
            const dialog = document.querySelector('[role="dialog"]');
            if (!dialog) return false;
            const text = (dialog.innerText || '').toLowerCase();
            return text.includes(String(targetEmail).toLowerCase());
          },
          email,
          { timeout: WAIT_TIMES.EXTRA_LONG }
        )
        .then(() => true)
        .catch(() => false);

      if (!emailAdded) {
        throw new Error('Email was typed but not added/selected from suggestions (still in input)');
      }

      console.log('✅ Email selected in share list');
    } catch (error) {
      throw new Error(`Failed to add email ${email}: ${error.message}`);
    }
  }

  async ensureShareModalOpen() {
    const dialogVisible = await this.page.locator('[role="dialog"]').first().isVisible().catch(() => false);
    const inputVisible = await this.page.locator('input#share-with-input').first().isVisible().catch(() => false);
    if (dialogVisible && inputVisible) return;

    // If we have a dialog but not the expected input, close and reopen.
    if (dialogVisible && !inputVisible) {
      await this.closeShareModal();
      await Utils.randomDelay(800, 1400);
    }

    await this.clickShareButton();
  }

  async isEmailPresentInShareModal(email) {
    const lower = String(email).toLowerCase();
    return await this.page
      .evaluate((targetEmail) => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const text = (dialog.innerText || '').toLowerCase();
        return text.includes(String(targetEmail).toLowerCase());
      }, lower)
      .then(Boolean)
      .catch(() => false);
  }

  async closeShareModal() {
    // Prefer Escape (works even when the close button is hard to target)
    await this.page.keyboard.press('Escape').catch(() => {});

    // If still visible, attempt clicking a close button.
    const dialogVisible = await this.page.locator('[role="dialog"]').first().isVisible().catch(() => false);
    if (dialogVisible) {
      const closeBtn = await getFirstSelector(this.page, SELECTORS.closeModalButton);
      if (closeBtn) {
        await closeBtn.click({ timeout: WAIT_TIMES.LONG }).catch(() => {});
      }
    }

    // Wait until dialog disappears (best-effort).
    await this.page.locator('[role="dialog"]').first().waitFor({ state: 'hidden', timeout: WAIT_TIMES.EXTRA_LONG }).catch(() => {});
  }

  async saveShareChanges() {
    console.log('Saving share changes...');

    try {
      const saveButton = await getFirstSelector(this.page, SELECTORS.saveButton);
      if (!saveButton) {
        throw new Error('Save/Share button not found in modal');
      }

      // Wait for Save to become enabled (common after selecting an invitee / permission).
      const enabled = await saveButton
        .waitFor({ state: 'visible', timeout: WAIT_TIMES.EXTRA_LONG })
        .then(async () => !(await saveButton.isDisabled().catch(() => true)))
        .catch(() => false);

      if (!enabled) {
        const stillDisabled = await saveButton.isDisabled().catch(() => true);
        if (stillDisabled) {
          throw new Error('Save button remains disabled - invitee may not be selected/valid, or UI is still loading');
        }
      }

      await saveButton.click();
      console.log('✅ Clicked Save button');

      // Wait for a likely completion signal: either a toast, or the button to stop showing a busy spinner state,
      // or the dialog to close. Different builds behave differently.
      await waitForAnySelector(this.page, SELECTORS.successToast, 4000).catch(() => null);
      await Utils.randomDelay(1000, 2000);

      return true;
    } catch (error) {
      throw new Error(`Failed to save share changes: ${error.message}`);
    }
  }

  async detectShareSuccess(email) {
    console.log('Checking for success indicators...');

    try {
      // Check for success toast
      const successToast = await waitForAnySelector(this.page, SELECTORS.successToast, 3000);
      if (successToast) {
        console.log('✅ Success toast detected');
        return true;
      }

      // Check if email appears in shared people list
      const sharedList = await getFirstSelector(this.page, SELECTORS.sharedPeopleList);
      if (sharedList) {
        const listText = await sharedList.textContent();
        if (listText && listText.toLowerCase().includes(email.toLowerCase())) {
          console.log('✅ Email found in shared people list');
          return true;
        }
      }

      // Check for error states that would indicate failure
      const errorElement = await waitForAnySelector(this.page, SELECTORS.errorStates, 2000);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new Error(`Share failed: ${errorText || 'Unknown error'}`);
      }

      // No definitive indicator -> treat as unknown/failure (prevents false positives)
      return false;

    } catch (error) {
      if (error.message.includes('Share failed:')) {
        throw error; // Re-throw detected errors
      }
      // For other errors, fail closed to avoid false positives
      return false;
    }
  }

  async verifySharePersisted(email) {
    // Deterministic verification: close + re-open Share modal, then assert the email appears in the modal text.
    await this.closeShareModal();
    await Utils.randomDelay(800, 1400);
    await this.clickShareButton();

    const persisted = await this.page
      .waitForFunction(
        (targetEmail) => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return false;
          const text = (dialog.innerText || '').toLowerCase();
          return text.includes(String(targetEmail).toLowerCase());
        },
        email,
        { timeout: WAIT_TIMES.EXTRA_LONG }
      )
      .then(() => true)
      .catch(() => false);

    if (!persisted) {
      throw new Error('Save did not persist (email not present after re-opening Share modal)');
    }
  }

  async shareToEmail(email, retryCount = 0) {
    const maxRetries = 2;

    try {
      console.log(`\n📧 Processing: ${email} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      if (this.options.dryRun) {
        console.log(`🔍 DRY RUN: Would share to ${email}`);
        return { status: 'success', dryRun: true };
      }

      // Ensure the Share modal is open and ready.
      await this.ensureShareModalOpen();

      // If already present, treat as skipped (already shared).
      if (await this.isEmailPresentInShareModal(email)) {
        console.log(`⏭️  Already shared to ${email} (present in Share modal)`);
        return { status: 'skipped', reason: 'already_shared', timestamp: new Date().toISOString() };
      }

      // Add email to share
      await this.addEmailToShare(email);

      // Save the changes
      await this.saveShareChanges();

      // Check for success
      const success = await this.detectShareSuccess(email);

      if (success) {
        // Even if a toast/list is detected, we still verify persistence to avoid false positives.
        await this.verifySharePersisted(email);
        console.log(`✅ Successfully shared to: ${email}`);
        return { status: 'success', timestamp: new Date().toISOString() };
      } else {
        // Fail closed, and verify by re-opening Share modal before concluding failure.
        await this.verifySharePersisted(email);
        console.log(`✅ Successfully shared to: ${email}`);
        return { status: 'success', timestamp: new Date().toISOString() };
      }

    } catch (error) {
      console.error(`❌ Failed to share to ${email}: ${error.message}`);

      // Take screenshot on failure
      const screenshotPath = await Utils.takeScreenshot(this.page, email, error.message);

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying ${email} in 3 seconds...`);
        await Utils.randomDelay(3000, 5000);
        return await this.shareToEmail(email, retryCount + 1);
      }

      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        screenshot: screenshotPath,
        retries: retryCount
      };
    }
  }

  async shareToEmails(emailList) {
    const results = Utils.loadResults();
    let processed = 0;

    console.log(`\n🚀 Starting to share GPT with ${emailList.length} emails...`);

    for (const email of emailList) {
      // Check if we should skip this email (resume mode)
      if (this.options.resume && results[email]?.status === 'success') {
        console.log(`⏭️  Skipping ${email} (already successful)`);
        results[email] = { ...results[email], status: 'skipped' };
        continue;
      }

      // Check max limit
      if (this.options.max && processed >= this.options.max) {
        console.log(`📊 Reached max limit of ${this.options.max} emails`);
        break;
      }

      // Process the email
      results[email] = await this.shareToEmail(email);
      processed++;

      // Add random delay between emails (unless last one)
      if (processed < emailList.length) {
        const delayMs = this.options.delayMinMs !== undefined && this.options.delayMaxMs !== undefined
          ? await Utils.randomDelay(this.options.delayMinMs, this.options.delayMaxMs)
          : await Utils.randomDelay(1000, 3000);
        console.log(`⏳ Waiting ${delayMs}ms before next email...`);
      }
    }

    // Save final results
    Utils.saveResults(results);
    return results;
  }

  async close() {
    // For persistent contexts, close the context (it will close the underlying browser).
    if (this.context) {
      console.log('Closing browser context...');
      await this.context.close();
      this.context = null;
      this.browser = null;
      this.page = null;
      return;
    }

    if (this.browser) {
      console.log('Closing browser connection...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
