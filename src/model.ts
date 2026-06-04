export type SessionStatus = 'working' | 'waiting_input' | 'waiting_permission' | 'idle';

/** Estado normalizado de una sesión de Claude Code, derivado del transcript JSONL. */
export interface SessionState {
  id: string;             // sessionId (uuid)
  project: string;        // basename de cwd, para mostrar
  cwd: string;            // working dir de la sesión
  title: string;          // aiTitle / slug / último prompt
  status: SessionStatus;
  lastActivityMs: number; // mtime del transcript (epoch ms)
  ageMs: number;          // now - mtime, al momento del snapshot
  entrypoint: string;     // 'claude-vscode', 'cli', etc.
  open: boolean;          // proceso de la sesión vivo ahora (conversación abierta)
  local?: boolean;        // cwd pertenece a la ventana de VS Code actual (lo fija la extensión)
  transcriptPath: string;
}
