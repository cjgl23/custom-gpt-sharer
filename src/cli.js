import { readFileSync, existsSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';

export class CLIParser {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = {};
    this.errors = [];
  }

  parse() {
    this.parseArguments();
    this.validateArguments();
    return {
      options: this.options,
      errors: this.errors,
      isValid: this.errors.length === 0
    };
  }

  parseArguments() {
    let urlPositional = null;
    let emailsPositional = null;

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      if (arg.startsWith('--')) {
        const optionName = arg.slice(2);
        const nextArg = this.args[i + 1];

        // Handle boolean flags
        if (['dryRun', 'resume'].includes(optionName)) {
          this.options[optionName] = true;
          continue;
        }

        // Handle options with values
        if (nextArg && !nextArg.startsWith('--')) {
          this.options[optionName] = nextArg;
          i++; // Skip next argument as it's the value
        } else {
          // Option without value, treat as boolean
          this.options[optionName] = true;
        }
      } else {
        // Handle positional arguments for URL and emails
        if (!this.options.url && this.isValidUrl(arg)) {
          urlPositional = arg;
        } else if (!this.options.emails && existsSync(arg)) {
          emailsPositional = arg;
        }
      }
    }

    // Assign positional arguments only if explicit flags were not provided
    if (!this.options.url && urlPositional) {
      this.options.url = urlPositional;
    }
    if (!this.options.emails && emailsPositional) {
      this.options.emails = emailsPositional;
    }
  }

  validateArguments() {
    // Required arguments
    if (!this.options.url) {
      this.errors.push('--url is required (ChatGPT GPT editor URL)');
    } else if (!this.isValidUrl(this.options.url)) {
      this.errors.push('--url must be a valid ChatGPT GPT editor URL');
    }

    if (!this.options.emails) {
      this.errors.push('--emails is required (path to email file)');
    } else if (!existsSync(this.options.emails)) {
      this.errors.push(`Email file not found: ${this.options.emails}`);
    }

    // Optional arguments with defaults
    const defaultProfileDir = join(process.cwd(), 'chrome-profile');
    const rawProfileDir = this.options.profileDir || defaultProfileDir;
    this.options.profileDir = isAbsolute(rawProfileDir)
      ? rawProfileDir
      : resolve(process.cwd(), rawProfileDir);

    this.options.cdpPort = parseInt(this.options.cdpPort) || 9222;

    // Validate numeric options
    if (this.options.max !== undefined) {
      const max = parseInt(this.options.max);
      if (isNaN(max) || max < 1) {
        this.errors.push('--max must be a positive integer');
      } else {
        this.options.max = max;
      }
    }

    if (this.options.delayMinMs !== undefined) {
      const delayMin = parseInt(this.options.delayMinMs);
      if (isNaN(delayMin) || delayMin < 0) {
        this.errors.push('--delayMinMs must be a non-negative integer');
      } else {
        this.options.delayMinMs = delayMin;
      }
    }

    if (this.options.delayMaxMs !== undefined) {
      const delayMax = parseInt(this.options.delayMaxMs);
      if (isNaN(delayMax) || delayMax < 0) {
        this.errors.push('--delayMaxMs must be a non-negative integer');
      } else {
        this.options.delayMaxMs = delayMax;
      }
    }

    // Validate delay range
    if (this.options.delayMinMs !== undefined && this.options.delayMaxMs !== undefined) {
      if (this.options.delayMinMs > this.options.delayMaxMs) {
        this.errors.push('--delayMinMs cannot be greater than --delayMaxMs');
      }
    }
  }

  isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'chatgpt.com' &&
             parsedUrl.pathname.includes('/gpts/editor/');
    } catch {
      return false;
    }
  }

  // Auto-detect Chrome path if not provided
  async detectChromePath() {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      join(process.env.USERPROFILE || '', 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Fallback - let user know they need to provide it
    throw new Error(
      'Chrome not found in standard locations. Please specify --chromePath explicitly.\n' +
      'Typical location: C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    );
  }

  printUsage() {
    console.log(`GPT Share Automator - Bulk share GPTs to email lists

USAGE:
  npm run share -- --url <url> --emails <file> [options]

REQUIRED ARGUMENTS:
  --url <url>          ChatGPT GPT editor URL (e.g., https://chatgpt.com/gpts/editor/<id>)
  --emails <file>      Path to text file containing emails (one per line, # comments allowed)

OPTIONAL ARGUMENTS:
  --profileDir <dir>   Chrome profile directory (default: ./chrome-profile)
  --chromePath <path>  Path to Chrome executable (auto-detected if not provided)
  --cdpPort <port>     Chrome DevTools Protocol port (default: 9222)
  --dryRun             Show what would be done without actually sharing
  --resume             Skip emails already marked as successful in results.json
  --max <number>       Maximum number of emails to process (unlimited if not specified)
  --delayMinMs <ms>    Minimum delay between emails in milliseconds (default: 1000)
  --delayMaxMs <ms>    Maximum delay between emails in milliseconds (default: 3000)

EXAMPLES:
  npm run share -- --url https://chatgpt.com/gpts/editor/g-abc123 --emails emails.txt
  npm run share -- --url https://chatgpt.com/gpts/editor/g-abc123 --emails emails.txt --dryRun
  npm run share -- --url https://chatgpt.com/gpts/editor/g-abc123 --emails emails.txt --resume --max 10

`);
  }

  async loadEmailList() {
    try {
      const content = readFileSync(this.options.emails, 'utf8');
      const emails = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .map(email => email.toLowerCase());

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = [];
      const invalidEmails = [];

      for (const email of emails) {
        if (emailRegex.test(email)) {
          validEmails.push(email);
        } else {
          invalidEmails.push(email);
        }
      }

      if (invalidEmails.length > 0) {
        console.warn(`Warning: Found ${invalidEmails.length} invalid email(s):`);
        invalidEmails.forEach(email => console.warn(`  - ${email}`));
      }

      return validEmails;
    } catch (error) {
      throw new Error(`Failed to read email file: ${error.message}`);
    }
  }
}
