import * as vscode from 'vscode';
import { SessionState } from './model';

export interface ViewConfig {
  layout: string;
  density: string;
  purrMode: boolean;
  vibration: string;
  hideIdle: boolean;
  soundEnabled: boolean;
  sounds: {
    waitingInput: string;
    waitingPermission: string;
    done: string;
    onlyWhenUnfocused: boolean;
  };
}

/** Provee el webview de la barra lateral y traduce mensajes ↔ extensión. */
export class SessionsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeSessionTracker.sessions';
  private view?: vscode.WebviewView;
  private last: { sessions: SessionState[]; config: ViewConfig } | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onOpen: (id: string, cwd: string) => void,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = this.html(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((msg) => {
      if (!msg) return;
      if (msg.type === 'ready' && this.last) {
        this.post(this.last.sessions, this.last.config);
      } else if (msg.type === 'open' && msg.id) {
        this.onOpen(msg.id, msg.cwd || '');
      }
    });
  }

  post(sessions: SessionState[], config: ViewConfig): void {
    this.last = { sessions, config };
    this.view?.webview.postMessage({ type: 'update', sessions, config });
  }

  /** Pide al webview reproducir un sonido + animar la tarjeta que transicionó. */
  alert(sound: string, accent: 'input' | 'perm' | 'done', sessionId: string): void {
    this.view?.webview.postMessage({ type: 'alert', sound, accent, sessionId });
  }

  private html(webview: vscode.Webview): string {
    const uri = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', f));
    const nonce = makeNonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${uri('main.css')}" rel="stylesheet">
  <title>Claude Sessions</title>
</head>
<body>
  <div id="app"><div class="empty">Buscando sesiones de Claude…</div></div>
  <script nonce="${nonce}" src="${uri('main.js')}"></script>
</body>
</html>`;
  }
}

function makeNonce(): string {
  let s = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 24; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
