"use client";
import { useContext, useState } from "react";
import { WarehouseContext } from "@/features/warehouse/WarehouseSessionProvider";
import { useRouter } from "next/navigation";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { Button, Modal } from "@/components/ui";

export function ResetPipelineButton({ children = "Limpiar pipeline" }: { children?: React.ReactNode }) {
  const { state, reset } = usePipelineSession();
  const warehouse = useContext(WarehouseContext);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const blocked = state.hydrationStatus === "hydrating" || state.execution?.status === "running";
  const start = () => { reset(); setOpen(false); router.push("/extract"); };
  return <>
    <Button size="sm" variant="outline" disabled={blocked} onClick={() => {
      if (state.source || state.recipe.length || state.target || state.recoveryRequired || warehouse?.hasConnection) setOpen(true);
      else start();
    }}>{children}</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Reiniciar pipeline" description="Se descartarán el origen, la receta, el destino, las vistas previas, la sesión analítica y las credenciales en memoria. El historial de esta pestaña y el ID del agente se conservan."
      footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="destructive" disabled={blocked} onClick={start}>Reiniciar e ir a Extracción</Button></>}>
      <p>Esta acción no modifica las tablas de la base de datos.</p>
    </Modal>
  </>;
}
