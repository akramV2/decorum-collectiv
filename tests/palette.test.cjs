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
test('midnight palette supports all editorial text pairs at AA',()=>{for(const [a,b] of [['primary','background'],['text','background'],['secondary','background'],['on-primary','primary']])assert.ok(contrast(color(a),color(b))>=4.5,a+'/'+b);assert.doesNotMatch(css,/#(?:BF00FF|2CFF05|FF7900|8A2B0E|89F336)/i);});
test('mobile navigation keeps the signature surface for light labels',()=>{const mobile=css.slice(css.indexOf('@media (max-width: 768px)'));assert.match(mobile,/\.nav-links\s*\{[^}]*background-color:\s*var\(--color-primary\)/);});
