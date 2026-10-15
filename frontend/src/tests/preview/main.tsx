import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Alert, Badge, Button, Card, EmptyState, Input, LoadingSkeleton, Modal, Select, Skeleton, Tabs,
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import "@/app/globals.css";

function Preview() {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("file");
  const [count, setCount] = useState(0);
  const initial = useRef<HTMLInputElement>(null);
  return <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "grid", gap: 24 }}>
    <h1 style={{ fontSize: 28, fontWeight: 700 }}>Primitivas · Fase 01</h1>
    <Card aria-label="Acciones"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button onClick={() => { setLocked(false); setOpen(true); }}>Configurar origen</Button>
      <Button variant="outline" onClick={() => { setLocked(true); setOpen(true); }}>Operación no cancelable</Button>
      <Button isLoading onClick={() => setCount(count + 1)}>Guardando</Button>
      <Button disabled onClick={() => setCount(count + 1)}>Deshabilitado</Button>
      <Button variant="secondary" onClick={() => setCount(count + 1)}>Secundario</Button>
      <Button variant="ghost" onClick={() => setCount(count + 1)}>Acción simple</Button>
      <Button variant="destructive" onClick={() => setCount(count + 1)}>Eliminar muestra</Button>
    </div><p>Acciones ejecutadas: {count}</p></Card>
    <Card aria-label="Formulario"><Input label="Host" hint="Dirección del servidor" error="Host obligatorio" />
      <Select label="Motor" defaultValue="postgresql"><option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option></Select></Card>
    <Tabs label="Fuente" selectedId={tab} onChange={setTab} items={[
      { id: "file", label: "Archivo", content: "Fuente de archivo" },
      { id: "database", label: "Base de datos", content: "Fuente de base de datos" },
      { id: "date", label: "Fecha", content: "Dimensión temporal" },
    ]} />
    <Card aria-label="Tipos y muestra"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Badge tone="numeric">Numérico</Badge><Badge tone="text">Texto</Badge><Badge tone="date">Fecha</Badge>
      <Badge tone="boolean">Booleano</Badge><Badge tone="unknown">Desconocido</Badge><Badge tone="success">Conectado</Badge>
    </div><div style={{ overflowX: "auto" }}><Table><TableCaption>Muestra sintética: 1 fila</TableCaption>
      <TableHead><TableRow><TableHeader>ID</TableHeader><TableHeader>Valor</TableHeader></TableRow></TableHead>
      <TableBody><TableRow><TableCell>0</TableCell><TableCell>null (ausente)</TableCell></TableRow></TableBody>
    </Table></div></Card>
    <LoadingSkeleton><Skeleton /><Skeleton /></LoadingSkeleton>
    <Alert title="Información">Muestra sintética disponible.</Alert>
    <Alert title="Atención" tone="warning">Revisa los tipos antes de continuar.</Alert>
    <Alert title="Error de muestra" tone="error">Mensaje de ejemplo para verificar contraste.</Alert>
    <EmptyState title="Sin transformaciones" description="Agrega el primer paso cuando lo necesites." action={<Button onClick={() => setOpen(true)}>Agregar paso</Button>} />
    <Modal open={open} onClose={() => setOpen(false)} title="Configurar origen" description="Datos sintéticos para revisar el teclado."
      allowClose={!locked} initialFocusRef={initial} footer={<Button onClick={() => setOpen(false)}>Guardar configuración</Button>}>
      <Input ref={initial} label="Nombre del origen" /><Select label="Formato"><option>CSV</option><option>Excel</option></Select>
      <p>Tab y Shift+Tab deben permanecer dentro del diálogo. Escape cierra cuando se permite.</p>
    </Modal>
  </main>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
