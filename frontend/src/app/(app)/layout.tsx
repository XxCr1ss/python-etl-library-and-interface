import { AppShell } from "@/components/layout/AppShell";
import { PipelineProvider } from "@/state/PipelineProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { DiagramCoordinator } from "@/features/diagram/DiagramCoordinator";
import { WarehouseSessionProvider } from "@/features/warehouse/WarehouseSessionProvider";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider><PipelineProvider><WarehouseSessionProvider><DiagramCoordinator><AppShell>{children}</AppShell></DiagramCoordinator></WarehouseSessionProvider></PipelineProvider></ThemeProvider>
  );
}
