#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');

function hasSupabaseCli() {
  try {
    const res = spawnSync('supabase', ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch (err) {
    return false;
  }
}

if (!hasSupabaseCli()) {
  console.log('Supabase CLI not found in PATH — skipping `supabase start`.');
  console.log('Install it from https://supabase.com/docs/guides/cli and run `supabase start` manually if you need the local DB/emulator.');
  process.exit(0);
}

console.log('Starting Supabase CLI (supabase start) — this will run in the foreground.');

const child = spawn('supabase', ['start'], { stdio: 'inherit' });

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code);
});
