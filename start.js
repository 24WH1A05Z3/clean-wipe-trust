#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting WipeTrust Application...\n');

let frontendProcess;
let backendProcess;

// Start the frontend development server
console.log('📱 Starting frontend server...');
frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

frontendProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[Frontend]', output.trim());
  
  // Start backend when frontend is ready
  if (output.includes('ready in') && !backendProcess) {
    setTimeout(() => {
      console.log('🖥️  Starting Electron backend...');
      backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, 'backend'),
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
      });

      backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        if (frontendProcess) frontendProcess.kill();
        process.exit(code);
      });
    }, 2000);
  }
});

frontendProcess.stderr.on('data', (data) => {
  console.error('[Frontend Error]', data.toString().trim());
});

frontendProcess.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  if (backendProcess) backendProcess.kill();
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (frontendProcess) frontendProcess.kill();
  if (backendProcess) backendProcess.kill();
  process.exit(0);
});
