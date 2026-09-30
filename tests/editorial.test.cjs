const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../lib/content.cjs");
test("editorial validation strips executable HTML and preserves semantic content", () => {
  const a = C.article({
    title: "Béton",
    status: "draft",
    content:
      '<h2>Lumière</h2><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">Lien</a>',
  });
  assert.match(a.content, /<h2>Lumière<\/h2>/);
  assert.doesNotMatch(a.content, /script|onerror|javascript/);
});
test("draft needs only a title, publishing requires author, lead and content", () => {
  assert.equal(C.article({ title: "À venir" }).status, "draft");
  assert.throws(
    () => C.article({ title: "À venir", status: "published" }),
    /requis/,
  );
});
test("schedule rejects past and missing dates and retains UTC instant", () => {
  for (const publishAt of [null, "2020-01-01T00:00:00Z"])
    assert.throws(
      () => C.article({ title: "Test", status: "scheduled", publishAt }),
      /future/,
    );
  const a = C.article({
    title: "Test",
    status: "scheduled",
    publishAt: "2099-01-01T12:00:00+01:00",
    author: "Auteur",
    excerpt: "Chapeau",
    content: "Texte",
  });
  assert.equal(a.publishAt, "2099-01-01T11:00:00.000Z");
});
test("coordinates accept Greenwich and the equator but reject partial or out-of-range pairs", () => {
  assert.deepEqual(C.coordinates({ lat: "0", lng: "0" }), { lat: 0, lng: 0 });
  for (const v of [
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: 0 },
    { lat: "x", lng: 1 },
  ])
    assert.throws(() => C.coordinates(v));
});
test("submission normalizes only reader fields and cannot self-approve", () => {
  const s = C.submission({
    name: "Villa",
    city: "Lille",
    country: "France",
    description: "Lieu",
    reason: "Lumière",
    email: "a@example.org",
    status: "mapped",
    admin: true,
  });
  assert.equal(s.status, "pending");
  assert.equal(s.admin, undefined);
  assert.throws(() => C.submission({ ...s, company: "spam" }));
  assert.throws(() => C.submission({ ...s, email: "invalid" }));
});
test("image input rejects SVG, arbitrary schemes and oversize data", () => {
  assert.throws(() => C.image("data:image/svg+xml;base64,AAAA"));
  assert.throws(() => C.image("javascript:alert(1)"));
  assert.throws(() => C.image("data:image/png;base64," + "A".repeat(700000)));
});
test("private limits use irreversible scoped HMAC keys", () => {
  assert.notEqual(
    C.rateKey("127.0.0.1", "likes", "a"),
    C.rateKey("127.0.0.1", "submissions", "a"),
  );
  assert.equal(C.rateKey("127.0.0.1", "likes", "a").length, 64);
});

class MemoryDB {
  constructor() {
    this.store = new Map();
    this.next = 0;
  }
  collection(name) {
    const db = this;
    return {
      doc(id = `generated-${++db.next}`) {
        const key = `${name}/${id}`;
        return {
          id,
          key,
          get: async () => db.snap(key),
          set: async (v) => db.store.set(key, { ...v }),
          update: async (v) =>
            db.store.set(key, { ...db.store.get(key), ...v }),
        };
      },
      add: async (value) => {
        const id = `generated-${++db.next}`;
        db.store.set(`${name}/${id}`, value);
        return { id };
      },
      ...db.query(name),
    };
  }
  snap(key) {
    return {
      id: key.split("/")[1],
      exists: this.store.has(key),
      data: () => this.store.get(key),
      ref: { id: key.split("/")[1], key },
    };
  }
  query(name, filter = null, limit = Infinity, order = null, cursor = null) {
    const db = this;
    return {
      where: (field, op, value) =>
        db.query(name, [field, op, value], limit, order, cursor),
      limit: (n) => db.query(name, filter, n, order, cursor),
      orderBy: (field, direction) =>
        db.query(name, filter, limit, [field, direction], cursor),
      select: () => db.query(name, filter, limit, order, cursor),
      startAfter: (v) => db.query(name, filter, limit, order, v.id || v),
      get: async () => {
        let docs = [...db.store.keys()]
          .filter((k) => k.startsWith(name + "/"))
          .map((k) => db.snap(k));
        if (filter) docs = docs.filter((d) => d.data()[filter[0]] <= filter[2]);
        if (order)
          docs.sort((a, b) => {
            const av = order[0] === "__name__" ? a.id : a.data()[order[0]],
              bv = order[0] === "__name__" ? b.id : b.data()[order[0]];
            return (
              (av > bv ? 1 : av < bv ? -1 : 0) * (order[1] === "desc" ? -1 : 1)
            );
          });
        if (cursor)
          docs = docs.slice(docs.findIndex((d) => d.id === cursor) + 1);
        return { docs: docs.slice(0, limit) };
      },
    };
  }
  async runTransaction(fn) {
    const queue = [];
    const result = await fn({
      get: (ref) => Promise.resolve(this.snap(ref.key)),
      set: (ref, v) => queue.push(() => this.store.set(ref.key, { ...v })),
      update: (ref, v) =>
        queue.push(() =>
          this.store.set(ref.key, { ...this.store.get(ref.key), ...v }),
        ),
      delete: (ref) => queue.push(() => this.store.delete(ref.key)),
    });
    queue.forEach((fn) => fn());
    return result;
  }
}
const db = new MemoryDB();
const modulePath = require.resolve("../lib/firebase.cjs");
require.cache[modulePath] = {
  id: modulePath,
  filename: modulePath,
  loaded: true,
  exports: {
    services: () => ({ db }),
    configured: () => true,
    authorize: async (req) => {
      if (req.headers.authorization !== "Bearer editor")
        throw C.error("Accès refusé.", 403);
      return { uid: "private-editor-uid" };
    },
  },
};
const handler = require("../api/editorial.js");
async function request(
  action,
  { body, params = {}, admin = false, ip = "127.0.0.1" } = {},
) {
  const headers = {};
  let result;
  const res = {
    statusCode: 200,
    setHeader: (k, v) => {
      headers[k] = v;
    },
    end: (value) => {
      try {
        result = { status: res.statusCode, body: JSON.parse(value), headers };
      } catch {
        result = { status: res.statusCode, body: value, headers };
      }
    },
  };
  await handler(
    {
      method: body ? "POST" : "GET",
      query: { action, ...params },
      body,
      headers: admin ? { authorization: "Bearer editor" } : {},
      socket: { remoteAddress: ip },
    },
    res,
  );
  return result;
}
test("API denies unauthenticated private lists", async () => {
  const r = await request("admin-list", {
    params: { collection: "submissions" },
  });
  assert.equal(r.status, 403);
});
test("draft is private; stale revision cannot overwrite it; publishing reuses its identifier", async () => {
  db.store.clear();
  const draft = {
    title: "Projet",
    status: "draft",
    content: "Texte",
    excerpt: "Chapeau",
    author: "Rédaction",
  };
  let r = await request("admin-save", { admin: true, body: draft });
  assert.equal(r.status, 200);
  const id = r.body.id;
  assert.equal(db.store.has(`articles/${id}`), false);
  assert.equal((await request("article", { params: { id } })).status, 404);
  r = await request("admin-save", {
    admin: true,
    body: { ...draft, id, revision: "stale" },
  });
  assert.equal(r.status, 409);
  const revision = db.store.get(`editorialArticles/${id}`).updatedAt;
  r = await request("admin-save", {
    admin: true,
    body: { ...draft, id, revision, status: "published" },
  });
  assert.equal(r.status, 200);
  assert.equal(db.store.has(`editorialArticles/${id}`), false);
  assert.equal(db.store.get(`articles/${id}`).updatedBy, undefined);
});
test("scheduled content stays private until due; publication preserves likes and runs only once", async () => {
  db.store.clear();
  db.store.set("scheduledArticles/future", {
    title: "Futur",
    publishAt: "2099-01-01T00:00:00.000Z",
    status: "scheduled",
  });
  assert.equal(
    (await request("article", { params: { id: "future" } })).status,
    404,
  );
  db.store.set("articles/due", { title: "Ancienne version", likes: 7 });
  db.store.set("scheduledArticles/due", {
    title: "Nouvelle version",
    publishAt: "2020-01-01T00:00:00.000Z",
    status: "scheduled",
    updatedBy: "private",
  });
  db.store.set("editorialArticles/due", { status: "scheduled" });
  const a = await request("article", { params: { id: "due" } });
  assert.equal(a.body.title, "Nouvelle version");
  assert.equal(a.body.likes, 7);
  assert.equal(a.body.updatedBy, undefined);
  assert.equal(db.store.has("scheduledArticles/due"), false);
  assert.equal(db.store.has("editorialArticles/due"), false);
  assert.equal(
    (await request("article", { params: { id: "due" } })).body.likes,
    7,
  );
});
test("countdown never exposes an unpublished article identifier", async () => {
  db.store.clear();
  db.store.set("settings/nextPublication", {
    enabled: true,
    title: "À venir",
    articleId: "secret",
    publishAt: "2099-01-01T00:00:00Z",
  });
  const r = await request("countdown");
  assert.equal(r.body.articleId, undefined);
  assert.equal(r.body.available, false);
});
test("moderation does not copy contributor email to public map and mapping is idempotent", async () => {
  db.store.clear();
  db.store.set("submissions/s1", {
    name: "Lieu",
    city: "Paris",
    country: "France",
    email: "private@example.org",
    description: "Texte",
    image: "",
    architect: "Architecte",
    website: "https://example.org",
  });
  const body = { id: "s1", status: "mapped", lat: 48, lng: 2 };
  assert.equal(
    (await request("admin-moderate", { admin: true, body })).status,
    200,
  );
  assert.equal(
    (await request("admin-moderate", { admin: true, body })).status,
    200,
  );
  const p = db.store.get("places/submission-s1");
  assert.equal(p.email, undefined);
  assert.equal(
    [...db.store.keys()].filter((k) => k.startsWith("places/")).length,
    1,
  );
});
test("fourth proposal in one hour is refused by durable rate limit", async () => {
  db.store.clear();
  process.env.RATE_LIMIT_SECRET = "test-only-not-a-production-secret";
  const body = {
    name: "Lieu",
    city: "Paris",
    country: "France",
    email: "test@example.org",
    description: "Texte",
    reason: "Histoire",
  };
  for (let i = 0; i < 3; i++)
    assert.equal((await request("submit", { body })).status, 201);
  assert.equal((await request("submit", { body })).status, 429);
});
test("archive removes the public version but preserves an editable private draft", async () => {
  db.store.clear();
  db.store.set("articles/a1", {
    title: "Conservé",
    content: "Texte",
    likes: 9,
  });
  assert.equal(
    (await request("admin-archive", { admin: true, body: { id: "a1" } }))
      .status,
    200,
  );
  assert.equal(db.store.has("articles/a1"), false);
  assert.equal(db.store.get("editorialArticles/a1").title, "Conservé");
});
test("metadata escapes HTML and closes no JSON-LD script", () => {
  const s = handler.metadata(
    {
      title: "</script><img onerror=x>",
      excerpt: '" description',
      author: "Auteur",
    },
    "id",
  );
  assert.match(s, /canonical/);
  assert.match(s, /og:title/);
  assert.doesNotMatch(s, /<img onerror/);
  assert.match(s, /\\u003c/);
});
