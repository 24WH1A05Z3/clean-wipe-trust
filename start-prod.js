#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting WipeTrust Application (Production)...\n');

// Start the Electron app directly
console.log('🖥️  Starting Electron application...');
const electronProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

electronProcess.on('close', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  electronProcess.kill();
  process.exit(0);
});
