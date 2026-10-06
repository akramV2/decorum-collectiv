const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');
const color = name => css.match(new RegExp('--color-' + name + ':\\s*(#[0-9A-Fa-f]{6})'))[1];
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(c => parseInt(c,16)/255).map(c => c<=.04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test('official palette uses readable small text pairs; bright accents are not white text backgrounds',()=>{
  for(const [a,b] of [['black','white'],['brown-red','white'],['black','orange'],['black','acid-green']]) assert.ok(contrast(color(a),color(b))>=4.5, `${a}/${b}`);
  assert.ok(contrast(color('orange'),color('white'))<4.5);
  assert.ok(contrast(color('acid-green'),color('white'))<3);
  assert.match(css,/\.tag-type\s*\{[^}]*color:\s*var\(--color-black\)/);
  assert.match(css,/\.btn-submit:hover\s*\{[^}]*color:\s*var\(--color-black\)/);
});
test('mobile navigation keeps a dark surface for its light labels',()=>{
  const mobile=css.slice(css.indexOf('@media (max-width: 768px)'));
  assert.match(mobile,/\.nav-links\s*\{[^}]*background-color:\s*var\(--color-black\)/);
});
