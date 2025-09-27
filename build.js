#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  console.log('🏗️  Building WipeTrust Application...\n');

  try {
    // Build frontend
    console.log('📱 Building frontend...');
    await runCommand('npm', ['run', 'build'], __dirname);
    console.log('✅ Frontend build complete\n');

    // Build backend
    console.log('🖥️  Building backend...');
    await runCommand('npm', ['run', 'build'], path.join(__dirname, 'backend'));
    console.log('✅ Backend build complete\n');

    console.log('🎉 Build completed successfully!');
    console.log('\nTo run the application:');
    console.log('  npm start');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', reject);
  });
}

build();
