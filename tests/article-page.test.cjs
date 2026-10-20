const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const render = require('../lib/article-page.cjs');
const template = fs.readFileSync(path.join(__dirname,'../article.html'),'utf8');
test('new article template renders the actual title, content and cover without JavaScript', () => {
  const result = render(template, {title:'Un essai <lisible>', author:'Raphaël', excerpt:'Chapeau', content:'<p>Le texte accessible</p><script>alert(1)</script>', image:'https://example.com/photo.webp', imageCredit:'Crédit réel'}, '<title>Un essai</title><meta name="description" content="Unique"><link rel="canonical" href="https://example.com/article.html?id=1">');
  assert.match(result, /id="art-title">Un essai &lt;lisible&gt;<\/h1>/);
  assert.match(result, /id="art-content"[^>]*><p>Le texte accessible<\/p><\/div>/);
  assert.match(result, /<figure[^>]+id="art-image-wrapper"[^>]*><img/);
  assert.match(result, /<figcaption>Crédit réel<\/figcaption>/);
  assert.equal((result.match(/name="description"/g)||[]).length,1);
  assert.equal((result.match(/rel="canonical"/g)||[]).length,1);
  assert.doesNotMatch(result, /<script>alert/);
});
test('embedded article JSON cannot escape its script container',()=>{
  const result = render(template,{title:'</script><script>alert(1)</script>',content:'Texte'},'<title>Test</title>');
  const embedded = result.match(/id="article-data">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded).title,'</script><script>alert(1)</script>');
  assert.doesNotMatch(embedded, /</);
});
