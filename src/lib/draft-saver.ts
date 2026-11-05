/**
 * Client-side draft save controller.
 *
 * Guarantees:
 * - At most one save request is in flight; later edits are sent after it finishes (no reordering).
 * - Every save carries the revision it was based on; the server rejects outdated ones.
 * - Text is marked saved only when that exact text was acknowledged by the server.
 * - A conflict (the essay changed elsewhere) stops saving until the student chooses what to keep;
 *   nothing is overwritten automatically.
 * - Transient failures (network, 429, 5xx) retry with backoff; the text stays in the editor.
 */

export type SaveSendResult =
  | { ok: true; revision: number; savedAt: string }
  | { ok: false; status: number; code: string; details?: Record<string, string | number> };

export type SaveStatus =
  | { state: "saved"; savedAt: Date | null }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "error"; code: string; retrying: boolean }
  | { state: "conflict"; serverRevision: number };

type Options = {
  initialText: string;
  initialRevision: number;
  send: (content: string, baseRevision: number) => Promise<SaveSendResult>;
  onStatus: (status: SaveStatus) => void;
  debounceMs?: number;
  retryDelaysMs?: number[];
};

export class DraftSaver {
  private saved: string;
  private current: string;
  private revision: number;
  private savedAt: Date | null = null;
  private conflictRevision: number | null = null;
  private chain: Promise<boolean> = Promise.resolve(true);
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private disposed = false;
  private readonly opts: Required<Options>;

  constructor(options: Options) {
    this.opts = { debounceMs: 1200, retryDelaysMs: [2000, 5000, 15000, 30000], ...options };
    this.saved = options.initialText;
    this.current = options.initialText;
    this.revision = options.initialRevision;
  }

  /** The editor text changed. */
  update(text: string) {
    this.current = text;
    if (this.conflictRevision !== null) return;
    if (!this.isDirty()) {
      this.clearDebounce();
      this.opts.onStatus({ state: "saved", savedAt: this.savedAt });
      return;
    }
    this.opts.onStatus({ state: "dirty" });
    this.clearDebounce();
    this.debounce = setTimeout(() => void this.flush(), this.opts.debounceMs);
  }

  isDirty() {
    return this.current !== this.saved;
  }

  hasConflict() {
    return this.conflictRevision !== null;
  }

  /** The last text the server confirmed. */
  get savedText() {
    return this.saved;
  }

  /**
   * Save now and resolve once the latest text is stored (true) or saving stopped because of an
   * error or conflict (false). Concurrent calls queue behind each other.
   */
  flush(): Promise<boolean> {
    this.clearDebounce();
    this.clearRetry();
    this.chain = this.chain.then(() => this.drain());
    return this.chain;
  }

  /** Keep the text in this editor and save it over the newer server copy. */
  overwriteServer(): Promise<boolean> {
    if (this.conflictRevision !== null) this.revision = this.conflictRevision;
    this.conflictRevision = null;
    return this.flush();
  }

  /** Replace the editor text with the server copy (the caller updates the editor). */
  acceptServer(text: string, revision: number) {
    this.clearDebounce();
    this.clearRetry();
    this.conflictRevision = null;
    this.saved = text;
    this.current = text;
    this.revision = revision;
    this.savedAt = new Date();
    this.opts.onStatus({ state: "saved", savedAt: this.savedAt });
  }

  dispose() {
    this.disposed = true;
    this.clearDebounce();
    this.clearRetry();
  }

  private async drain(): Promise<boolean> {
    while (this.current !== this.saved) {
      if (this.conflictRevision !== null || this.disposed) return false;
      const content = this.current;
      this.opts.onStatus({ state: "saving" });
      let res: SaveSendResult;
      try {
        res = await this.opts.send(content, this.revision);
      } catch {
        res = { ok: false, status: 0, code: "network" };
      }
      if (res.ok) {
        this.saved = content;
        this.revision = res.revision;
        this.savedAt = new Date(res.savedAt);
        this.attempt = 0;
        continue;
      }
      if (res.code === "draft_conflict") {
        this.conflictRevision = Number(res.details?.revision ?? this.revision);
        this.opts.onStatus({ state: "conflict", serverRevision: this.conflictRevision });
        return false;
      }
      const retryable = res.status === 0 || res.status === 429 || res.status >= 500;
      const delay = this.opts.retryDelaysMs[Math.min(this.attempt, this.opts.retryDelaysMs.length - 1)];
      this.attempt += 1;
      if (retryable && !this.disposed) this.retry = setTimeout(() => void this.flush(), delay);
      this.opts.onStatus({ state: "error", code: res.code, retrying: retryable });
      return false;
    }
    this.opts.onStatus({ state: "saved", savedAt: this.savedAt });
    return true;
  }

  private clearDebounce() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = null;
  }

  private clearRetry() {
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
  }
}
