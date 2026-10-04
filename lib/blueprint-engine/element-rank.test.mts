import assert from "node:assert/strict";
const { elementRankLine } = await import("./anchor");

// CoS 10차 §5: 표는 목25·화23·토25·금25·수2 — 본문은 서열을 매기면 안 된다(동률은 "비슷함").
const line = elementRankLine({ 木: 25, 火: 23, 土: 25, 金: 25, 水: 2 });
// 화(23)는 선두(25)와 2%p 차이라 함께 "비슷함"으로 묶인다(허용 폭 2%p 이내).
assert.match(line, /^목·토·금·화\(비슷함\) > 수 순/, line);
assert.ok(!/토>목>금|목>토>금|목 > 토/.test(line));
assert.match(line, /가장 많은 쪽\(목·토·금·화\)과 가장 적은 쪽\(수\)의 차이가 큼/);

// 허용 폭을 넘으면 서열이 갈린다(25 vs 22.9)
const split = elementRankLine({ 木: 25, 火: 22, 土: 25, 金: 25, 水: 3 });
assert.match(split, /^목·토·금\(비슷함\) > 화 > 수 순/, split);
assert.match(line, /묶인 오행끼리는 많고 적음을 가르지 말 것/);

// 뚜렷한 서열이 있으면 그대로 서열 + 차이가 큼
const clear = elementRankLine({ 木: 40, 火: 25, 土: 15, 金: 10, 水: 10 });
assert.match(clear, /^목 > 화 > 토·금·수\(비슷함\)|^목 > 화 > 토 > 금·수\(비슷함\)|^목 > 화 > 토·금·수/, clear);
assert.match(clear, /차이가 큼/);

// 전부 비슷하면 편차 없음, 단정 금지 안내
const flat = elementRankLine({ 木: 20, 火: 20, 土: 20, 金: 20, 水: 20 });
assert.match(flat, /목·화·토·금·수\(비슷함\)/);
assert.match(flat, /편차는 크지 않음/);

// 결정성(같은 입력=같은 출력)
assert.equal(elementRankLine({ 木: 25, 火: 23, 土: 25, 金: 25, 水: 2 }), line);
console.log("element rank OK");
