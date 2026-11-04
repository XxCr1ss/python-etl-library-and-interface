import { Alert } from "@/components/ui";
import { ApiError } from "@/services/apiClient";

export function OperationError({ title, error }: { title: string; error: string | Error }) {
  const message = typeof error === "string" ? error : error.message;
  return <Alert tone="error" title={title}>
    {message}
    <TechnicalDetails error={error} />
  </Alert>;
}

export function TechnicalDetails({ error, reference }: { error: string | Error; reference?: string }) {
  const fields = error instanceof ApiError ? [error.status && `HTTP ${error.status}`, error.code, error.technicalDetail] : [];
  const diagnostics = [...fields, reference && `Intento ${reference}`].filter(Boolean).join(" · ");
  return diagnostics ? <details className="mt-2">
    <summary className="cursor-pointer font-medium">Ver detalle técnico</summary>
    <p className="mt-1 break-words font-mono text-xs">{diagnostics}</p>
  </details> : null;
}
