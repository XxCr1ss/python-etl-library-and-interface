import { AppShell } from "@/components/layout/AppShell";
import { PipelineProvider } from "@/state/PipelineProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { DiagramCoordinator } from "@/features/diagram/DiagramCoordinator";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider><PipelineProvider><DiagramCoordinator><AppShell>{children}</AppShell></DiagramCoordinator></PipelineProvider></ThemeProvider>
  );
}
