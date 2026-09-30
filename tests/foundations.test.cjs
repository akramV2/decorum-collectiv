const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
function context(extra = {}) {
  const ctx = vm.createContext({
    URL,
    TextEncoder,
    console,
    window: {},
    document: {
      addEventListener() {},
      createElement(tag) {
        return { tag, textContent: "" };
      },
    },
    ...extra,
  });
  vm.runInContext(source, ctx);
  return ctx;
}

test("metadata escapes markup, quotes and ampersands", () => {
  const ctx = context();
  assert.equal(
    ctx.escapeHtml("<img src=x onerror=\"attack()\"> & 'x'"),
    "&lt;img src=x onerror=&quot;attack()&quot;&gt; &amp; &#39;x&#39;",
  );
});
test("image URLs reject executable schemes and SVG data but preserve existing raster imports", () => {
  const ctx = context();
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<script>x</script>",
    "data:image/svg+xml;base64,AAAA",
    "//evil.example/a",
  ]) {
    assert.equal(ctx.safeImageUrl(url), "");
  }
  assert.equal(
    ctx.safeImageUrl("https://example.org/photo.webp"),
    "https://example.org/photo.webp",
  );
  assert.equal(
    ctx.safeImageUrl("data:image/png;base64,AAAA"),
    "data:image/png;base64,AAAA",
  );
});
test("missing sanitizer renders HTML as inert text", () => {
  const container = {
    textContent: "",
    set innerHTML(_) {
      throw new Error("unsafe HTML assignment");
    },
  };
  context().renderEditorialContent(container, "<img src=x onerror=alert(1)>");
  assert.equal(container.textContent, "<img src=x onerror=alert(1)>");
});
test("plain text preserves paragraph and heading behavior without parsing entities", () => {
  const children = [];
  const container = {
    replaceChildren() {
      children.length = 0;
    },
    appendChild(el) {
      children.push(el);
    },
  };
  context().renderEditorialContent(
    container,
    "Architecture\n\nUne façade & sa lumière.",
  );
  assert.deepEqual(
    children.map((x) => [x.tag, x.textContent]),
    [
      ["h2", "Architecture"],
      ["p", "Une façade & sa lumière."],
    ],
  );
});
test("unavailable database rejects writes instead of reporting success", async () => {
  await assert.rejects(
    context().saveNewArticle({ title: "Test" }),
    /Connexion indisponible/,
  );
});
test("oversized article is rejected before any database write", async () => {
  let writes = 0;
  const ctx = context({
    firebase: {
      apps: [{}],
      firestore() {
        return {
          collection() {
            return {
              add() {
                writes++;
              },
            };
          },
        };
      },
    },
  });
  await assert.rejects(
    ctx.saveNewArticle({ content: "é".repeat(500000) }),
    /trop volumineux/,
  );
  assert.equal(writes, 0);
});
test("Firestore failures remain distinguishable from an empty collection", async () => {
  const ctx = context({
    console: { error() {} },
    firebase: {
      apps: [{}],
      firestore() {
        return {
          collection() {
            return {
              orderBy() {
                return {
                  limit() {
                    return {
                      get() {
                        throw new Error("offline");
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  });
  await assert.rejects(ctx.getArticlesFromCloud(), /offline/);
});
test("each HTML page loads main script once; inline scripts compile", () => {
  for (const name of ["index.html", "article.html", "admin.html"]) {
    const html = fs.readFileSync(path.join(root, name), "utf8");
    assert.equal((html.match(/src="script\.js"/g) || []).length, 1, name);
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))
      new vm.Script(match[1]);
  }
  const article = fs.readFileSync(path.join(root, "article.html"), "utf8");
  assert.equal((article.match(/renderSingleArticle\(\)/g) || []).length, 0);
});

function publishingContext({ valid = true, save } = {}) {
  const elements = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "add-article-form"
          ? { reportValidity: () => valid }
          : { value: "Texte" },
    },
  );
  const buttons = [{ disabled: false }];
  const notices = [];
  const ctx = vm.createContext({
    document: {
      addEventListener() {},
      getElementById: (id) => elements[id],
      querySelectorAll: () => buttons,
    },
    firebase: {
      firestore: { FieldValue: { serverTimestamp: () => "timestamp" } },
    },
    saveNewArticle: save || (async () => {}),
    showNotification: (msg) => notices.push(msg),
    sessionStorage: { setItem() {} },
    window: { location: { href: "" } },
  });
  const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))
    vm.runInContext(match[1], ctx);
  return { ctx, buttons, notices };
}
test("publishing validates required fields before saving", async () => {
  let writes = 0;
  const { ctx } = publishingContext({
    valid: false,
    save: async () => {
      writes++;
    },
  });
  await ctx.executePublishing();
  assert.equal(writes, 0);
});
test("publishing failure keeps the form and restores submit buttons", async () => {
  const { ctx, buttons, notices } = publishingContext({
    save: async () => {
      throw new Error("offline");
    },
  });
  await ctx.executePublishing();
  assert.equal(ctx.window.location.href, "");
  assert.equal(buttons[0].disabled, false);
  assert.deepEqual(notices, ["offline"]);
});
test("double submission creates a single article", async () => {
  let writes = 0,
    resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const { ctx } = publishingContext({
    save: async () => {
      writes++;
      await pending;
    },
  });
  const first = ctx.executePublishing();
  await ctx.executePublishing();
  resolve();
  await first;
  assert.equal(writes, 1);
  assert.equal(ctx.window.location.href, "index.html");
});
