import { ThemeProvider } from "@/components/layout/ThemeProvider";
export default function DiagramLayout({ children }: { children: React.ReactNode }) { return <ThemeProvider>{children}</ThemeProvider>; }
