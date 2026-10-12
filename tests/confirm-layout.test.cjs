'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../src');
test('dialog optional details remain hidden even though .details is a grid', () => {
  const html = fs.readFileSync(path.join(dir, 'confirm.html'), 'utf8');
  const css = fs.readFileSync(path.join(dir, 'confirm.css'), 'utf8');
  assert.match(html, /id="details"[^>]*\bhidden\b/);
  assert.match(css, /\.details\s*\{[^}]*display\s*:\s*grid/);
  assert.match(css, /\[hidden\]\s*\{\s*display\s*:\s*none\s*!important/);
});
