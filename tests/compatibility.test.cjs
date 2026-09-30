const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
test('Firebase loads and resolves an RSA key without synchronous ESM support', () => {
  execFileSync(process.execPath, ['--no-experimental-require-module', '-e', `
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    require('./api/editorial.js');
    require('./lib/pdf.cjs');
    const { retrieveSigningKeys } = require('jwks-rsa/src/utils');
    const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    retrieveSigningKeys([{ ...publicKey.export({format:'jwk'}), kid:'test-key', use:'sig' }]).then(keys => {
      assert.equal(keys.length, 1);
      assert.equal(keys[0].kid, 'test-key');
      assert.deepEqual(crypto.createPublicKey(keys[0].getPublicKey()).export({format:'jwk'}), publicKey.export({format:'jwk'}));
    }).catch(e => { console.error(e); process.exitCode = 1; });
  `], { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
});
