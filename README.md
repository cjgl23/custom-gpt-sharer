# GPT Share Automator

Bulk share custom GPTs to email lists via browser automation. Windows 11 compatible.

## Features

- **Resume Support**: Continue from last successful email with `--resume`
- **Failure Screenshots**: Auto-captures on errors for debugging
- **Retry Logic**: Automatic retries with exponential backoff
- **Progress Tracking**: Persistent results ledger in `state/results.json`
- **Dry Run Mode**: Test without actually sharing

## Requirements

- Windows 11
- Node.js v22.11.0
- Chrome installed

## Installation

```powershell
npm install
```

## First Run Setup

ChatGPT may show a Cloudflare check on a fresh profile. Warm the profile once manually:

```powershell
$profileDir = Join-Path (Get-Location) "chrome-profile"
New-Item -ItemType Directory -Path $profileDir -Force
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  "--remote-debugging-port=9222 --user-data-dir=$profileDir https://chatgpt.com"
```

In the Chrome window:
1. Complete any Cloudflare check
2. Log into ChatGPT
3. Close Chrome

The tool reuses this profile on subsequent runs.

## Usage

```powershell
# Basic
node share.js --url "https://chatgpt.com/gpts/editor/g-abc123..." --emails "emails.txt"

# Dry run
node share.js --url "..." --emails "emails.txt" --dryRun

# Resume from last run
node share.js --url "..." --emails "emails.txt" --resume

# Custom delays (rate limiting)
node share.js --url "..." --emails "emails.txt" --delayMinMs 5000 --delayMaxMs 10000

# Report-only summary (no browser)
npm run summary -- emails.txt
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--url` | ✅ | - | ChatGPT GPT editor URL |
| `--emails` | ✅ | - | Path to email list file |
| `--profileDir` | ❌ | `./chrome-profile` | Chrome profile directory |
| `--chromePath` | ❌ | Auto-detected | Chrome executable path |
| `--dryRun` | ❌ | `false` | Show actions without executing |
| `--resume` | ❌ | `false` | Skip already successful emails |
| `--max` | ❌ | Unlimited | Maximum emails to process |
| `--delayMinMs` | ❌ | `1000` | Min delay between emails (ms) |
| `--delayMaxMs` | ❌ | `3000` | Max delay between emails (ms) |

### Email File Format

One email per line. Comments (`#`) and blank lines ignored:

```
# Team members
john.doe@company.com
jane.smith@company.com
```

## Output

### Results (`state/results.json`)

Accumulated ledger across runs:

```json
{
  "john.doe@company.com": {
    "status": "success",
    "timestamp": "2025-12-13T10:30:00.000Z"
  },
  "jane.smith@company.com": {
    "status": "failed",
    "error": "Email not found",
    "screenshot": "artifacts\\2025-12-13T10-30-05\\jane.smith_error.png"
  }
}
```

### Screenshots (`artifacts/`)

Failure screenshots saved with timestamps:

```
artifacts/2025-12-13T10-30-05/
  └── jane.smith@company.com_error.png
```

## Troubleshooting

### Cloudflare keeps blocking

Re-warm the profile: close Chrome, delete `chrome-profile/`, repeat [First Run Setup](#first-run-setup).

### "Share button not found"

- Verify URL is correct and accessible
- Ensure you're logged into ChatGPT
- Check you have permission to share the GPT

### Rate limiting / frequent failures

Increase delays: `--delayMinMs 5000 --delayMaxMs 10000`

## Architecture

```
share.js           # Entry point
src/
  cli.js           # Argument parsing
  automation.js    # GPT sharing logic
  selectors.js     # ChatGPT UI selectors
  utils.js         # Utilities
state/
  results.json     # Progress tracking
artifacts/         # Failure screenshots
```

Uses `playwright-core` with existing Chrome installation. No browser downloads or driver executables.

## License

MIT
