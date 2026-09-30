// Vercel's loader does not support jwks-rsa's synchronous require('jose').
// Keep the current security dependency and use its supported async import.
// Upstream: https://github.com/auth0/node-jwks-rsa/issues/507
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(path.dirname(require.resolve('jwks-rsa')), 'utils.js');
let source = fs.readFileSync(filename, 'utf8');
const marker = "  const jose = await import('jose');";
if (!source.includes(marker)) {
  if (!source.includes("const jose = require('jose');") || !source.includes('async function retrieveSigningKeys(jwks) {')) {
    throw new Error('jwks-rsa changed: review its ESM compatibility before deploying.');
  }
  source = source.replace("const jose = require('jose');", '')
    .replace('async function retrieveSigningKeys(jwks) {', 'async function retrieveSigningKeys(jwks) {\n' + marker);
  fs.writeFileSync(filename, source);
}
const passportFile = path.join(path.dirname(filename), 'integrations/passport.js');
let passport = fs.readFileSync(passportFile, 'utf8');
if (!passport.includes("const jose = await import('jose');")) {
  if (!passport.includes("const jose = require('jose');") || !passport.includes('return function secretProvider(req, rawJwtToken, cb) {')) {
    throw new Error('jwks-rsa Passport integration changed: review ESM compatibility.');
  }
  passport = passport.replace("const jose = require('jose');", '')
    .replace('return function secretProvider(req, rawJwtToken, cb) {', 'return async function secretProvider(req, rawJwtToken, cb) {')
    .replace('      decoded = {', "      const jose = await import('jose');\n      decoded = {");
  fs.writeFileSync(passportFile, passport);
}
