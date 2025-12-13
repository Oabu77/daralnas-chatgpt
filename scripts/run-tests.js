const { spawn } = require('node:child_process');

async function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function parseVitestArgs(rawArgs) {
  const vitestArgs = [];
  let runInBand = false;

  for (const arg of rawArgs) {
    if (arg === '--runInBand' || arg === '-i') {
      runInBand = true;
      continue;
    }

    vitestArgs.push(arg);
  }

  if (runInBand) {
    vitestArgs.push('--fileParallelism=false', '--maxWorkers=1');
  }

  return vitestArgs;
}

async function main() {
  const vitestArgs = parseVitestArgs(process.argv.slice(2));

  await run('wrangler', ['deploy', '--dry-run']);
  await run('npx', ['vitest', 'run', '--config', 'tests/vitest.config.mts', ...vitestArgs]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
