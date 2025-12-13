#!/usr/bin/env node

import { CLIParser } from './src/cli.js';
import { GPTSharer } from './src/automation.js';
import { Utils } from './src/utils.js';

async function main() {
  console.log('🤖 GPT Share Automator v1.0.0');
  console.log('================================\n');

  // Parse command line arguments
  const cli = new CLIParser();
  const { options, errors, isValid } = cli.parse();

  if (!isValid) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.log('\nFor help, run: npm run share -- --help\n');
    cli.printUsage();
    process.exit(1);
  }

  // Auto-detect Chrome path if not provided
  if (!options.chromePath) {
    try {
      options.chromePath = await cli.detectChromePath();
      console.log(`🔍 Auto-detected Chrome path: ${options.chromePath}`);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  }

  // Load and validate email list
  let emailList;
  try {
    emailList = await cli.loadEmailList();
    console.log(`📧 Loaded ${emailList.length} emails from ${options.emails}`);

    if (emailList.length === 0) {
      console.error('❌ No valid emails found in the file');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  // Apply max limit if specified
  if (options.max && emailList.length > options.max) {
    emailList = emailList.slice(0, options.max);
    console.log(`📊 Limited to first ${options.max} emails`);
  }

  // Show configuration summary
  console.log('\n⚙️  Configuration:');
  console.log(`  URL: ${options.url}`);
  console.log(`  Profile: ${options.profileDir}`);
  console.log(`  Chrome: ${options.chromePath}`);
  console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`  Resume: ${options.resume ? 'Yes' : 'No'}`);
  console.log(`  Emails to process: ${emailList.length}`);
  if (options.delayMinMs !== undefined && options.delayMaxMs !== undefined) {
    console.log(`  Delay between emails: ${options.delayMinMs}-${options.delayMaxMs}ms`);
  }

  const startTime = Date.now();
  let sharer = null;

  try {
    // Initialize the GPT sharer
    sharer = new GPTSharer(options);
    await sharer.initialize();

    // Navigate to GPT editor
    await sharer.navigateToGPTEditor();

    // Click share button to open modal
    await sharer.clickShareButton();

    // Process all emails
    const results = await sharer.shareToEmails(emailList);

    // Print final summary
    // Important: `results` is a persisted ledger across runs. Scope the printed summary to THIS run's input list.
    Utils.printSummary(results, startTime, emailList);

    if (options.dryRun) {
      console.log('\n🔍 This was a dry run - no actual sharing was performed');
    } else {
      console.log('\n✅ GPT sharing automation completed!');
    }

  } catch (error) {
    console.error(`\n💥 Fatal error: ${error.message}`);

    if (sharer?.page) {
      await Utils.takeScreenshot(sharer.page, 'fatal_error', error.message);
    }

    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Close any existing Chrome windows using the same profile directory, then re-run');
    console.log('2. Verify you\'re logged into ChatGPT in the launched Chrome profile');
    console.log('3. Check that the GPT editor URL is correct and accessible');
    console.log('4. Ensure you have permission to share this GPT');

    // Avoid process.exit() so the async cleanup in finally can run reliably on corporate setups.
    process.exitCode = 1;
  } finally {
    // Clean up
    if (sharer) {
      await sharer.close();
    }
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
