import { type ReactNode } from "react";

export function EmptyState({ title, description, action, icon }: {
  title: ReactNode; description: ReactNode; action: ReactNode; icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-content">
      {icon && <div aria-hidden="true" className="mb-3 flex justify-center text-content-muted">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-content-muted">{description}</p>
      <div className="mt-4 flex justify-center">{action}</div>
    </div>
  );
}
