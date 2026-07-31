/**
 * 오늘 날짜(KST)를 시드로 배열을 결정적으로 섞어 앞 count개를 반환한다.
 *
 * 같은 날에는 항상 같은 결과가 나오므로:
 *  - 서버 렌더와 클라이언트 hydration이 어긋나지 않는다(Math.random과 다른 점).
 *  - 크롤러가 하루 안에 여러 번 방문해도 같은 내용을 본다.
 *  - 자정(KST)이 지나면 시드가 바뀌어 노출 항목이 갱신된다.
 *
 * 데이터가 이미 메모리 배열이라 DB 조회가 없고, 셔플 비용은 무시할 수준이다.
 */
export function pickDaily<T>(arr: T[], count: number): T[] {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const day =
    kst.getUTCFullYear() * 10000 + (kst.getUTCMonth() + 1) * 100 + kst.getUTCDate();

  // 연속된 날짜의 시드가 비슷하면 순열도 비슷해져 특정 항목이 잘 안 뽑힌다.
  // Knuth 곱셈 해시로 시드를 흩뿌린 뒤 몇 번 돌려(burn-in) 초기 편향을 없앤다.
  let s = ((day * 2654435761) >>> 0) % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5; i++) rnd();

  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}
