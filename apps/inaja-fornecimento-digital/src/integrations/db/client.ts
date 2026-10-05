/**
 * Cliente de banco local (SQLite: data/inaja.sqlite).
 * Superfície no estilo query builder (from / rpc / storage / channel),
 * todas as chamadas vão para POST /api/* no Node local.
 */

type DbError = { message: string; code?: string } | null;
type DbResult<T = unknown> = { data: T; error: DbError };

const API = "/api";

async function postJson<T = unknown>(url: string, body: unknown): Promise<DbResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) return { data: (json.data ?? null) as T, error: json.error };
    return { data: json.data as T, error: null };
  } catch {
    return {
      data: null as T,
      error: { message: "Sem conexão com o servidor. Verifique sua rede e tente novamente.", code: "NETWORK" },
    };
  }
}

type ChangeHandler = () => void;
const tableListeners = new Map<string, Set<ChangeHandler>>();

function emitTableChange(table: string) {
  const set = tableListeners.get(table);
  if (set) for (const fn of set) {
    try { fn(); } catch { /* ignore */ }
  }
}

function watchTable(table: string, fn: ChangeHandler) {
  if (!tableListeners.has(table)) tableListeners.set(table, new Set());
  tableListeners.get(table)!.add(fn);
  return () => tableListeners.get(table)?.delete(fn);
}

type Filter = { column: string; value: unknown };
type Order = { column: string; ascending?: boolean };

class QueryBuilder<T = Record<string, unknown>> implements PromiseLike<DbResult<T[]>> {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selectCols = "*";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitN?: number;
  private payload?: unknown;
  private payloads?: unknown[];
  private onConflict?: string;
  private ignoreDuplicates?: boolean;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = "*") {
    this.action = "select";
    this.selectCols = cols;
    return this;
  }

  insert(row: unknown | unknown[]) {
    this.action = "insert";
    if (Array.isArray(row)) this.payloads = row;
    else this.payload = row;
    return this;
  }

  update(row: unknown) {
    this.action = "update";
    this.payload = row;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(row: unknown | unknown[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.action = "upsert";
    if (Array.isArray(row)) this.payloads = row;
    else this.payload = row;
    this.onConflict = opts?.onConflict;
    this.ignoreDuplicates = opts?.ignoreDuplicates;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private async execute(): Promise<DbResult<T[]>> {
    const result = await postJson<T[]>(`${API}/query`, {
      table: this.table,
      action: this.action,
      select: this.selectCols,
      filters: this.filters,
      order: this.orders,
      limit: this.limitN,
      payload: this.payload,
      payloads: this.payloads,
      onConflict: this.onConflict,
      ignoreDuplicates: this.ignoreDuplicates,
    });
    if (!result.error && this.action !== "select") {
      emitTableChange(this.table);
    }
    return result;
  }

  then<TResult1 = DbResult<T[]>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class StorageBucket {
  constructor(private bucket: string) {}

  async upload(
    path: string,
    file: File | Blob,
    opts?: {
      contentType?: string;
      upsert?: boolean;
      module?: "solicitacoes" | "tarefas" | "pedido-dotacao" | "gestao-documentos";
    },
  ) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const contentBase64 = btoa(binary);
    return postJson(`${API}/storage/upload`, {
      bucket: this.bucket,
      path,
      contentBase64,
      contentType: opts?.contentType || (file as File).type || "application/octet-stream",
      upsert: opts?.upsert ?? false,
      module: opts?.module,
    });
  }

  async createSignedUrl(path: string, _expiresIn?: number) {
    const signedUrl = `${window.location.origin}/api/files/${encodeURIComponent(path).replace(/%2F/gi, "/")}`;
    return { data: { signedUrl }, error: null };
  }

  async remove(paths: string[]) {
    return postJson(`${API}/storage/remove`, { bucket: this.bucket, paths });
  }
}

class Channel {
  private unsubs: Array<() => void> = [];

  constructor(private name: string) {}

  on(
    _event: string,
    filter: { event?: string; schema?: string; table?: string } & Record<string, unknown>,
    callback: () => void,
  ) {
    if (filter?.table) {
      this.unsubs.push(watchTable(filter.table, callback));
    }
    return this;
  }

  subscribe() {
    return this;
  }

  unsubscribe() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}

const channels = new Map<string, Channel>();

export const isLocalDatabase = true;

export const db = {
  from<T = Record<string, unknown>>(table: string) {
    return new QueryBuilder<T>(table);
  },

  async rpc(fn: string, args?: Record<string, unknown>) {
    return postJson(`${API}/rpc`, { fn, args: args || {} });
  },

  channel(name: string) {
    const ch = new Channel(name);
    channels.set(name, ch);
    return ch;
  },

  removeChannel(ch: Channel | string) {
    if (typeof ch === "string") {
      channels.get(ch)?.unsubscribe();
      channels.delete(ch);
    } else {
      ch.unsubscribe();
    }
  },

  storage: {
    from(bucket: string) {
      return new StorageBucket(bucket);
    },
  },
};

export type LocalClient = typeof db;
