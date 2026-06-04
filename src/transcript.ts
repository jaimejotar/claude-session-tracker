import * as fs from 'fs';
import * as path from 'path';

/** Solo leemos la cola del JSONL: el estado vive en los últimos registros. */
const TAIL_BYTES = 64 * 1024;

/** Tipos de registro que NO son mensajes reales (metadata / attachments). */
const META_TYPES = new Set([
  'ai-title', 'last-prompt', 'mode', 'file-history-snapshot',
  'queue-operation', 'summary', 'attachment',
]);

/** Señales crudas extraídas del transcript, suficientes para derivar el estado. */
export interface TranscriptSignals {
  sessionId: string;
  cwd: string;
  title: string;
  entrypoint: string;
  /** Tipo del último mensaje real (no metadata, no sidechain). */
  lastKind: 'assistant' | 'user' | 'unknown';
  /** message.stop_reason del último assistant ('end_turn' | 'tool_use' | ...). */
  lastStopReason: string | null;
  /** El último bloque del último assistant es un tool_use sin tool_result posterior. */
  lastAssistantPendingTool: boolean;
  /** El texto final del último assistant termina en pregunta (heurística espera-input vs terminó). */
  lastAssistantIsQuestion: boolean;
}

/** Lee los últimos TAIL_BYTES del archivo y devuelve líneas completas. */
export function readTail(file: string): string[] {
  const stat = fs.statSync(file);
  const start = Math.max(0, stat.size - TAIL_BYTES);
  const fd = fs.openSync(file, 'r');
  try {
    const len = stat.size - start;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, start);
    let text = buf.toString('utf8');
    if (start > 0) {
      const nl = text.indexOf('\n'); // descarta la primera línea (probablemente parcial)
      if (nl >= 0) text = text.slice(nl + 1);
    }
    return text.split('\n').filter((l) => l.trim().length > 0);
  } finally {
    fs.closeSync(fd);
  }
}

function tryParse(line: string): any | null {
  try { return JSON.parse(line); } catch { return null; }
}

function humanizeSlug(slug: string): string {
  const s = slug.replace(/-/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Sesión';
}

/** ¿El texto termina en pregunta? Retrocede saltando espacios/emoji/markdown hasta el primer caracter relevante. */
function endsWithQuestion(text: string): boolean {
  if (!text) return false;
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '?' || ch === '？') return true; // ? o ？
    if (/[\p{L}\p{N}]/u.test(ch)) return false;      // letra/dígito antes de un '?' => no es pregunta
  }
  return false;
}

/** Extrae señales del transcript leyendo solo la cola. Devuelve null si no hay datos. */
export function extractSignals(file: string): TranscriptSignals | null {
  let lines: string[];
  try { lines = readTail(file); } catch { return null; }
  const records = lines.map(tryParse).filter(Boolean) as any[];
  if (!records.length) return null;

  // Metadata útil (se busca en toda la cola; el último valor gana).
  let title = '', cwd = '', sessionId = '', entrypoint = '', lastPrompt = '', slug = '';
  for (const r of records) {
    if (r.sessionId) sessionId = r.sessionId;
    if (r.cwd) cwd = r.cwd;
    if (r.entrypoint) entrypoint = r.entrypoint;
    if (r.slug) slug = r.slug;
    if (r.type === 'ai-title' && r.aiTitle) title = r.aiTitle;
    if (r.type === 'last-prompt' && r.lastPrompt) lastPrompt = r.lastPrompt;
  }
  if (!title) title = slug ? humanizeSlug(slug) : (lastPrompt || 'Sesión');
  title = title.replace(/\s+/g, ' ').trim().slice(0, 80);

  // Último mensaje real del hilo principal (saltando metadata, attachments y sidechains).
  let lastKind: 'assistant' | 'user' | 'unknown' = 'unknown';
  let lastStopReason: string | null = null;
  let lastAssistantPendingTool = false;
  let lastAssistantIsQuestion = false;
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.isSidechain) continue;
    if (META_TYPES.has(r.type)) continue;
    if (r.type === 'assistant' && r.message) {
      lastKind = 'assistant';
      lastStopReason = r.message.stop_reason ?? null;
      const content = Array.isArray(r.message.content) ? r.message.content : [];
      const blocks = content.filter((c: any) => c.type === 'tool_use' || c.type === 'text');
      const last = blocks[blocks.length - 1];
      lastAssistantPendingTool = !!last && last.type === 'tool_use';
      const text = content.filter((c: any) => c.type === 'text').map((c: any) => c.text || '').join(' ').trim();
      lastAssistantIsQuestion = endsWithQuestion(text);
      break;
    }
    if (r.type === 'user' && r.message) {
      lastKind = 'user';
      break;
    }
  }

  return {
    sessionId: sessionId || path.basename(file, '.jsonl'),
    cwd,
    title,
    entrypoint,
    lastKind,
    lastStopReason,
    lastAssistantPendingTool,
    lastAssistantIsQuestion,
  };
}
