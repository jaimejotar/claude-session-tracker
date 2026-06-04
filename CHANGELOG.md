# Changelog

## [0.1.4] - 2026-06-04
- Nuevo: ícono de la extensión (gato pixel-art 128×128) para el Marketplace y la vista de Extensiones.
- Cambio: publisher `jaimejotar`.

## [0.1.3] - 2026-06-04
- Nuevo: botones rápidos en la cabecera del panel para activar/desactivar el sonido y el Purr mode (íconos según estado). Setting nuevo `soundEnabled`. Silenciar mantiene la vibración de la tarjeta.

## [0.1.2] - 2026-06-04
- Nuevo: las sesiones que viven en OTRA ventana de VS Code se marcan con "⧉ otra ventana" en la tarjeta, para distinguirlas de un vistazo antes de hacer clic. (El salto directo entre ventanas sigue sin ser posible por límite de la API de Claude Code; al hacer clic se informa.)

## [0.1.1] - 2026-06-04
- Fix: el sonido de alerta no sonaba por la política de autoplay del webview — se desbloquea el AudioContext con el primer clic/tecla en el panel.
- Cambio: `sound.onlyWhenUnfocused` ahora es `false` por defecto (suena siempre; actívalo si prefieres solo con VS Code en segundo plano).
- Nuevo: botón 👁 en la cabecera del panel + setting `hideIdle` para ocultar/mostrar las sesiones ociosas/listas.
- Fix: salto a sesiones de OTRA ventana de VS Code ya no abre un chat vacío — detecta el caso (vía cwd + locks de IDE) e informa / ofrece abrir la carpeta, sin tocar la ventana actual.

## [0.1.0] - 2026-06-03
- Primera versión: panel lateral que consolida las sesiones de Claude Code leyendo los transcripts JSONL.
- Estados: trabajando / espera input / posible permiso / ociosa-lista (detección sin hooks).
- Purr mode: gato pixel-art animado por sesión, con pose según el estado.
- Alertas por evento (sonido + vibración) y badge en la status bar.
- Salto a la conversación nativa vía URI handler.
