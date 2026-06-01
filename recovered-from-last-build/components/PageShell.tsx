import type { ReactNode } from "react";
import AgentChatWidget from "./AgentChatWidget";
import Footer from "./Footer";
import Header from "./Header";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="pt-24">{children}</div>
      <Footer />
      <AgentChatWidget />
    </main>
  );
}
