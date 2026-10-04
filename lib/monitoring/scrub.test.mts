import assert from "node:assert/strict";
const { scrubEvent, stripQuery } = await import("./scrub");

const ev = scrubEvent({
  request: {
    url: "https://www.sajugeori.com/api/premium/yearly?birth_date=1989-03-21&gender=F",
    query_string: "birth_date=1989-03-21",
    cookies: { session: "secret" },
    data: { birth_date: "1989-03-21", email: "a@b.com" },
    headers: { Cookie: "x=1", Authorization: "Bearer t", "User-Agent": "UA", "Content-Type": "application/json" },
  },
  user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" },
  breadcrumbs: [{ category: "fetch", data: { url: "/api/x?birth_date=1989-03-21", body: "secret", method: "POST" } }],
});
assert.equal(ev.request?.url, "https://www.sajugeori.com/api/premium/yearly");
assert.equal(ev.request?.data, undefined);
assert.equal(ev.request?.cookies, undefined);
assert.equal(ev.request?.query_string, undefined);
assert.deepEqual(Object.keys(ev.request!.headers!).sort(), ["Content-Type", "User-Agent"]);
assert.deepEqual(ev.user, { id: "u1" });
assert.equal(ev.breadcrumbs![0].data!.url, "/api/x");
assert.equal(ev.breadcrumbs![0].data!.body, undefined);
assert.equal(ev.breadcrumbs![0].data!.method, "POST");
assert.deepEqual(scrubEvent({}), {});
assert.equal(stripQuery("/a?b=1"), "/a");
console.log("scrub OK");
