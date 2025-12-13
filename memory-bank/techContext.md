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
node index.js --emails emails.txt --gpt "My Custom GPT"
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| None | All configuration via command-line arguments | No |

## Technical Constraints
- **Corporate Restrictions**: No npx, no venv, no Docker, no standalone browser drivers
- **Browser**: Must use existing Chrome installation via CDP attach
- **Node Version**: Fixed at v22.11.0, cannot be changed
- **Package Installation**: Only npm install allowed
- **Playwright**: Must use playwright-core, not full Playwright package

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
