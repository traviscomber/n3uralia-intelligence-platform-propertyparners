const { spawnSync } = require('child_process');
const path = require('path');

const pythonExe = 'C:/Users/juanf/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const scriptPath = path.join(__dirname, 'generate-proposal-commercial-text.py');

const result = spawnSync(pythonExe, [scriptPath], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
