import { SessionStatus } from './model';
import { TranscriptSignals } from './transcript';

export interface Thresholds {
  workingSeconds: number;
  idleMinutes: number;
}

/**
 * Deriva el estado de una sesión a partir de sus señales + antigüedad del transcript.
 *
 * Reglas (validadas contra transcripts reales, entrypoint claude-vscode):
 *  - mtime fresca (< workingSeconds)                -> WORKING (apéndice activo)
 *  - último assistant con tool_use pendiente         -> WAITING_PERMISSION (trabado mid-tool)
 *  - último assistant que termina en pregunta        -> WAITING_INPUT (te necesita)
 *  - último assistant que terminó sin pregunta       -> IDLE (terminó / ocioso)
 *  - último mensaje 'user' reciente                  -> WORKING (turno del modelo)
 *  - cualquier cosa muy vieja                        -> IDLE
 *
 * Nota: 'end_turn' es idéntico para "espera input" y "terminó"; los distinguimos
 * con la heurística de pregunta final (lastAssistantIsQuestion).
 */
export function deriveStatus(sig: TranscriptSignals, ageMs: number, th: Thresholds): SessionStatus {
  const workingMs = Math.max(1, th.workingSeconds) * 1000;
  const idleMs = Math.max(1, th.idleMinutes) * 60 * 1000;

  if (ageMs < workingMs) {
    return 'working';
  }

  if (sig.lastKind === 'assistant') {
    if (sig.lastAssistantPendingTool && sig.lastStopReason === 'tool_use') {
      return 'waiting_permission';
    }
    return sig.lastAssistantIsQuestion ? 'waiting_input' : 'idle';
  }

  if (sig.lastKind === 'user') {
    return ageMs < idleMs ? 'working' : 'idle';
  }

  return 'idle';
}
