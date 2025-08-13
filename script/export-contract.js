#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const get = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i !== -1 ? args[i + 1] : d;
};

const script = get('script', 'MasterDeployment.s.sol');
const chain = get('chain', '13388');
const root = process.cwd();
const broadcastDir = path.join(root, 'broadcast', script, chain);
const runFile = path.join(broadcastDir, 'run-latest.json');
const outDir = path.join(root, 'out');
const targetDir = path.join(root, 'dev-example', 'src', 'abi');

if (!fs.existsSync(runFile)) {
  console.error(`Missing run file: ${runFile}`);
  process.exit(1);
}

const runData = JSON.parse(fs.readFileSync(runFile, 'utf8'));
const txs = runData.transactions || [];

if (!txs.length) {
  console.error('No transactions in broadcast file');
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

const findArtifact = (contractName) => {
  const stack = [outDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) stack.push(full);
      else if (f === `${contractName}.json`) return full;
    }
  }
  return null;
};

const created = {};
for (const tx of txs) {
  if (!tx.contractName || !tx.contractAddress) continue;
  created[tx.contractName] = tx.contractAddress;
}

const results = [];
for (const [contractName, address] of Object.entries(created)) {
  const artifactPath = findArtifact(contractName);
  if (!artifactPath) {
    console.warn(`Artifact not found for ${contractName}`);
    continue;
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  if (!abi) {
    console.warn(`No ABI for ${contractName}`);
    continue;
  }
  const filePath = path.join(targetDir, `${contractName}.json`);
  const data = { address, abi };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  results.push({ contractName, address });
}

if (!results.length) {
  console.error('No contract files written');
  process.exit(1);
}

console.log('Updated:');
for (const r of results) console.log(`${r.contractName}: ${r.address}`);