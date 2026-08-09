/** 실행: npx tsx lib/blueprint-engine/anchor.test.ts */
import { buildPreciseChart } from "./engine";
import { computeAnchorFacts, anchorFactsToPromptText } from "./anchor";

const chart = buildPreciseChart("1989-03-21T18:50:00", "F", true);
const facts = computeAnchorFacts(chart);
console.log(anchorFactsToPromptText(facts));
