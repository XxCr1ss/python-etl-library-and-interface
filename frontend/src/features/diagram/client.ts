import { object, publicMessage } from "@/services/apiClient";
import { schemaGraph, tableSample } from "@/services/diagramApi";
import { channelName, envelope, parseMessage, parseOwnerState, PRESENCE_TTL, REQUEST_TIMEOUT, type Binding, type MessageType, type OwnerState } from "./protocol";

export interface ClientState { owner: OwnerState | null; connected: boolean; invalid: boolean; error: string; selection: { status: string; message: string } | null }
interface Pending { expected: MessageType; resolve: (value: unknown) => void; reject: (error: Error) => void; cleanup: () => void }
export class DiagramClient {
  private channel: BroadcastChannel;
  private instance = crypto.randomUUID();
  private pending = new Map<string, Pending>();
  private lastSeen = 0;
  private closed = false;
  private timer: ReturnType<typeof setInterval>;
  private selectionTimer?: ReturnType<typeof setTimeout>;
  private selectionRequest?: { id: string; tableId: string; revision: number; generation: number };
  state: ClientState = { owner: null, connected: false, invalid: false, error: "Vinculando con la pestaña ETL…", selection: null };
  constructor(private binding: Binding, private changed: (state: ClientState) => void, channel = (name: string) => new BroadcastChannel(name)) {
    this.channel = channel(channelName(binding));
    this.channel.onmessage = event => this.receive(event.data);
    this.send("DIAGRAM_READY");
    this.timer = setInterval(() => {
      if (this.state.invalid) return;
      if (Date.now() - this.lastSeen > PRESENCE_TTL) this.update({ connected: false, error: "La pestaña ETL no responde. Comprueba que siga abierta." });
      this.send(this.state.owner ? "STATE_PROBE" : "DIAGRAM_READY");
    }, 5000);
  }
  private update(patch: Partial<ClientState>) { this.state = { ...this.state, ...patch }; this.changed(this.state); }
  private send(type: MessageType, id?: string, data?: unknown) { this.channel.postMessage(envelope(this.binding, this.instance, type, id, data)); }
  private receive(input: unknown) {
    const message = parseMessage(input, this.binding);
    if (!message || message.diagramInstanceId !== this.instance || this.state.invalid) return;
    if (message.type === "OWNER_STATE") {
      const owner = parseOwnerState(message.data);
      if (!owner || owner.stateVersion < (this.state.owner?.stateVersion ?? -1)) return;
      this.lastSeen = Date.now(); this.update({ owner, connected: true, error: "" }); return;
    }
    if (message.type === "CONTEXT_INVALIDATED") {
      this.update({ invalid: true, connected: false, error: "La conexión cambió. Vuelve a abrir el diagrama desde la pestaña ETL." });
      for (const p of Array.from(this.pending.values())) { p.cleanup(); p.reject(new Error(this.state.error)); }
      this.pending.clear(); return;
    }
    if (message.type === "USE_TABLE_RESULT" && message.requestId === this.selectionRequest?.id && object(message.data)) {
      const { status, message: text } = message.data;
      if (!["pending_confirmation", "applied", "cancelled", "rejected"].includes(String(status)) || typeof text !== "string") return;
      clearTimeout(this.selectionTimer);
      this.update({ selection: { status: String(status), message: publicMessage(text, "Consulta el resultado en la pestaña ETL.") } });
      if (status !== "pending_confirmation") this.selectionRequest = undefined;
      return;
    }
    const pending = message.requestId ? this.pending.get(message.requestId) : undefined;
    if (!pending || pending.expected !== message.type || !object(message.data)) return;
    this.pending.delete(message.requestId!); pending.cleanup();
    if (typeof message.data.error === "string") pending.reject(new Error(publicMessage(message.data.error, "No se pudo consultar la base de datos.")));
    else pending.resolve(message.data.value);
  }
  private request(type: "SCHEMA_REQUEST" | "PREVIEW_REQUEST", data?: unknown, signal?: AbortSignal): Promise<unknown> {
    if (!this.state.connected || this.state.invalid || this.state.owner?.suspended) return Promise.reject(new Error(this.state.owner?.reason || "Vincula de nuevo el diagrama desde la pestaña ETL."));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const cancel = () => { this.send("CANCEL_REQUEST", id); this.pending.delete(id); cleanup(); reject(new Error("Solicitud cancelada.")); };
      const timer = setTimeout(() => { this.send("CANCEL_REQUEST", id); this.pending.delete(id); cleanup(); reject(new Error("La consulta agotó el tiempo de espera. Puedes reintentar.")); }, REQUEST_TIMEOUT);
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); };
      this.pending.set(id, { expected: type === "SCHEMA_REQUEST" ? "SCHEMA_RESULT" : "PREVIEW_RESULT", resolve, reject, cleanup });
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel(); else this.send(type, id, data);
    });
  }
  async graph(signal?: AbortSignal) { return schemaGraph(await this.request("SCHEMA_REQUEST", undefined, signal)); }
  async preview(tableId: string, signal?: AbortSignal) { return tableSample(await this.request("PREVIEW_REQUEST", { tableId }, signal)); }
  useTable(tableId: string) {
    if (!this.state.connected || this.state.owner?.route !== "/transform" || !this.state.owner.available || this.selectionRequest) return;
    this.selectionRequest = { id: crypto.randomUUID(), tableId, revision: this.state.owner.revision, generation: this.state.owner.generation ?? 0 };
    this.reconcile();
  }
  reconcile() {
    const request = this.selectionRequest;
    if (!request || !this.state.connected) return;
    this.send("USE_TABLE_REQUEST", request.id, { tableId: request.tableId, revision: request.revision, generation: request.generation });
    this.update({ selection: { status: "sending", message: "Solicitando selección en la pestaña ETL…" } });
    clearTimeout(this.selectionTimer);
    this.selectionTimer = setTimeout(() => this.update({ selection: { status: "uncertain", message: "Resultado sin confirmar. Consulta el estado antes de enviar otra selección." } }), REQUEST_TIMEOUT);
  }
  close(notify = false) {
    if (this.closed) return;
    if (notify) this.send("DIAGRAM_CLOSED");
    this.closed = true;
    clearInterval(this.timer); clearTimeout(this.selectionTimer);
    for (const p of Array.from(this.pending.values())) { p.cleanup(); p.reject(new Error("Diagrama cerrado.")); }
    this.pending.clear(); this.channel.close();
  }
  probe() { if (!this.closed && !this.state.invalid) this.send(this.state.owner ? "STATE_PROBE" : "DIAGRAM_READY"); }
}
