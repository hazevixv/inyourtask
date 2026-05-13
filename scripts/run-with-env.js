const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const [, , envFileArg, ...commandArgs] = process.argv;

if (!envFileArg || commandArgs.length === 0) {
  console.error('Usage: node scripts/run-with-env.js <env-file> <command> [args...]');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFileArg);
const loaded = dotenv.config({ path: envPath });

if (loaded.error) {
  console.error(`Failed to load env file: ${envPath}`);
  console.error(loaded.error.message);
  process.exit(1);
}

const [command, ...args] = commandArgs;

let executable = command;
let executableArgs = args;

if (command === 'next') {
  executable = process.execPath;
  executableArgs = [require.resolve('next/dist/bin/next'), ...args];
}

const child = spawn(executable, executableArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ENV_FILE_IN_USE: envFileArg
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
