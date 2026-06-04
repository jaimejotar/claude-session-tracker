import * as os from 'os';
import * as path from 'path';

/** Raíz de configuración de Claude Code (~/.claude). */
export function claudeHome(): string {
  return path.join(os.homedir(), '.claude');
}

/** Carpeta de transcripts por proyecto (~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl). */
export function projectsDir(): string {
  return path.join(claudeHome(), 'projects');
}

/** Registro de procesos de sesión (~/.claude/sessions/<pid>.json). */
export function sessionsDir(): string {
  return path.join(claudeHome(), 'sessions');
}

/** Locks de IDE conectados (~/.claude/ide/<pid>.lock). */
export function ideDir(): string {
  return path.join(claudeHome(), 'ide');
}
