# Primitivas UI

Importar componentes desde `@/components/ui` o el archivo concreto. Props y refs de controles nativos se conservan. `cn()` combina `clsx` y `tailwind-merge` existentes. Tokens `surface`, `content`, `line`, `focus`, `action`, `success`, `warning`, `danger`, `pipeline` y `dtype` están definidos en CSS/Tailwind; usan exclusivamente el tema claro, independientemente de `prefers-color-scheme`.

```tsx
<Button onClick={save} isLoading={saving}>Guardar</Button>
<Button variant="outline" size="sm" disabled={!ready}>Consultar</Button>
<Input label="Host" hint="Dirección del servidor" error={errors.host} ref={hostRef} />
<Select label="Motor" value={engine} onChange={e => setEngine(e.target.value)}>
  <option value="postgresql">PostgreSQL</option>
</Select>
```

`Button`: primary/secondary/outline/ghost/destructive, tamaños sm/md/lg. Tipo button por defecto; elegir submit explícitamente en forms. Loading deshabilita activación y fija aria-busy sin cambiar children/nombre. Proveer `aria-label` a botones solo de icono. Para navegación usar enlaces.

`Input`/`Select`: label obligatorio, ID explícito opcional (useId si falta), hint/error opcionales. Combinan aria-describedby del consumidor con ayuda/error; error activa aria-invalid. Select es nativo. No usar placeholder como única etiqueta. Errores de campo no disparan alertas repetidas; reservar Alert para feedback de operación.

```tsx
<Modal open={open} onClose={() => setOpen(false)} title="Configurar origen"
  description="Completa los datos de conexión." initialFocusRef={hostRef}
  footer={<Button onClick={save}>Guardar</Button>}>
  <Input ref={hostRef} label="Host" />
</Modal>
<Tabs label="Fuente" selectedId={sourceId} onChange={setSourceId} items={[
  { id: "file", label: "Archivo", content: <FileForm /> },
  { id: "database", label: "Base de datos", content: <DatabaseForm /> },
]} />
```

`Modal`: requiere navegador con dialog.showModal. El top layer nativo vuelve inerte el fondo; Tab/Shift+Tab envuelven los extremos de los controles visibles. Foco inicial en initialFocusRef, primer control o diálogo; al cerrar restaura foco al elemento activo al abrir. Escape/backdrop y el botón de cierre llaman onClose; clic interior no cierra. El padre debe actualizar open. `allowClose={false}` solo para operaciones no cancelables; el padre aún puede completar y cerrar. Evitar modales anidados y formularios method="dialog" que eludan el estado controlado. Cabecera/pie visibles y cuerpo desplazable. Pruebas jsdom adaptan únicamente las APIs nativas; verificar foco en navegador.

`Tabs`: controladas, IDs únicos y selectedId habilitado deben venir del padre. Activación automática con flechas izquierda/derecha, Home/End; omite pestañas deshabilitadas. Tab pasa del tab activo al panel. Los paneles inactivos se conservan ocultos: sus hijos no deben disparar efectos de red innecesarios.

```tsx
<Card aria-label="Muestra">
  <Badge tone="numeric">Entero</Badge>
  <Table><TableCaption>Primeras 5 filas</TableCaption>
    <TableHead><TableRow><TableHeader>ID</TableHeader></TableRow></TableHead>
    <TableBody><TableRow><TableCell>0</TableCell></TableRow></TableBody>
  </Table>
</Card>
<LoadingSkeleton label="Consultando muestra"><Skeleton className="h-8" /></LoadingSkeleton>
<EmptyState title="Sin pasos" description="Agrega una transformación."
  action={<Button onClick={addStep}>Agregar paso</Button>} />
<Alert tone="error" title="Error de conexión">Revisa el host e inténtalo otra vez.</Alert>
```

`Badge`: texto visible siempre; tonos neutral/success/warning/error, pending/active/complete/blocked y numeric/text/date/boolean/unknown. Null representa un valor ausente, no un dtype. `Card` es section; añadir heading o aria-label cuando tenga significado de región. `Skeleton` es decorativo y solo anima si se permite movimiento; envolver el conjunto en un único LoadingSkeleton que anuncia carga. `Alert` usa alert para error y status para info/success/warning; montarlo cuando cambia el mensaje, sin regenerar claves en cada render.

`Table`, `TableCaption`, `TableHead`, `TableBody`, `TableRow`, `TableHeader` y `TableCell` conservan HTML nativo. `TableHeader` usa scope=col por defecto (puede ser row). Añadir contenedor overflow-x-auto en la feature si hace falta. No incluyen ordenación, paginación o contadores inventados.

La galería y lista de verificación de teclado están en `src/tests/README.md`. Las páginas actuales no se migran masivamente en Fase 01.
