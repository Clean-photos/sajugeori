import assert from "node:assert/strict";
const { fetchTossPayment } = await import("./toss");

const mk = (status: number, body: unknown) => (async () => ({ ok: status < 400, status, json: async () => body })) as unknown as typeof fetch;
let seenUrl = "";
const spy = (inner: typeof fetch) => (async (u: string, o: unknown) => { seenUrl = u; return (inner as unknown as (u: string, o: unknown) => Promise<unknown>)(u, o); }) as unknown as typeof fetch;

let r = await fetchTossPayment({ orderId: "order_1" }, "sk", spy(mk(200, { status: "CANCELED", paymentKey: "pk", totalAmount: 990 })));
assert.deepEqual(r, { ok: true, status: "CANCELED", paymentKey: "pk", totalAmount: 990 });
assert.match(seenUrl, /payments\/orders\/order_1$/);

r = await fetchTossPayment({ paymentKey: "a/b" }, "sk", spy(mk(200, { status: "DONE" })));
assert.ok(r.ok); assert.match(seenUrl, /payments\/a%2Fb$/);

r = await fetchTossPayment({ orderId: "x" }, "sk", mk(404, { code: "NOT_FOUND_PAYMENT" }));
assert.deepEqual(r, { ok: false, notFound: true, reason: "NOT_FOUND_PAYMENT" });
r = await fetchTossPayment({ orderId: "x" }, "sk", mk(500, {}));
assert.equal(r.ok === false && r.notFound, false);
r = await fetchTossPayment({ orderId: "x" }, "sk", (async () => { throw new Error("net"); }) as unknown as typeof fetch);
assert.deepEqual(r, { ok: false, notFound: false, reason: "net" });
r = await fetchTossPayment({}, "sk"); assert.equal(r.ok, false);
r = await fetchTossPayment({ orderId: "x" }, undefined as unknown as string); // 시크릿 없음
console.log("toss OK");
