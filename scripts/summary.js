#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { Utils } from '../src/utils.js';

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {};
  out._ = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function loadEmailFile(path) {
  const content = readFileSync(path, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .map(email => email.toLowerCase());
}

async function main() {
  const args = parseArgs(process.argv);
  const emailsPath = args.emails || args._?.[0];

  if (!emailsPath) {
    console.error('❌ Email file path is required. Use either:');
    console.error('   - node scripts/summary.js --emails test-emails.txt');
    console.error('   - node scripts/summary.js test-emails.txt');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(emailsPath)) {
    console.error(`❌ Email file not found: ${emailsPath}`);
    process.exitCode = 1;
    return;
  }

  const emailList = loadEmailFile(emailsPath);
  if (emailList.length === 0) {
    console.error('❌ No emails found in the file');
    process.exitCode = 1;
    return;
  }

  const results = Utils.loadResults();
  // Use a dummy start time; we only care about counts for this test command.
  const startTime = Date.now();

  console.log('📊 Run-scoped summary preview (no browser automation)');
  console.log(`📧 Emails in this run: ${emailList.length}\n`);
  Utils.printSummary(results, startTime, emailList);
}

main().catch((err) => {
  console.error(`💥 Unexpected error: ${err?.message || String(err)}`);
  process.exitCode = 1;
});


