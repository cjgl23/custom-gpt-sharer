import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, isAbsolute, resolve } from 'path';

// Centralized Chrome executable paths for Windows
export const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

export class Utils {
  // Generate random delay between min and max milliseconds
  static randomDelay(minMs = 1000, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    // Resolve with the chosen delay so callers can log it if desired.
    return new Promise(resolve => setTimeout(() => resolve(delay), delay));
  }

  // Create timestamp string for filenames
  static getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  // Ensure directory exists
  static ensureDirectoryExists(dirPath) {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      return true;
    }
    return false;
  }

  // Load results from state/results.json
  static loadResults() {
    const resultsPath = join('state', 'results.json');
    if (!existsSync(resultsPath)) {
      return {};
    }

    try {
      const content = readFileSync(resultsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not load existing results: ${error.message}`);
      return {};
    }
  }

  // Save results to state/results.json
  static saveResults(results) {
    this.ensureDirectoryExists('state');
    const resultsPath = join('state', 'results.json');

    try {
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    } catch (error) {
      console.error(`Error saving results: ${error.message}`);
    }
  }

  // Take screenshot on failure
  static async takeScreenshot(page, email, error = null) {
    const timestamp = this.getTimestamp();
    const artifactsDir = join('artifacts', timestamp);
    this.ensureDirectoryExists(artifactsDir);

    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const filename = `${sanitizedEmail}_${error ? 'error' : 'unknown'}.png`;
    const screenshotPath = join(artifactsDir, filename);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (screenshotError) {
      console.error(`Failed to save screenshot: ${screenshotError.message}`);
      return null;
    }
  }

  // Get Chrome bootstrap command for PowerShell
  static getChromeBootstrapCommand(profileDir, port = 9222) {
    const chromePath = CHROME_PATHS[0];
    const absoluteProfileDir = isAbsolute(profileDir)
      ? profileDir
      : resolve(process.cwd(), profileDir);

    return `$profileDir = "${absoluteProfileDir}"
New-Item -ItemType Directory -Path $profileDir -Force
Start-Process "${chromePath}" "--remote-debugging-port=${port} --user-data-dir=$profileDir https://chatgpt.com"`;
  }

  // Check if Chrome is running on specified port
  static async isChromeRunning(port = 9222) {
    const http = await import('http');

    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  // Wait for Chrome to be available on CDP port
  static async waitForChrome(port = 9222, timeoutMs = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isChromeRunning(port)) {
        return true;
      }
      await this.randomDelay(1000, 2000);
    }

    return false;
  }

  // Format duration in human readable format
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Get summary statistics (optionally scoped to a specific run)
  static getSummaryStats(results, emailFilter = null) {
    const emails = Array.isArray(emailFilter) && emailFilter.length > 0
      ? emailFilter.filter(email => Object.prototype.hasOwnProperty.call(results, email))
      : Object.keys(results);

    const successful = emails.filter(email => results[email].status === 'success');
    const failed = emails.filter(email => results[email].status === 'failed');
    const skipped = emails.filter(email => results[email].status === 'skipped');

    return {
      total: emails.length,
      successful: successful.length,
      failed: failed.length,
      skipped: skipped.length,
      successRate: emails.length > 0 ? (successful.length / emails.length * 100).toFixed(1) : 0
    };
  }

  // Print progress summary (optionally scoped to a specific run)
  static printSummary(results, startTime, emailFilter = null) {
    const stats = this.getSummaryStats(results, emailFilter);
    const duration = this.formatDuration(Date.now() - startTime);

    console.log('\n=== GPT Share Summary ===');
    console.log(`Duration: ${duration}`);
    console.log(`Total emails processed: ${stats.total}`);
    console.log(`Successful shares: ${stats.successful}`);
    console.log(`Failed shares: ${stats.failed}`);
    console.log(`Skipped (already shared): ${stats.skipped}`);
    console.log(`Success rate: ${stats.successRate}%`);

    if (stats.failed > 0) {
      console.log('\nFailed emails:');
      const emails = Array.isArray(emailFilter) && emailFilter.length > 0
        ? emailFilter.filter(email => Object.prototype.hasOwnProperty.call(results, email))
        : Object.keys(results);

      emails
        .filter(email => results[email]?.status === 'failed')
        .forEach((email) => {
          const res = results[email];
          console.log(`  - ${email}: ${res?.error || 'Unknown error'}`);
        });
    }
  }
}
