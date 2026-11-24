// Сводка аудита скорости для агента: короткий summary.json вместо полных отчётов Lighthouse.
// Запуск: node summarize.mjs <каталог lhci upload --target=filesystem> <summary.json>
// Окружение: APP_URL, RUN_URL, APP_STATUS (ok | unavailable), APP_STATUS_REASON.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Основные метрики производительности. Находка — метрика в красной зоне Lighthouse (score < 0.5).
const METRICS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
];
const POOR_SCORE = 0.5;
// Подсказки к действию: возможности оптимизации с заметной экономией времени.
const MIN_SAVINGS_MS = 300;

const [lhciDir, outFile] = process.argv.slice(2);
if (!lhciDir || !outFile) {
  console.error('usage: node summarize.mjs <lhci-dir> <summary.json>');
  process.exit(2);
}

const base = {
  schema: 1,
  sample: false,
  app_url: process.env.APP_URL ?? '',
  run_url: process.env.RUN_URL ?? '',
  generated_at: new Date().toISOString(),
};

function write(summary) {
  writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`status: ${summary.status}, findings: ${summary.findings.length}`);
}

// Нет данных — это не «проблем нет»: агент пишет об этом отдельно и ничего не закрывает.
function noData(reason) {
  write({ ...base, status: 'no_data', reason, pages: [], findings: [] });
}

if (process.env.APP_STATUS !== 'ok') {
  noData(process.env.APP_STATUS_REASON || 'приложение не ответило на /api/health');
  process.exit(0);
}

const manifestPath = join(lhciDir, 'manifest.json');
if (!existsSync(manifestPath)) {
  noData('Lighthouse CI не сохранил отчёты (нет manifest.json)');
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const representative = manifest.filter((entry) => entry.isRepresentativeRun);
if (representative.length === 0) {
  noData('в manifest.json нет представительных прогонов');
  process.exit(0);
}

const pages = [];
const findings = [];
let lighthouseVersion = '';

for (const entry of representative) {
  const lhr = JSON.parse(readFileSync(entry.jsonPath, 'utf8'));
  lighthouseVersion = lhr.lighthouseVersion;
  const path = new URL(lhr.finalDisplayedUrl ?? entry.url).pathname;

  if (lhr.runtimeError) {
    pages.push({ path, error: `${lhr.runtimeError.code}: ${lhr.runtimeError.message}` });
    continue;
  }

  const metrics = {};
  for (const id of METRICS) {
    const audit = lhr.audits[id];
    if (!audit) continue;
    metrics[id] = { score: audit.score, value: audit.displayValue };
  }
  pages.push({ path, performance_score: lhr.categories.performance?.score ?? null, metrics });

  const opportunities = Object.values(lhr.audits)
    .filter(
      (audit) =>
        audit.details?.type === 'opportunity' &&
        (audit.details.overallSavingsMs ?? 0) >= MIN_SAVINGS_MS,
    )
    .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
    .slice(0, 3)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      savings_ms: Math.round(audit.details.overallSavingsMs),
    }));

  for (const id of METRICS) {
    const audit = lhr.audits[id];
    if (!audit || audit.score === null || audit.score >= POOR_SCORE) continue;
    findings.push({
      // Ключ находки для поиска дублей: одна метрика на одной странице — одна задача.
      key: `audit:${id}@${path}`,
      audit: id,
      title: audit.title,
      path,
      value: audit.displayValue,
      score: audit.score,
      threshold: `score < ${POOR_SCORE}`,
      opportunities,
    });
  }
}

write({
  ...base,
  status: 'ok',
  lighthouse_version: lighthouseVersion,
  preset: 'mobile (по умолчанию Lighthouse)',
  pages,
  findings,
});
