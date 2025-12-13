// ChatGPT GPT Editor selectors for GPT sharing automation
export const SELECTORS = {
  // Share button - may appear in different locations
  shareButtons: [
    'button:has-text("Share")',
    '[role="button"]:has-text("Share")',
    'a:has-text("Share")',
    // Some builds render the Share label inside a nested div (DevTools snippet provided by user)
    'div.flex.w-full.items-center.justify-center.gap-1\\.5:has-text("Share")',
    'button[data-testid="share-button"]',
    'button[aria-label*="Share"]',
    '[aria-label*="Share"]',
    'button[class*="share"]'
  ],

  // Share modal/dialog selectors
  shareModal: [
    '[role="dialog"]:has-text("Share")',
    '.modal:has-text("Share")',
    '[data-testid="share-modal"]'
  ],

  // Add people input field
  addPeopleInput: [
    // DevTools snippet provided by user
    'input#share-with-input',
    'input[placeholder*="email"]',
    'input[placeholder*="people"]',
    'input[placeholder*="invite"]',
    'input[aria-label*="email"]',
    'input[type="email"]',
    'input[name*="email"]',
    // Fallback - any input that appears after clicking share
    'input'
  ],

  // Dropdown suggestions for email autocomplete
  emailSuggestions: [
    '[role="listbox"] li',
    '[data-testid="suggestion"]',
    '.dropdown-item',
    '[role="option"]'
  ],

  // Close button for modal/dialog (often an X icon)
  closeModalButton: [
    '[role="dialog"] button[aria-label="Close"]',
    '[role="dialog"] button[aria-label="close"]',
    '[role="dialog"] button:has-text("Close")',
    '[role="dialog"] button[data-testid*="close"]',
    '[role="dialog"] button:has(svg)',
  ],

  // Save/Share button in modal
  saveButton: [
    'button:has-text("Save")',
    'button:has-text("Share")',
    'button:has-text("Send")',
    'button[data-testid*="save"]',
    'button[data-testid*="share"]',
    'button[type="submit"]'
  ],

  // Success indicators
  successToast: [
    '[role="alert"]:has-text("success")',
    '[role="alert"]:has-text("shared")',
    '[role="alert"]:has-text("invited")',
    '.toast:has-text("success")',
    '.notification:has-text("success")'
  ],

  // Current shared people list
  sharedPeopleList: [
    '[data-testid="shared-people"]',
    '.shared-users',
    '.collaborators',
    'ul:has-text("@")'  // List containing @ symbols for emails
  ],

  // Loading states
  loadingStates: [
    '[aria-busy="true"]',
    '.loading',
    '.spinner',
    'button:disabled:has-text("Save")',
    'button:disabled:has-text("Share")'
  ],

  // Error states
  errorStates: [
    '[role="alert"]:has-text("error")',
    '[role="alert"]:has-text("failed")',
    '.error',
    '.invalid'
  ]
};

// Helper function to get the first matching selector from an array
export async function getFirstSelector(page, selectors) {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count < 1) continue;

      // Prefer visible elements; avoid returning a locator that doesn't resolve yet.
      const visible = await element.isVisible().catch(() => false);
      if (!visible) continue;

      return element;
    } catch (e) {
      // Continue to next selector
      continue;
    }
  }
  return null;
}

// Helper function to wait for any of the selectors to appear (returns on first match)
export async function waitForAnySelector(page, selectors, timeout = 5000) {
  const promises = selectors.map(async (selector) => {
    const result = await page.waitForSelector(selector, { timeout }).catch(() => null);
    if (result) return result;
    throw new Error('not found');
  });

  return Promise.any(promises).catch(() => null);
}

// Common wait times
export const WAIT_TIMES = {
  SHORT: 1000,
  MEDIUM: 3000,
  LONG: 5000,
  EXTRA_LONG: 10000
};
