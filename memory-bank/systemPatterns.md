# System Patterns

## System Architecture
The GPT Share Bot is a command-line utility that uses browser automation to interact with ChatGPT's sharing interface.

### Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Input     │    │  File Processor  │    │ Browser Control │
│ - Email file    │───▶│ - Parse emails   │───▶│ - Navigate GPT  │
│ - GPT name      │    │ - Validate       │    │ - Share process │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Playwright CDP attach | Corporate restriction - no npx, must use playwright-core with existing Chrome | 2025-12-13 |
| Node.js v22.11.0 | Exact version available on corporate laptop | 2025-12-13 |
| npm install only | Corporate restriction - no npx allowed | 2025-12-13 |

## Design Patterns in Use
- **Command Pattern**: CLI interface for user inputs
- **Template Method**: Sequential email processing workflow
- **Observer Pattern**: Progress reporting and error handling
- **Fail-Closed Verification**: Treat “unknown” UI state as failure until confirmed via re-opened Share modal

## Component Relationships
### Core Components
- **CLI Parser**: Handles command-line arguments and validation
- **File Reader**: Processes email list from text file
- **Browser Controller**: Manages Playwright automation
- **Share Processor**: Executes sharing logic for each email
- **Error Handler**: Manages failures and retry logic
- **Report-Only Summary**: Prints run-scoped stats from persisted ledger without browser automation (`scripts/summary.js`)

### Data Flow
1. CLI arguments → File Reader → Email list validation
2. Email list → Browser Controller → GPT sharing interface
3. Sequential processing → Progress tracking → Completion report
4. Optional: reporting-only mode → email list + persisted ledger → run-scoped summary output

## API Patterns
- Command-line interface following standard conventions
- File I/O using Node.js fs module
- Browser automation via Playwright API

## Error Handling Patterns
- Graceful degradation on individual email failures
- Comprehensive logging of all operations
- User-friendly error messages
- Retry logic for transient failures
- Avoid false positives by verifying persistence (close + re-open Share modal and re-check for email)
