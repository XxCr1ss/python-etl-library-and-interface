import type { SchemaGraph } from "@/types/diagram";
import type { SourceConnectionDto } from "@/types/etl";
import { getSchemaGraph, getTableSample } from "@/services/diagramApi";
import { channelName, envelope, parseMessage, PRESENCE_TTL, type Binding, type OwnerState, type WireMessage } from "./protocol";
import { sameConnection } from "./connectionIdentity";

export interface OwnerContext extends Omit<OwnerState, "stateVersion"> { stamp: string; sourceMatches: (connection: SourceConnectionDto, table: string) => boolean }
export interface Selection { pairingId: string; requestId: string; table: string; revision: number; stamp: string }
interface Link { binding: Binding; channel: BroadcastChannel; connection: SourceConnectionDto; instance: string; seen: number; generation: number; suspended: string; graph?: SchemaGraph; requests: Map<string, AbortController>; results: Map<string, unknown> }
export class DiagramOwner {
  private links = new Map<string, Link>();
  private ownerTabId = crypto.randomUUID();
  private version = 0;
  private stateVersion = 0;
  private pending: Selection | null = null;
  constructor(private context: () => OwnerContext, private confirm: (connection: SourceConnectionDto, table: string) => boolean,
    private selection: (pending: Selection | null) => void, private channel = (name: string) => new BroadcastChannel(name)) {}
  open(connection: SourceConnectionDto) {
    const binding: Binding = { pairingId: crypto.randomUUID(), ownerTabId: this.ownerTabId, connectionVersion: ++this.version };
    const channel = this.channel(channelName(binding));
    const link: Link = { binding, channel, connection: { ...connection }, instance: "", seen: Date.now(), generation: 0, suspended: "", requests: new Map(), results: new Map() };
    this.links.set(binding.pairingId, link);
    channel.onmessage = event => { void this.receive(link, event.data); };
    return "/extract/diagram#" + encodeURIComponent(JSON.stringify(binding));
  }
  private send(link: Link, type: WireMessage["type"], requestId?: string, data?: unknown) {
    if (link.instance) link.channel.postMessage(envelope(link.binding, link.instance, type, requestId, data));
  }
  private state(link: Link) {
    const context = this.context();
    this.send(link, "OWNER_STATE", undefined, { route: context.route, revision: context.revision, available: context.available && !this.pending && !link.suspended,
      reason: link.suspended || (this.pending ? "Hay una selección pendiente de confirmación en la pestaña ETL." : context.reason),
      generation: link.generation, suspended: !!link.suspended, stateVersion: ++this.stateVersion });
  }
  publish() {
    if (this.pending && this.context().stamp !== this.pending.stamp) this.finish(this.pending, "cancelled", "La sesión cambió. Vuelve a seleccionar la tabla.");
    for (const link of Array.from(this.links.values())) this.state(link);
  }
  private result(link: Link, id: string, data: unknown) { link.results.set(id, data); this.send(link, "USE_TABLE_RESULT", id, data); }
  private reason(link: Link, revision: number) {
    const c = this.context();
    if (link.suspended) return link.suspended;
    if (c.route !== "/transform") return "Abre Transformación en la pestaña ETL para usar esta tabla.";
    if (!c.available) return c.reason;
    if (c.revision !== revision) return "La sesión cambió. Actualiza el estado y vuelve a seleccionar.";
    if (!link.instance || !this.links.has(link.binding.pairingId)) return "La conexión del diagrama ya no está disponible.";
    return "";
  }
  private async receive(link: Link, input: unknown) {
    const message = parseMessage(input, link.binding);
    if (!message) return;
    if (message.type === "DIAGRAM_READY") {
      if (link.instance && link.instance !== message.diagramInstanceId) {
        this.send(link, "CONTEXT_INVALIDATED", undefined, { error: "El diagrama se abrió en otra instancia. Vuelve a abrirlo desde Extracción." });
        for (const controller of Array.from(link.requests.values())) controller.abort();
        link.requests.clear();
        if (this.pending?.pairingId === link.binding.pairingId) this.finish(this.pending, "cancelled", "Cambió la instancia del diagrama.");
      }
      link.instance = message.diagramInstanceId;
      link.seen = Date.now(); this.state(link); return;
    }
    if (message.diagramInstanceId !== link.instance) return;
    link.seen = Date.now();
    const id = message.requestId!;
    if (message.type === "STATE_PROBE") { this.state(link); return; }
    if (message.type === "DIAGRAM_CLOSED") { this.close(link); return; }
    if (message.type === "CANCEL_REQUEST") { link.requests.get(id)?.abort(); link.requests.delete(id); return; }
    if (message.type === "USE_TABLE_REQUEST") {
      if (link.results.has(id)) { this.send(link, "USE_TABLE_RESULT", id, link.results.get(id)); return; }
      const data = message.data as { tableId: string; revision: number; generation?: number };
      const table = link.graph?.nodes.find(n => n.id === data.tableId && n.selectable);
      const error = data.generation !== undefined && data.generation !== link.generation ? "El esquema cambió. Vuelve a seleccionar la tabla." : this.reason(link, data.revision);
      if (!table || error || this.pending) { this.result(link, id, { status: "rejected", message: error || "Tabla no disponible o selección pendiente." }); return; }
      if (this.context().sourceMatches(link.connection, table.table_name)) { this.result(link, id, { status: "applied", message: "Esta tabla ya es el origen activo.", revision: data.revision }); return; }
      this.pending = { pairingId: link.binding.pairingId, requestId: id, table: table.table_name, revision: data.revision, stamp: this.context().stamp };
      this.result(link, id, { status: "pending_confirmation", message: "Confirma la selección en la pestaña ETL." });
      this.selection(this.pending); this.publish(); return;
    }
    if (!["SCHEMA_REQUEST", "PREVIEW_REQUEST"].includes(message.type) || link.requests.has(id)) return;
    const abort = new AbortController(); link.requests.set(id, abort);
    const type = message.type === "SCHEMA_REQUEST" ? "SCHEMA_RESULT" : "PREVIEW_RESULT";
    const generation = link.generation;
    try {
      if (link.suspended) throw new Error(link.suspended);
      let data: unknown;
      if (message.type === "SCHEMA_REQUEST") {
        data = await getSchemaGraph(link.connection, abort.signal);
        if (!abort.signal.aborted && generation === link.generation) link.graph = data as SchemaGraph;
      } else {
        const table = link.graph?.nodes.find(n => n.id === (message.data as { tableId: string }).tableId && n.selectable);
        if (!table) throw new Error("La tabla no está disponible en el esquema actual.");
        data = await getTableSample(link.connection, table.table_name, abort.signal);
      }
      if (!abort.signal.aborted && generation === link.generation && this.links.has(link.binding.pairingId)) this.send(link, type, id, { value: data });
    } catch (error) {
      if (!abort.signal.aborted) this.send(link, type, id, { error: error instanceof Error ? error.message : "No se pudo consultar la base de datos." });
    } finally { if (link.requests.get(id) === abort) link.requests.delete(id); }
  }
  resolve(accepted: boolean) {
    const pending = this.pending;
    if (!pending) return;
    const link = this.links.get(pending.pairingId);
    const error = !link ? "La conexión se perdió." : this.reason(link, pending.revision);
    if (!accepted || error || pending.stamp !== this.context().stamp) {
      this.finish(pending, "cancelled", error || "Selección cancelada."); return;
    }
    try {
      if (!this.confirm(link!.connection, pending.table)) throw new Error("La sesión no permite cambiar el origen.");
      this.finish(pending, "applied", "Tabla seleccionada. Transformación está actualizando su vista previa.");
    } catch { this.finish(pending, "rejected", "No se pudo configurar el origen. Revisa la sesión ETL."); }
  }
  private finish(pending: Selection, status: string, message: string) {
    const link = this.links.get(pending.pairingId);
    this.pending = null; this.selection(null);
    if (link) this.result(link, pending.requestId, { status, message, revision: this.context().revision });
    for (const active of Array.from(this.links.values())) this.state(active);
  }
  private close(link: Link) {
    if (this.pending?.pairingId === link.binding.pairingId) this.finish(this.pending, "cancelled", "El vínculo se cerró.");
    for (const abort of Array.from(link.requests.values())) abort.abort();
    link.requests.clear(); link.results.clear(); link.channel.close();
    this.links.delete(link.binding.pairingId);
  }
  refresh(connection: SourceConnectionDto) {
    for (const link of Array.from(this.links.values()).filter(l => sameConnection(l.connection, connection))) {
      if (this.pending?.pairingId === link.binding.pairingId) this.finish(this.pending, "cancelled", "El esquema cambió. Vuelve a seleccionar la tabla.");
      for (const abort of Array.from(link.requests.values())) abort.abort();
      link.requests.clear(); link.graph = undefined; link.generation++; link.suspended = ""; this.state(link);
    }
  }
  suspend(connection: SourceConnectionDto, reason: string) {
    for (const link of Array.from(this.links.values()).filter(l => sameConnection(l.connection, connection))) {
      if (link.suspended === reason) continue;
      link.suspended = reason;
      if (this.pending?.pairingId === link.binding.pairingId) this.finish(this.pending, "cancelled", reason);
      this.state(link);
    }
  }
  agentStatus(agentId: string, available: boolean) {
    for (const connection of this.connections().filter(c => (c.connection_id ? c.runtime_agent_id : c.use_agent ? c.agent_id : null) === agentId)) {
      if (!available) this.suspend(connection, "El agente no está disponible. Comprueba su conexión; el diagrama se recuperará al volver.");
      else if (Array.from(this.links.values()).some(l => sameConnection(l.connection, connection) && l.suspended.startsWith("El agente"))) this.refresh(connection);
    }
  }
  invalidate(connection?: SourceConnectionDto) {
    for (const link of Array.from(this.links.values()).filter(l => !connection || sameConnection(l.connection, connection))) {
      this.send(link, "CONTEXT_INVALIDATED", undefined, { error: "La conexión cambió. Vuelve a abrir el diagrama desde la pestaña ETL." });
      this.close(link);
    }
  }
  expire() {
    let unopened = 0;
    // Background tabs can be throttled for minutes. Keep established leases for a day.
    for (const link of Array.from(this.links.values())) if (Date.now() - link.seen > (link.instance ? 86400000 : PRESENCE_TTL)) {
      if (!link.instance) unopened++;
      this.close(link);
    }
    return unopened;
  }
  connections() { return Array.from(this.links.values(), l => l.connection); }
}
