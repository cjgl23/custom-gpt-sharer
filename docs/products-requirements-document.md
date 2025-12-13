## PRD: GPT Share Bot (Windows 11, Enterprise)

### 1) Problem statement

You need a **local, colleague-runnable** utility that **shares a Custom GPT to individuals** by automating the ChatGPT GPT Editor UI:

* Load a GPT editor URL
* Open **Share**
* Add emails from a text file **one-by-one**
* Save after each addition

Groups are blocked, so **individual sharing only**.

---

### 2) Goals

* Run on **restricted corporate Windows 11 laptops** (no admin) 
* Use **installed Chrome only** (no chromedriver / no extra browser binaries)  
* Persist auth using a **dedicated local Chrome profile folder** (bootstrap login once, reuse for days)
* Be easy to share to colleagues (copy folder + run a couple commands)

---

### 3) Non-goals

* No server deployment / central scheduler
* No group sharing
* No tools that require forbidden commands or executables (e.g., `npx`, Docker, chromedriver, Playwright Test)  

---

### 4) Hard constraints (must comply)

* **Windows 11 only**; documentation and commands must be **PowerShell or cmd** (no bash) 
* Versions fixed: **Node.js v22.11.0** 
* Install commands allowed: **`npm install …` only** (no `npx`) 
* Forbidden: **chromedriver / standalone driver executables** 
* Automation must control **installed `chrome.exe`** only 

---

### 5) Proposed solution (architecture)

**Type**: Local Node.js CLI

**Automation approach**

* Use **`playwright-core`** (not Playwright Test/CLI) and **attach via CDP** to Chrome:

  * Chrome launched with `--remote-debugging-port=9222`
  * Chrome launched with `--user-data-dir=<local-profile-dir>` to persist auth

**Two run modes**

1. **Attach mode (recommended):** user launches Chrome once; tool attaches via CDP.
2. **Launch mode (optional):** tool launches `chrome.exe` itself with CDP flags, then attaches.

---

### 6) User flows

#### A) One-time bootstrap (per laptop)

1. Create profile directory
2. Launch Chrome with:

   * `--remote-debugging-port=9222`
   * `--user-data-dir=<profileDir>`
3. Log into ChatGPT
4. Close/reopen later using same profile (session persists)

#### B) Normal run

1. CLI reads emails file + validates URL
2. CLI attaches to Chrome (CDP)
3. Opens GPT editor URL
4. Clicks **Share**
5. For each email:

   * enters email
   * selects suggestion
   * clicks **Save**
   * records outcome
6. Writes `state\results.json` + failure screenshots to `artifacts\...`

---

### 7) Functional requirements

#### Inputs (CLI)

Required:

* `--url "<https://chatgpt.com/gpts/editor/...>"`
* `--emails ".\emails.txt"`

Optional:

* `--profileDir "<path>"` (default: `%USERPROFILE%\gpt-share-automator\chrome-profile`)
* `--chromePath "<path to chrome.exe>"` (autodetect if omitted)
* `--cdpPort 9222` (default 9222)
* `--dryRun` (open Share dialog, no saving)
* `--resume` (skip emails already marked success)
* `--max <n>` (process first n emails, useful for testing)
* `--delayMinMs`, `--delayMaxMs` (jitter between invites)

#### Email file parsing

* One email per line
* Ignore blank lines
* Allow comments starting with `#`
* Trim whitespace
* Deduplicate case-insensitively
* Validate email format; invalid lines go to `skipped` with reason

#### Automation steps (MVP)

* Navigate to editor URL
* Wait for editor UI ready
* Click **Share** button
* In Share modal:

  * find “add people” textbox
  * for each email:

    * fill textbox (paste)
    * select matching dropdown item (Enter or click)
    * click **Save**
    * detect success (toast OR modal state change OR email appears in list)
    * record status

#### Outputs

* Console summary:

  * total / success / failed / skipped
* `state\results.json`:

  * per-email: status, timestamp, error message (if any)
* `artifacts\<timestamp>\`:

  * screenshot for each failure (and optionally final screenshot)

---

### 8) Non-functional requirements

* **Reliability**

  * retries for transient UI failures (e.g., 2 retries per email)
  * auto-waits; avoid fixed sleeps except small jitter
* **Maintainability**

  * selectors centralized in `src\selectors.js`
  * “strict mode” locators + accessible roles where possible
* **Security**

  * never log tokens/cookies
  * warn that profile directory contains session data
* **Usability**

  * clear error messages with next action (e.g., “Chrome not running on port 9222; run bootstrap command”)

---

### 9) Edge cases & handling

* Email not found in picker → mark failed: `NOT_IN_WORKSPACE_OR_NOT_FOUND`
* Already shared → mark success: `ALREADY_SHARED`
* Session expired / redirected to login → stop with message: run bootstrap/login again
* Share modal structure changes → screenshot + fail fast with “selector not found”

---

### 10) Acceptance criteria (MVP)

* On Windows 11 with Node v22.11.0, a colleague can:

  * `npm install …` 
  * run bootstrap once
  * run the CLI and successfully share to a list of emails (<100)
  * rerun with `--resume` and it skips completed emails

---

### 11) Repo structure

```
gpt-share-automator/
  package.json
  README.md
  share.js
  src/
    chrome.js        # find chrome.exe, attach/launch CDP
    input.js         # parse/validate url + emails
    selectors.js     # all UI selectors in one place
    shareFlow.js     # share modal automation loop
    results.js       # read/write results.json, resume
    util.js          # delay/jitter, timestamps, file helpers
  state/
    results.json     # generated
  artifacts/
    ...              # generated
```