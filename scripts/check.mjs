import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readContent, validateContent, root } from './content.mjs';
import { assertDeploymentContract } from './check-deployment.mjs';

for (const directory of ['public', 'workshop', 'scripts', 'tests']) {
  const base = new URL(`${directory}/`, root);
  for (const file of await readdir(base, { recursive: true })) {
    if (/\.(?:mjs|js)$/.test(file)) execFileSync(process.execPath, ['--check', fileURLToPath(new URL(file, base))], { stdio: 'inherit' });
  }
}
validateContent(await readContent());
await assertDeploymentContract();
console.log('JavaScript 语法、作品数据及固定部署合同校验通过。');
