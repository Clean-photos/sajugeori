/** LLM이 생성한 리포트 텍스트의 흔한 포맷 실수를 정리한다. 스트리밍/JSON 응답 모두 최종 텍스트에 적용. */
export function cleanReportText(text: string): string {
  // 빈 줄을 전부 지우고, 【 제목 】 줄 앞에만 빈 줄을 하나씩 다시 넣는다.
  // 결과: 섹션 제목-본문은 붙고, 섹션과 섹션 사이만 한 줄 띄워진다.
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const out: string[] = [];
  for (const line of lines) {
    const isTitle = /^【.*】/.test(line);
    if (isTitle && out.length > 0) out.push("");
    out.push(line);
  }

  return out
    .join("\n")
    // "극신약(극신약)"처럼 이미 한글인 단어에 한자 독음 표기 규칙이 잘못 적용되어
    // 같은 한글이 괄호로 반복되는 경우 제거. 庚(경)처럼 한자+한글 조합은 그대로 둔다.
    .replace(/([가-힣]{2,10})\(\1\)/g, "$1");
}
