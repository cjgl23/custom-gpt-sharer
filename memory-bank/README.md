# Memory Bank

This folder contains the project's Memory Bank - a structured documentation system that maintains project context across Cursor sessions.

## Why Memory Bank?

Cursor's memory resets completely between sessions. The Memory Bank is the ONLY link to previous work. It must be maintained with precision and clarity.

## File Hierarchy

```
projectbrief.md          # Foundation - shapes all other files
    ├── productContext.md    # Why this exists, problems solved, UX goals
    ├── systemPatterns.md    # Architecture, patterns, component relationships
    └── techContext.md       # Technologies, setup, constraints
            └── activeContext.md # Current focus, recent changes, next steps
                    └── progress.md      # What works, what's left, status
```

## Core Files

| File | Purpose |
|------|---------|
| `projectbrief.md` | Foundation document - core requirements and goals |
| `productContext.md` | Why project exists, problems solved, UX goals |
| `systemPatterns.md` | Architecture, design patterns, component relationships |
| `techContext.md` | Technologies, dev setup, constraints, dependencies |
| `activeContext.md` | Current focus, recent changes, active decisions |
| `progress.md` | What works, what's left, current status, known issues |

## Usage

1. **Start of Session**: Always read all Memory Bank files
2. **During Work**: Update `activeContext.md` as focus shifts
3. **After Changes**: Update `progress.md` and relevant files
4. **New Patterns**: Document in `.cursor/rules/*.mdc` at project root

## Commands

Use these Cursor commands to manage the Memory Bank:
- `/mem_bank-session-start` - Resume work, get summary of current state
- `/mem_bank-enter-plan-mode` - Plan changes before coding
- `/mem_bank-enter-act-mode` - Execute with documentation updates
- `/mem_bank-force-update` - Full review of all files
- `/mem_bank-audit` - Check consistency and completeness
