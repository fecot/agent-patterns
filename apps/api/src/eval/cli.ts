import { runEval } from "./runEval";

/**
 * `pnpm eval` のエントリ。結果を表示し、失敗があれば非ゼロで終了する。
 * mock provider を使うので外部 API なし・DB なしで回せる。
 */
async function main() {
  const report = await runEval();
  for (const c of report.cases) {
    console.log(`${c.ok ? "✔" : "✖"} [${c.suite}] ${c.name} — ${c.detail}`);
  }
  console.log(`\nEval: ${report.passed}/${report.total} passed`);
  if (report.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
