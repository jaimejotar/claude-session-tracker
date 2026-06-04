import * as fs from 'fs';
import * as path from 'path';
import { projectsDir } from './paths';
import { extractSignals } from './transcript';
import { deriveStatus, Thresholds } from './stateEngine';
import { openSessionIds } from './liveness';
import { SessionState } from './model';

export interface ScanOptions {
  thresholds: Thresholds;
  recencyHours: number; // ventana de recencia para sesiones cerradas
  nowMs: number;
  showClosed: boolean;  // si false, solo muestra conversaciones abiertas (pid vivo)
}

function listTranscripts(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTranscripts(full));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/** Escanea ~/.claude/projects y devuelve el estado de las sesiones recientes (más nueva primero). */
export function scanSessions(opts: ScanOptions): SessionState[] {
  const files = listTranscripts(projectsDir());
  const recencyMs = opts.recencyHours * 3600 * 1000;
  const open = openSessionIds();
  const byId = new Map<string, SessionState>();

  for (const file of files) {
    let mtimeMs: number;
    try { mtimeMs = fs.statSync(file).mtimeMs; } catch { continue; }
    const ageMs = opts.nowMs - mtimeMs;

    const sig = extractSignals(file);
    if (!sig) continue;

    const isOpen = open.has(sig.sessionId);
    // Conversación abierta => siempre se muestra. Cerrada => solo si showClosed y es reciente.
    if (!isOpen && !(opts.showClosed && ageMs <= recencyMs)) continue;

    const state: SessionState = {
      id: sig.sessionId,
      project: sig.cwd ? path.basename(sig.cwd) : path.basename(path.dirname(file)),
      cwd: sig.cwd,
      title: sig.title,
      status: deriveStatus(sig, ageMs, opts.thresholds),
      lastActivityMs: mtimeMs,
      ageMs,
      entrypoint: sig.entrypoint,
      open: isOpen,
      transcriptPath: file,
    };

    const prev = byId.get(state.id);
    if (!prev || state.lastActivityMs > prev.lastActivityMs) byId.set(state.id, state);
  }

  return [...byId.values()].sort((a, b) => b.lastActivityMs - a.lastActivityMs);
}
