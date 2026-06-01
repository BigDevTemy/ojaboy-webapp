import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbfbfb] text-black">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <section className="min-w-0 flex-1">
          <DashboardTopbar />
          <div className="px-5 py-7 sm:px-8 lg:px-10">{children}</div>
        </section>
      </div>
    </main>
  );
}
