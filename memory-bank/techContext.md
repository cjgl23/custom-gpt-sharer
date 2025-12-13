# Technical Context

## Technologies Used
### Core Stack
- **Language**: JavaScript/Node.js
- **Runtime**: Node.js v22.11.0
- **Browser Automation**: Playwright (playwright-core)
- **Package Manager**: npm

### Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| playwright-core | Latest | Browser automation for GPT sharing |
| fs | Built-in | File system operations for reading email lists |

## Development Setup
### Prerequisites
- Node.js v22.11.0 (exact version required)
- Chrome browser installed
- Windows 11 corporate environment

### Installation
```powershell
npm install playwright-core
```

### Running Locally
```powershell
npm run share -- --url https://chatgpt.com/gpts/editor/<id> --emails emails.txt
```

### Reporting-only (no browser automation)
Use this to validate run-scoped reporting without opening Chrome:

```powershell
npm run summary -- emails.txt
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| None | All configuration via command-line arguments | No |

## Technical Constraints
- **Corporate Restrictions**: No npx, no venv, no Docker, no standalone browser drivers
- **Browser**: Use existing Chrome installation with a persistent profile directory (Playwright `launchPersistentContext`)
- **Node Version**: Fixed at v22.11.0, cannot be changed
- **Package Installation**: Only npm install allowed
- **Playwright**: Must use playwright-core, not full Playwright package

## Operational Notes (Cloudflare / first run)
- On first run (or after deleting `./chrome-profile`), you may need to complete:
  - Cloudflare “are you human” check (if shown)
  - ChatGPT login
- If Cloudflare keeps looping, a reliable workaround is:
  - Close all Chrome windows
  - Delete `./chrome-profile`
  - Launch Chrome once manually with that profile dir to clear Cloudflare/login, then close Chrome and re-run the tool

## Reliability Notes (Share modal behavior)
- The “Add people…” field requires selecting a dropdown suggestion (clicking the option) to actually add an invitee.
- Success verification should not “assume success”; confirm by re-opening the Share modal and ensuring the email appears in the shared list.

## Dependencies
### Production Dependencies
- playwright-core: Browser automation library

### Development Dependencies
- None required

## Build & Deployment
- **Build Process**: Direct execution with node
- **Deployment**: Standalone executable script
- **Distribution**: Single file deployment
- **Platform**: Windows 11 only
