/** LLM이 생성한 리포트 텍스트의 흔한 포맷 실수를 정리한다. 스트리밍/JSON 응답 모두 최종 텍스트에 적용. */
export function cleanReportText(text: string): string {
  // 프롬프트가 "문단은 2~3문장마다 끊고 빈 줄로 나눌 것"을 지시하므로 LLM은 실제로
  // 빈 줄을 넣어 보낸다. 예전에는 여기서 그 빈 줄을 전부 지우고 【 제목 】 앞에만
  // 다시 넣었는데, 그 탓에 문단이 전부 붙어 읽기 힘든 줄글이 됐다. 이제는 문단
  // 구분을 보존하고(연속된 빈 줄은 하나로 정규화), 제목 앞에만 빈 줄을 보장한다.
  const lines = text.split("\n").map((l) => l.trim());
  const out: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      // 연속 빈 줄은 하나로. 맨 앞의 빈 줄은 버린다.
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const isTitle = /^【.*】/.test(line);
    if (isTitle && out.length > 0 && out[out.length - 1] !== "") out.push("");
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();

  return out
    .join("\n")
    // "극신약(극신약)"처럼 이미 한글인 단어에 한자 독음 표기 규칙이 잘못 적용되어
    // 같은 한글이 괄호로 반복되는 경우 제거. 庚(경)처럼 한자+한글 조합은 그대로 둔다.
    .replace(/([가-힣]{2,10})\(\1\)/g, "$1");
}
