import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let output = '';

child.stdout.on('data', (data) => {
  const str = data.toString();
  output += str;
  process.stdout.write(str);
  
  // If we see the prompt about email_accounts, send Enter (default selection)
  if (str.includes('Is email_accounts table created or renamed')) {
    console.log('\nDetected interactive prompt, selecting default (create table)...');
    child.stdin.write('\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  console.log(`\nMigration completed with code: ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  child.kill('SIGINT');
});