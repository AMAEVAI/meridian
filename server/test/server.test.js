import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseToolsFromResponse } from '../src/agent/vibeAgent.js';

test('parseToolsFromResponse extracts file write tools from LLM output', () => {
  const llmText = `
Here is the new button component for your app:

<<<TOOL:WRITE_FILE path="src/Button.jsx">>>
import React from 'react';
export function Button({ label }) {
  return <button className="btn">{label}</button>;
}
<<<END_TOOL>>>

And here is the style:

<<<TOOL:WRITE_FILE path="src/Button.css">>>
.btn { background: indigo; color: white; }
<<<END_TOOL>>>

Done!
  `;

  const tools = parseToolsFromResponse(llmText);
  assert.equal(tools.length, 2);
  assert.equal(tools[0].type, 'WRITE_FILE');
  assert.equal(tools[0].path, 'src/Button.jsx');
  assert.ok(tools[0].content.includes('export function Button'));

  assert.equal(tools[1].type, 'WRITE_FILE');
  assert.equal(tools[1].path, 'src/Button.css');
  assert.ok(tools[1].content.includes('.btn { background: indigo;'));
});

test('parseToolsFromResponse extracts command execution tools', () => {
  const llmText = `
Let's install lodash:

<<<TOOL:COMMAND>>>
npm install lodash
<<<END_TOOL>>>
  `;

  const tools = parseToolsFromResponse(llmText);
  assert.equal(tools.length, 1);
  assert.equal(tools[0].type, 'COMMAND');
  assert.equal(tools[0].command, 'npm install lodash');
});
