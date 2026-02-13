/**
 * Wrapper to run the collector with ts-node.
 * Ensures tsconfig.node.json exists (required by ts-node) and runs from project root.
 * Use: node scripts/run-collector.js  (or npm run collector)
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const tsconfigNode = path.join(root, 'tsconfig.node.json');
const collectorEntry = path.join(root, 'src', 'services', 'collector', 'start.ts');

if (!fs.existsSync(collectorEntry)) {
  console.error('Error: Collector entry not found:', collectorEntry);
  process.exit(1);
}

if (!fs.existsSync(tsconfigNode)) {
  console.error('Error: tsconfig.node.json not found in project root.');
  console.error('The collector needs this file for ts-node. Project root:', root);
  console.error('Fix: copy tsconfig.node.json (and tsconfig.json) into the app directory, or re-deploy including these files.');
  process.exit(1);
}

const child = spawn(
  'npx',
  ['ts-node', '-r', 'tsconfig-paths/register', '--project', 'tsconfig.node.json', collectorEntry],
  { stdio: 'inherit', shell: true, cwd: root }
);
child.on('exit', (code) => process.exit(code !== null ? code : 0));
