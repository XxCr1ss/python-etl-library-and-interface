"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePipelineSession } from "@/hooks/usePipelineSession";
import { previewTransform } from "@/services/transformApi";
import { requiredConnections, sourceDto, stepDto } from "@/services/etlSerializers";
import { CredentialStore } from "@/state/credentialStore";
import type { TransformStep } from "@/types/etl";
import type { StepContext } from "../components/step-editor/types";

type EditorTarget = { revision: number; index: number; step?: TransformStep; context?: StepContext };
type Schema = { status: "loading" | "success" | "error"; context: StepContext; error?: string };
type Undo = { recipe: TransformStep[]; credentials: CredentialStore; revision: number };
export function useStepEditor() {
  const session = usePipelineSession(); const { state, credentials, canTransform, dispatch } = session;
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const [schema, setSchema] = useState<Schema>({ status: "loading", context: { columns: [] } });
  const [retry, setRetry] = useState(0); const [undo, setUndo] = useState<Undo | null>(null);
  const requestId = useRef(0); const targetRef = useRef(target); targetRef.current = target;
  const undoRef = useRef(undo); undoRef.current = undo;
  useEffect(() => {
    if (!target) return;
    const id = ++requestId.current; const abort = new AbortController();
    const current = () => !abort.signal.aborted && id === requestId.current;
    if (target.revision !== state.revision || !canTransform || !state.source) {
      setSchema({ status: "error", context: { columns: [] }, error: "La sesión cambió. Cancela y vuelve a abrir el paso." }); return;
    }
    if (target.context) {
      setSchema({ status: "success", context: target.context }); return;
    }
    setSchema({ status: "loading", context: { columns: [] } });
    void previewTransform({ source: sourceDto(state.source, credentials), steps: state.recipe.slice(0, target.index).map(s => stepDto(s, credentials)), limit: 1 }, abort.signal)
      .then(data => { if (current()) setSchema({ status: "success", context: { columns: data.columns, dtypes: data.dtypes } }); })
      .catch(error => { if (current()) setSchema({ status: "error", context: { columns: [] }, error: error instanceof Error ? error.message : "No se pudo consultar el prefijo." }); });
    return () => { abort.abort(); };
    // The target captures an immutable recipe revision; final preview status is independent.
  }, [target, retry, canTransform, state.revision, state.source, state.recipe, credentials]);
  useEffect(() => { if (undo && undo.revision !== state.revision) { undo.credentials.clear(); setUndo(null); } }, [state.revision, undo]);
  useEffect(() => () => undoRef.current?.credentials.clear(), []);
  const remember = useCallback(() => {
    undoRef.current?.credentials.clear(); const copy = new CredentialStore();
    for (const { credentialRef } of requiredConnections(null, state.recipe)) if (credentials.has(credentialRef)) copy.set(credentialRef, credentials.get(credentialRef));
    setUndo({ recipe: state.recipe, credentials: copy, revision: state.revision + 1 });
  }, [state.recipe, state.revision, credentials]);
  const blocked = !canTransform || state.execution?.status === "running";
  function open(id?: string) {
    if (blocked) return;
    const index = id ? state.recipe.findIndex(s => s.id === id) : state.recipe.length;
    if (index < 0) return;
    setSchema({ status: "loading", context: { columns: [] } });
    setTarget({ revision: state.revision, index, ...(id ? { step: state.recipe[index] } : state.preview.status === "success" && state.preview.revision === state.revision && state.preview.data ? { context: { columns: state.preview.data.columns, dtypes: state.preview.data.dtypes } } : {}) });
  }
  return { target, schema, blocked, open, close: () => setTarget(null), retry: () => setRetry(r => r + 1),
    add: (step: { type: string; params: Record<string, unknown> }) => { if (!blocked) { remember(); session.addStep(step); } },
    edit: (step: TransformStep, temporary?: CredentialStore) => { if (!blocked && targetRef.current?.revision === state.revision) { remember(); session.editStep(step, temporary); } },
    remove: (id: string) => { if (!blocked && state.recipe.some(s => s.id === id) && window.confirm("Eliminar este paso puede invalidar los pasos siguientes. No elimina datos de la base de datos. Podrás deshacer la última modificación. ¿Continuar?")) { remember(); dispatch({ type: "removeStep", id }); } },
    move: (id: string, to: number) => { if (!blocked && to >= 0 && to < state.recipe.length && state.recipe.findIndex(s => s.id === id) !== to) { remember(); dispatch({ type: "moveStep", id, to }); } },
    canUndo: !!undo && undo.revision === state.revision && !blocked,
    undo: () => { if (!undo || blocked || undo.revision !== state.revision) return;
      session.restoreRecipe(undo.recipe, undo.credentials); undo.credentials.clear(); setUndo(null);
    },
  };
}
