import * as vscode from 'vscode';
import { scanSessions } from './scanner';
import { SessionState, SessionStatus } from './model';
import { SessionsViewProvider, ViewConfig } from './sessionsView';
import { projectsDir } from './paths';
import { openWorkspaceFolders } from './liveness';

const prevStatus = new Map<string, SessionStatus>();
const RECENCY_HOURS = 24;

export function activate(context: vscode.ExtensionContext): void {
  const provider = new SessionsViewProvider(context.extensionUri, openSession);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SessionsViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = 'claudeSessionTracker.focusView';
  context.subscriptions.push(status);

  function refresh(): void {
    const cfg = readConfig();
    void vscode.commands.executeCommand('setContext', 'claudeSessionTracker.idleHidden', cfg.view.hideIdle);
    void vscode.commands.executeCommand('setContext', 'claudeSessionTracker.soundMuted', !cfg.view.soundEnabled);
    void vscode.commands.executeCommand('setContext', 'claudeSessionTracker.purrOn', cfg.view.purrMode);
    const sessions = scanSessions({
      thresholds: cfg.thresholds,
      recencyHours: RECENCY_HOURS,
      nowMs: Date.now(),
      showClosed: cfg.showClosed,
    });
    const localFolders = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);
    for (const s of sessions) s.local = !s.cwd || localFolders.some((f) => samePath(f, s.cwd));
    provider.post(sessions, cfg.view);
    updateStatusBar(status, sessions);
    detectTransitions(sessions, cfg.view, provider);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeSessionTracker.refresh', refresh),
    vscode.commands.registerCommand('claudeSessionTracker.focusView', () =>
      vscode.commands.executeCommand('claudeSessionTracker.sessions.focus'),
    ),
    vscode.commands.registerCommand('claudeSessionTracker.openSession', (id?: string, cwd?: string) => {
      if (id) openSession(id, cwd || '');
    }),
    vscode.commands.registerCommand('claudeSessionTracker.hideIdle', () => setBool('hideIdle', true, 'claudeSessionTracker.idleHidden', true)),
    vscode.commands.registerCommand('claudeSessionTracker.showIdle', () => setBool('hideIdle', false, 'claudeSessionTracker.idleHidden', false)),
    vscode.commands.registerCommand('claudeSessionTracker.muteSound', () => setBool('soundEnabled', false, 'claudeSessionTracker.soundMuted', true)),
    vscode.commands.registerCommand('claudeSessionTracker.unmuteSound', () => setBool('soundEnabled', true, 'claudeSessionTracker.soundMuted', false)),
    vscode.commands.registerCommand('claudeSessionTracker.purrOff', () => setBool('purrMode', false, 'claudeSessionTracker.purrOn', false)),
    vscode.commands.registerCommand('claudeSessionTracker.purrOn', () => setBool('purrMode', true, 'claudeSessionTracker.purrOn', true)),
  );

  // Vigila los transcripts (cambios → refresco con debounce).
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(projectsDir()), '**/*.jsonl'),
  );
  const debounced = debounce(refresh, 300);
  watcher.onDidChange(debounced);
  watcher.onDidCreate(debounced);
  watcher.onDidDelete(debounced);
  context.subscriptions.push(watcher);

  // Timer para transiciones por tiempo (working → waiting/idle por antigüedad de mtime).
  const timer = setInterval(refresh, 2000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('claudeSessionTracker')) refresh();
    }),
  );

  refresh();
}

export function deactivate(): void {
  /* nada que limpiar fuera de subscriptions */
}

function readConfig(): {
  view: ViewConfig;
  thresholds: { workingSeconds: number; idleMinutes: number };
  showClosed: boolean;
} {
  const c = vscode.workspace.getConfiguration('claudeSessionTracker');
  return {
    showClosed: c.get('showClosed', false),
    view: {
      layout: c.get('layout', 'cards'),
      density: c.get('density', 'comfortable'),
      purrMode: c.get('purrMode', true),
      vibration: c.get('vibration', 'subtle'),
      hideIdle: c.get('hideIdle', false),
      soundEnabled: c.get('soundEnabled', true),
      sounds: {
        waitingInput: c.get('sound.waitingInput', 'knock'),
        waitingPermission: c.get('sound.waitingPermission', 'glass'),
        done: c.get('sound.done', 'tada'),
        onlyWhenUnfocused: c.get('sound.onlyWhenUnfocused', false),
      },
    },
    thresholds: {
      workingSeconds: c.get('thresholds.workingSeconds', 5),
      idleMinutes: c.get('thresholds.idleMinutes', 3),
    },
  };
}

function updateStatusBar(status: vscode.StatusBarItem, sessions: SessionState[]): void {
  const waiting = sessions.filter(
    (s) => s.status === 'waiting_input' || s.status === 'waiting_permission',
  ).length;
  if (waiting > 0) {
    status.text = `$(bell) ${waiting}`;
    status.tooltip = `${waiting} sesión(es) de Claude esperan tu atención`;
    status.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    status.text = `$(check) Claude`;
    status.tooltip = 'Ninguna sesión de Claude espera input';
    status.backgroundColor = undefined;
  }
  status.show();
}

/** Detecta transiciones de estado y pide al webview reproducir el sonido correspondiente. */
function detectTransitions(sessions: SessionState[], view: ViewConfig, provider: SessionsViewProvider): void {
  const focused = vscode.window.state.focused;
  const muteBecauseFocused = view.sounds.onlyWhenUnfocused && focused;

  for (const s of sessions) {
    const prev = prevStatus.get(s.id);
    if (prev && prev !== s.status && !muteBecauseFocused) {
      const snd = (name: string) => (view.soundEnabled ? name : 'off'); // mute => sigue vibrando, sin sonido
      if (s.status === 'waiting_input' && prev === 'working') provider.alert(snd(view.sounds.waitingInput), 'input', s.id);
      else if (s.status === 'waiting_permission' && prev === 'working') provider.alert(snd(view.sounds.waitingPermission), 'perm', s.id);
      else if (s.status === 'idle' && prev === 'working') provider.alert(snd(view.sounds.done), 'done', s.id);
    }
    prevStatus.set(s.id, s.status);
  }
  for (const id of [...prevStatus.keys()]) {
    if (!sessions.find((s) => s.id === id)) prevStatus.delete(id);
  }
}

/** Actualiza un setting booleano + su context key (para el ícono toggle). El refresh lo dispara el listener de config. */
function setBool(configKey: string, value: boolean, ctxKey: string, ctxValue: boolean): void {
  void vscode.commands.executeCommand('setContext', ctxKey, ctxValue);
  void vscode.workspace
    .getConfiguration('claudeSessionTracker')
    .update(configKey, value, vscode.ConfigurationTarget.Global);
}

function samePath(a: string, b: string): boolean {
  if (!a || !b) return false;
  const norm = (p: string) => p.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Salta a la conversación nativa. Si la sesión es de ESTA ventana, el URI handler la abre.
 * Si es de OTRA ventana, el URI abriría un chat vacío aquí — así que en su lugar informamos
 * (y ofrecemos abrir la carpeta), sin tocar la ventana actual.
 */
function openSession(id: string, cwd: string): void {
  const uri = vscode.Uri.parse(`vscode://anthropic.claude-code/open?session=${encodeURIComponent(id)}`);
  const localFolders = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);
  const isLocal = !cwd || localFolders.some((f) => samePath(f, cwd));

  if (isLocal) {
    void vscode.env.openExternal(uri);
    return;
  }

  const project = cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || cwd;
  const hasWindow = openWorkspaceFolders().some((f) => samePath(f, cwd));
  if (hasWindow) {
    void vscode.window.showInformationMessage(
      `"${project}" está abierta en otra ventana de VS Code. Cámbiate a esa ventana y abre la conversación en su panel de Claude (el salto directo a una conversación de otra ventana aún no lo permite la API de Claude Code).`,
    );
  } else {
    void vscode.window
      .showInformationMessage(
        `Esta conversación es de la carpeta "${project}", que no tiene una ventana de VS Code abierta.`,
        'Abrir carpeta en nueva ventana',
      )
      .then((sel) => {
        if (sel) void vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(cwd), { forceNewWindow: true });
      });
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...args: any[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}
