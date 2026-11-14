import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIParser } from '../src/cli.js';

test('GPT editor URL validation requires HTTPS and exact ChatGPT host', () => {
  const cli = new CLIParser();
  assert.equal(cli.isValidUrl('https://chatgpt.com/gpts/editor/g-valid'), true);
  for (const url of [
    'http://chatgpt.com/gpts/editor/g-valid',
    'https://evil.example/gpts/editor/g-valid',
    'https://chatgpt.com.evil.example/gpts/editor/g-valid',
    'https://user:pass@chatgpt.com/gpts/editor/g-valid',
    'https://chatgpt.com/other/gpts/editor/g-valid',
  ]) {
    assert.equal(cli.isValidUrl(url), false, url);
  }
});
