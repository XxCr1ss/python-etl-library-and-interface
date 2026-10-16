import { AppShell } from "@/components/layout/AppShell";
import { PipelineProvider } from "@/state/PipelineProvider";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider><PipelineProvider><AppShell>{children}</AppShell></PipelineProvider></ThemeProvider>
  );
}
