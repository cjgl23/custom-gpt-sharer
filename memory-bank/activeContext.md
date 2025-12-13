# Active Context

## Current Work Focus
Stabilize GPT sharing automation reliability and reporting accuracy in real corporate ChatGPT UI.

## Recent Changes
| Date | Change | Files Affected |
|------|--------|----------------|
| 2025-12-13 | Created Memory Bank structure | memory-bank/* |
| 2025-12-13 | Fixed false-positive “success” by failing closed + post-save verification (re-open Share modal to confirm email persisted) | `src/automation.js` |
| 2025-12-13 | Made invite selection deterministic by clicking dropdown suggestion instead of relying on Enter | `src/automation.js` |
| 2025-12-13 | Skip already-shared emails by detecting presence in Share modal | `src/automation.js` |
| 2025-12-13 | Improved Share button detection (wait + single reload retry after Cloudflare/login redirects) | `src/automation.js`, `src/selectors.js` |
| 2025-12-13 | Run-scoped summary reporting (don’t count historical `state/results.json` entries) | `src/utils.js`, `share.js` |
| 2025-12-13 | Added report-only command to validate reporting without opening Chrome | `scripts/summary.js`, `package.json` |
| 2025-12-13 | Avoided `process.exit()` in fatal handler so cleanup runs reliably | `share.js` |

## Next Steps
- [ ] Tighten “add email” verification to check for a dedicated selected-invitee chip/row (not just dialog text) if the UI changes again
- [ ] Add a small “debug artifacts” mode to capture DOM snapshot on failure (optional)
- [ ] Consider exposing a `--noPersist` or `--runId` option if teams want separate ledgers per batch (optional)

## Active Decisions & Considerations
### Browser Automation Approach
- **Status**: Decided
- **Options Considered**: Selenium, Puppeteer, Playwright
- **Current Thinking**: Use `playwright-core` with real installed Chrome + persistent profile (`launchPersistentContext`) to comply with corporate restrictions.

### Reliability Rules (learned from production UI)
- Typed email must be **selected from the dropdown suggestion** to become an invitee; otherwise Save can remain disabled.
- Success detection must **fail closed**; confirm persistence by **re-opening Share** and verifying the email appears.

## Blockers & Dependencies
- None currently. Cloudflare/login challenges remain a normal operational step on fresh profiles.

## Questions to Resolve
- [ ] Should “already shared” be reported as `skipped` (current) or `success`? (We currently count it as skipped.)
- [ ] Do we want to persist per-run results into a separate file in addition to the cumulative ledger? (optional)

## Session Notes
### 2025-12-13
- Initialized Memory Bank with project details
- Set up folder structure for development
- Documented corporate restrictions and technical constraints
- Debugged real-world failures where Save stayed disabled because invitee was not selected from dropdown
- Verified correct UI behavior via Cursor Playwright MCP (Share toast “Sharing settings updated”)
