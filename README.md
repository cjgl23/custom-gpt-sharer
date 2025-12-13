# GPT Share Automator 🤖

Bulk share your custom GPTs to email lists using automated browser interactions. Designed for Windows 11 corporate environments with strict security constraints.

## Features

- 🔄 **Resume Support**: Continue where you left off with `--resume`
- 📸 **Failure Screenshots**: Automatic screenshots on failures for debugging
- 🎯 **Robust Selectors**: Multiple fallback selectors for ChatGPT UI changes
- ⚡ **Retry Logic**: Automatic retries with exponential backoff
- 🎲 **Random Delays**: Configurable delays to avoid rate limiting
- 📊 **Progress Tracking**: Persistent results in `state/results.json` (cumulative ledger across runs)
- 🧾 **Run-scoped Summary**: The printed summary counts only the emails from the current invocation (not prior batches)
- 🔎 **Report-only Summary**: Validate reporting from `state/results.json` without opening Chrome (`npm run summary`)
- 🧪 **Dry Run Mode**: Test without actually sharing

## Requirements

- **OS**: Windows 11 only
- **Node.js**: v22.11.0 (exact version)
- **Browser**: Chrome installed (uses your existing `chrome.exe`)
- **Permissions**: No admin rights required

## Installation

```powershell
npm install
```

## First Run Setup (Required: warm the Chrome profile)

In corporate environments, ChatGPT may show a Cloudflare “are you human” check on a fresh profile. The most reliable setup is to **warm the profile once manually**, then run the tool.

### Step 1–3 (PowerShell)

Run this from the utility root folder (the folder that contains `share.js`):

```powershell
$profileDir = Join-Path (Get-Location) "chrome-profile"
New-Item -ItemType Directory -Path $profileDir -Force
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  "--remote-debugging-port=9222 --user-data-dir=$profileDir https://chatgpt.com"
```

Then, in the Chrome window that opens:
- Complete the Cloudflare checkbox/check (if shown)
- Log into ChatGPT

Close Chrome when you’re done. The tool will reuse the warmed profile directory (`./chrome-profile`) on subsequent runs.

### Example (your exact path)

```powershell
$profileDir = "C:\Users\<User>\custom-gpt-sharer\chrome-profile"
New-Item -ItemType Directory -Path $profileDir -Force
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "--remote-debugging-port=9222 --user-data-dir=$profileDir https://chatgpt.com"
```

## Usage

### Basic Usage

```powershell
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt"
```

### Advanced Usage

```powershell
# Dry run (test without sharing)
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt" --dryRun

# Resume from where you left off
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt" --resume

# Limit to 10 emails with custom delays
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt" --max 10 --delayMinMs 2000 --delayMaxMs 5000

# Custom Chrome profile and port
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt" --profileDir "C:\my-profile" --cdpPort 9223
```

### Report-only summary (no browser automation)

Use this to validate the **run-scoped reporting** against your email file and the current `state/results.json` ledger.
This does **not** open Chrome or interact with ChatGPT.

```powershell
npm run summary -- emails.txt
```

### Command Line Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--url` | ✅ | - | ChatGPT GPT editor URL |
| `--emails` | ✅ | - | Path to text file with emails |
| `--profileDir` | ❌ | `./chrome-profile` | Chrome profile directory |
| `--chromePath` | ❌ | Auto-detected | Path to Chrome executable |
| `--cdpPort` | ❌ | `9222` | (Legacy) CDP port used only for manual bootstrap workflows |
| `--dryRun` | ❌ | `false` | Show actions without executing |
| `--resume` | ❌ | `false` | Skip already successful emails |
| `--max` | ❌ | Unlimited | Maximum emails to process |
| `--delayMinMs` | ❌ | `1000` | Minimum delay between emails (ms) |
| `--delayMaxMs` | ❌ | `3000` | Maximum delay between emails (ms) |

### Email File Format

Create a text file with one email per line. Comments and blank lines are ignored:

```
# My team members
john.doe@company.com
jane.smith@company.com

# External collaborators
external.person@partner.com
```

## Output Files

### Results Tracking (`state/results.json`)

`state/results.json` is an **accumulated ledger** across runs. Each invocation updates entries for the emails it processed,
but older batches remain in the file for audit/resume purposes.

```json
{
  "john.doe@company.com": {
    "status": "success",
    "timestamp": "2025-12-13T10:30:00.000Z"
  },
  "jane.smith@company.com": {
    "status": "failed",
    "error": "Email not found",
    "timestamp": "2025-12-13T10:30:05.000Z",
    "screenshot": "artifacts\\2025-12-13T10-30-05\\jane.smith_error.png",
    "retries": 2
  }
}
```

### Failure Screenshots (`artifacts/`)

When sharing fails, screenshots are automatically saved with timestamps:

```
artifacts/
└── 2025-12-13T10-30-05/
    ├── jane.smith@company.com_error.png
    └── john.doe@company.com_unknown.png
```

## Troubleshooting

### Cloudflare “Are you human” keeps looping / blocking automation

If Cloudflare keeps re-appearing or the automation can’t proceed, the most reliable fix is to “warm” the profile manually once:

1. **Close all Chrome sessions** (all windows).
2. **Delete** the existing `chrome-profile` directory in the utility root path:
   - `C:\Users\<User>\custom-gpt-sharer\chrome-profile`
3. **Run the manual bootstrap** to recreate the directory and start Chrome:

```powershell
$profileDir = "C:\Users\<User>\custom-gpt-sharer\chrome-profile"
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  "--remote-debugging-port=9222 --user-data-dir=$profileDir https://chatgpt.com"
```

4. In that Chrome window, complete:
   - the Cloudflare checkbox/check (if shown)
   - ChatGPT login
5. Close Chrome.
6. Re-run the tool (it will reuse the warmed profile directory):

```powershell
cd C:\Users\<User>\custom-gpt-sharer
node share.js --url "https://chatgpt.com/gpts/editor/g-..." --emails "emails.txt"
```

### GPT Editor Access Issues

**Error**: "Share button not found"

**Solutions**:
1. Verify the URL is correct and accessible
2. Ensure you're logged into ChatGPT
3. Check that you have permission to share this GPT
4. Try refreshing the GPT editor page

### Email Validation Issues

**Warning**: "Found X invalid email(s)"

**Solution**: Check your email file format. Valid emails must contain `@` and a domain.

### Rate Limiting

If you see frequent failures, increase the delay:

```powershell
node share.js --url "..." --emails "..." --delayMinMs 5000 --delayMaxMs 10000
```

## Repository History (baseline vs current)

The repo’s initial commit (`61fd830`) contained only Cursor rules and the Memory Bank documentation scaffold.
All runnable automation code and CLI wiring (e.g. `share.js`, `src/*`, `package.json`) were added after that baseline.

## Architecture

### Core Components

- **`share.js`**: Main entry point and orchestration
- **`src/cli.js`**: Command-line argument parsing and validation
- **`src/automation.js`**: GPT sharing automation logic
- **`src/selectors.js`**: ChatGPT UI selectors with fallbacks
- **`src/utils.js`**: Utility functions for delays, file operations, screenshots

### Browser Automation

- Uses `playwright-core` with a persistent Chrome profile directory (`--profileDir`)
- Respects corporate Chrome installation requirements
- No browser downloads or additional driver installations

### Error Handling

- Automatic retries (up to 2 attempts per email)
- Screenshot capture on failures
- Graceful degradation with clear error messages
- Progress persistence for resumability

## Security & Compliance

- ✅ No admin rights required
- ✅ Uses existing corporate Chrome installation
- ✅ No external browser downloads
- ✅ No standalone driver executables
- ✅ Respects corporate security policies
- ✅ Local execution only

## Development

### Project Structure

```
gpt-share-automator/
├── share.js                 # Main entry point
├── package.json            # Dependencies and scripts
├── README.md              # This file
├── src/
│   ├── cli.js            # CLI argument parsing
│   ├── automation.js     # GPT sharing logic
│   ├── selectors.js      # UI selectors
│   └── utils.js          # Utility functions
├── state/
│   └── results.json      # Progress tracking
└── artifacts/
    └── <timestamp>/      # Failure screenshots
```

### Adding New Selectors

When ChatGPT UI changes, update `src/selectors.js`:

```javascript
export const SELECTORS = {
  shareButtons: [
    'button[data-testid="share-button"]',
    'button:has-text("Share")',
    // Add new selector here
    'button[class*="new-share-class"]'
  ],
  // ... other selectors
};
```

## License

UNLICENSED - Corporate Internal Use Only

## Contributing

1. Follow the existing code patterns
2. Update selectors when ChatGPT UI changes
3. Test with `--dryRun` first
4. Update documentation for new features
