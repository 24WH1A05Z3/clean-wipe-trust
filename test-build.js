#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testBuild() {
  console.log('🧪 Testing WipeTrust Build Process...\n');

  try {
    // Test frontend build
    console.log('📱 Testing frontend build...');
    await runCommand('npm', ['run', 'build'], __dirname);
    
    // Check if dist folder was created
    const distExists = await fs.access(path.join(__dirname, 'dist')).then(() => true).catch(() => false);
    if (!distExists) {
      throw new Error('Frontend build failed - dist folder not found');
    }
    console.log('✅ Frontend build successful\n');

    // Test backend dependencies
    console.log('🖥️  Testing backend dependencies...');
    await runCommand('npm', ['install'], path.join(__dirname, 'backend'));
    console.log('✅ Backend dependencies installed\n');

    // Test IPC service
    console.log('🔗 Testing IPC service...');
    const ipcServicePath = path.join(__dirname, 'src', 'services', 'ipcService.ts');
    const ipcServiceExists = await fs.access(ipcServicePath).then(() => true).catch(() => false);
    if (!ipcServiceExists) {
      throw new Error('IPC service not found');
    }
    console.log('✅ IPC service exists\n');

    // Test backend modules
    console.log('📦 Testing backend modules...');
    const backendModules = ['DeviceService.js', 'WipeService.js', 'CertificateService.js'];
    for (const module of backendModules) {
      const modulePath = path.join(__dirname, 'backend', 'src', 'modules', module);
      const moduleExists = await fs.access(modulePath).then(() => true).catch(() => false);
      if (!moduleExists) {
        throw new Error(`Backend module ${module} not found`);
      }
    }
    console.log('✅ All backend modules exist\n');

    // Test main electron file
    console.log('⚡ Testing Electron main process...');
    const mainPath = path.join(__dirname, 'backend', 'src', 'main', 'main.js');
    const mainExists = await fs.access(mainPath).then(() => true).catch(() => false);
    if (!mainExists) {
      throw new Error('Electron main process not found');
    }
    console.log('✅ Electron main process exists\n');

    console.log('🎉 All tests passed! The application is ready to run.');
    console.log('\nTo start the application:');
    console.log('  npm start');
    console.log('\nTo build for production:');
    console.log('  npm run build:all');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      output += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
      }
    });

    process.on('error', reject);
  });
}

testBuild();
