import type { ReactNode } from "react";
import AgentChatWidget from "./AgentChatWidget";
import Footer from "./Footer";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="pt-24">{children}</div>
      <Footer />
      <AgentChatWidget />
    </main>
  );
}
