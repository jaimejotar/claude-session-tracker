import * as fs from 'fs';
import * as path from 'path';
import { sessionsDir, ideDir } from './paths';

/**
 * Lee ~/.claude/sessions/<pid>.json y devuelve el set de sessionId que están
 * ABIERTOS ahora (proceso vivo). Cada conversación interactiva registra su propio pid,
 * así que esto distingue las conversaciones reales de las sesiones automáticas/cerradas.
 */
export function openSessionIds(): Set<string> {
  const open = new Set<string>();
  let files: string[];
  try {
    files = fs.readdirSync(sessionsDir()).filter((f) => f.endsWith('.json'));
  } catch {
    return open;
  }
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(sessionsDir(), f), 'utf8'));
      if (j && typeof j.sessionId === 'string' && typeof j.pid === 'number' && isAlive(j.pid)) {
        open.add(j.sessionId);
      }
    } catch {
      /* ignora entradas corruptas */
    }
  }
  return open;
}

/**
 * Lee ~/.claude/ide/<pid>.lock y devuelve las carpetas (workspaceFolders) que tienen
 * una ventana de VS Code ABIERTA ahora (pid vivo). Sirve para decidir, en el salto a
 * una sesión de otra ventana, si esa ventana existe y se puede enfocar.
 */
export function openWorkspaceFolders(): string[] {
  const out = new Set<string>();
  let files: string[];
  try {
    files = fs.readdirSync(ideDir()).filter((f) => f.endsWith('.lock'));
  } catch {
    return [];
  }
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(ideDir(), f), 'utf8'));
      if (j && Array.isArray(j.workspaceFolders) && (typeof j.pid !== 'number' || isAlive(j.pid))) {
        for (const w of j.workspaceFolders) if (typeof w === 'string') out.add(w);
      }
    } catch {
      /* ignora locks corruptos */
    }
  }
  return [...out];
}

/** ¿El proceso pid sigue vivo? (señal 0 = test de existencia). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return !!e && e.code === 'EPERM'; // existe pero sin permiso => vivo
  }
}
