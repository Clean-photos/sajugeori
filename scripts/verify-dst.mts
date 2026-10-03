import { seoulOffsetMs } from "../lib/blueprint-engine/astro";
const pub: Record<number,[string,string]> = {
 1948:["06-01","09-13"],1949:["04-03","09-11"],1950:["04-01","09-10"],1951:["05-06","09-09"],
 1955:["05-05","09-09"],1956:["05-20","09-30"],1957:["05-05","09-22"],1958:["05-04","09-21"],1959:["05-03","09-20"],1960:["05-01","09-18"],
 1987:["05-10","10-11"],1988:["05-08","10-09"]};
const fmt = (ms:number)=>{const o=seoulOffsetMs(ms);const d=new Date(ms+o);return d.toISOString().slice(0,16).replace("T"," ")+` (UTC${o>=0?"+":"-"}${Math.abs(o)/3600000})`;};
const found: Record<number,string[]> = {};
for (let y=1945;y<=1990;y++){
  let prev=seoulOffsetMs(Date.UTC(y,0,1)-9*3600000);
  for (let t=Date.UTC(y,0,1)-9*3600000; t<Date.UTC(y+1,0,1)-9*3600000; t+=60000*15){
    const o=seoulOffsetMs(t); if(o!==prev){(found[y]??=[]).push(`${fmt(t-60000*15)} -> ${fmt(t)}`);prev=o;}
  }
}
let bad=0;
for (const y of Object.keys(found).map(Number)) {
  const p=pub[y];
  console.log(y, p?`공개자료 ${p[0]}~${p[1]}`:"공개자료에 시행 없음");
  for(const l of found[y]) console.log("   ",l);
  if(!p) bad++;
}
for (const y of Object.keys(pub).map(Number)) if(!found[y]) {console.log("엔진에 전환 없음:",y);bad++;}
console.log("불일치 연도 수:",bad);
