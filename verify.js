// Harness de verificación: corre el core (scanner -> transcript -> stateEngine)
// contra los transcripts reales de ~/.claude/projects, sin VS Code.
const { scanSessions } = require('./dist/scanner');

const states = scanSessions({
  thresholds: { workingSeconds: 5, idleMinutes: 3 },
  recencyHours: 24,
  nowMs: Date.now(),
  showClosed: false,
});

console.log('Sesiones detectadas (últimas 24h):', states.length);
console.log('-'.repeat(78));
for (const s of states) {
  const age = Math.round(s.ageMs / 1000);
  const ageStr = age < 60 ? age + 's' : Math.round(age / 60) + 'm';
  console.log(`[${s.status.padEnd(19)}] ${String(s.entrypoint || '?').padEnd(14)} ${String(s.project).padEnd(22)} ${ageStr.padStart(5)}  ${String(s.title).slice(0, 50)}`);
}
