# Claude Session Tracker

Un radiador para tus sesiones de **Claude Code for VS Code**: ve de un vistazo cuáles están
trabajando, cuáles **esperan tu input** y cuáles terminaron — sin saltar entre tabs y ventanas —
y recibe un aviso (sonido + vibración de la tarjeta + badge en la status bar) cuando alguna te necesita.

> Llena un hueco abierto del ecosistema (avisos de "Claude terminó / necesita input" en la extensión
> de VS Code, ver issues [#29928](https://github.com/anthropics/claude-code/issues/29928) y
> [#43031](https://github.com/anthropics/claude-code/issues/43031)).

## Cómo funciona

No depende de hooks (que no disparan fiable en la extensión de VS Code). En su lugar **vigila los
transcripts JSONL** que Claude Code escribe en `~/.claude/projects/**/*.jsonl` y deriva el estado de
cada sesión:

| Estado | Señal | 🐱 Purr mode |
|---|---|---|
| 🟢 Trabajando | el transcript se actualizó hace < N s | gato con lentes tras un laptop |
| 🟠 Espera tu input | último mensaje del asistente termina en pregunta | gato jugando con un ovillo |
| ⏸ Posible permiso | `tool_use` pendiente sin resultado | gato con "?" |
| ⚪ Ociosa / lista | terminó sin pregunta | gato durmiendo de lado |

La detección es por archivo + heurística de tiempo; los umbrales son configurables.

## Características

- **Panel lateral** consolidado (tarjetas / lista / kanban), sigue el tema activo de VS Code.
- **Purr mode**: un gato pixel-art animado por sesión, de color distinto, con pose según el estado.
- **Alertas** configurables por evento (sonido distinto para espera / permiso / éxito) + vibración de la tarjeta.
- **Badge en la status bar** con el número de sesiones que esperan tu atención (visible en cada ventana).
- **Clic** en una sesión → salta a esa conversación (`vscode://anthropic.claude-code/open?session=…`).
- **Cero configuración** para empezar; no modifica tu `settings.json` ni instala hooks.

## Configuración

Ver `claudeSessionTracker.*` en Settings: `layout`, `density`, `purrMode`, `vibration`,
`sound.waitingInput|waitingPermission|done`, `sound.onlyWhenUnfocused`,
`thresholds.workingSeconds|idleMinutes`, `showClosed`.

## Desarrollo

```bash
npm install
npm run build      # esbuild → dist/extension.js
# F5 en VS Code para lanzar el Extension Development Host
npm run package    # genera el .vsix
```

## Limitaciones conocidas

- "Éxito vs error" y "espera input vs terminó" se distinguen por heurística (pregunta final); no es exacto.
- El sonido en el webview puede requerir una interacción previa con el panel (política de autoplay).
- No inyecta input ni aprueba permisos remoto (no hay API para eso en la extensión de VS Code).

MIT © 2026 Jaime Jiménez
