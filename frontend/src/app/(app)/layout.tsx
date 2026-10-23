import { AppShell } from "@/components/layout/AppShell";
import { PipelineProvider } from "@/state/PipelineProvider";
import { DatabaseExtractProvider } from "@/components/etl/DatabaseExtractProvider";
import { DiagramCoordinator } from "@/features/diagram/DiagramCoordinator";
import { WarehouseSessionProvider } from "@/features/warehouse/WarehouseSessionProvider";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PipelineProvider><WarehouseSessionProvider><DiagramCoordinator><DatabaseExtractProvider><AppShell>{children}</AppShell></DatabaseExtractProvider></DiagramCoordinator></WarehouseSessionProvider></PipelineProvider>
  );
}
