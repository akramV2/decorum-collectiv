const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../admin-workbench.js');
test('newsroom filters combine words, status, rubric and format without modifying records',()=>{
 const items=[{title:'Écran compact',author:'Raphaël',category:"À l’usage",type:'ANALYSE',status:'draft',updatedAt:'2026-10-21'}, {title:'Écran compact',category:'Sélection',type:'ARTICLE',status:'published',updatedAt:'2026-10-20'}];
 const original=JSON.stringify(items);
 assert.equal(W.filterPublications(items,{query:'ecran raphael',status:'draft',category:"À l’usage",type:'ANALYSE'}).length,1);
 assert.equal(W.filterPublications(items,{query:'ecran absent'}).length,0);
 assert.equal(W.filterPublications(items,{order:'old'})[0].status,'published');
 assert.equal(JSON.stringify(items),original);
});
test('editorial calendar includes a complete Monday to Sunday grid across year and leap boundaries',()=>{
 for(const [year,month,count] of [[2026,11,31],[2027,0,31],[2028,1,29]]) {
  const days=W.monthDays(year,month);
  assert.equal(days[0].getDay(),1); assert.equal(days.at(-1).getDay(),0); assert.equal(days.length%7,0);
  assert.equal(days.filter(d=>d.getMonth()===month).length,count);
  assert.equal(new Set(days.map(W.dayKey)).size,days.length);
 }
});
test('writing templates cover all four LATENCE rubrics and contain no fabricated article copy',()=>{
 assert.equal(new Set(W.templates.map(t=>t.category)).size,4);
 for(const template of W.templates) {assert.ok(template.content.includes('<h2>'));assert.equal(template.content.includes('Lorem'),false);}
});
