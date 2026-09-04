'use strict';

const fs = require('fs');

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: node scripts/check-audit-baseline.js <npm-audit.json>');
  process.exit(2);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`Unable to parse npm audit report: ${error.message}`);
  process.exit(2);
}

if (report.error) {
  console.error('npm audit returned an error instead of a vulnerability report.');
  process.exit(2);
}

const vulnerabilities = report.metadata && report.metadata.vulnerabilities;
if (!vulnerabilities || typeof vulnerabilities !== 'object') {
  console.error('npm audit report is missing metadata.vulnerabilities; refusing to pass the gate.');
  process.exit(2);
}

// Baseline captured in issue #84 on 2026-09-04. This is an explicit ceiling,
// not an assertion that the existing advisories are safe. The backlog remains
// open for reachability triage and upgrades; this gate prevents new HIGH or
// CRITICAL advisories from being added while that work proceeds.
const baseline = Object.freeze({
  critical: 5,
  high: 26,
});

const current = {
  critical: Number(vulnerabilities.critical || 0),
  high: Number(vulnerabilities.high || 0),
  moderate: Number(vulnerabilities.moderate || 0),
  low: Number(vulnerabilities.low || 0),
  total: Number(vulnerabilities.total || 0),
};

console.log('npm audit vulnerability summary:', current);
console.log('enforced high/critical ceiling:', baseline);

const regressions = [];
for (const severity of ['critical', 'high']) {
  if (current[severity] > baseline[severity]) {
    regressions.push(`${severity}: ${current[severity]} > ${baseline[severity]}`);
  }
}

if (regressions.length) {
  console.error(`Dependency security regression detected: ${regressions.join(', ')}`);
  process.exit(1);
}

console.log('No new HIGH or CRITICAL dependency advisories above the recorded baseline.');
