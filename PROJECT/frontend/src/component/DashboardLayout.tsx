import { SidebarProvider } from "@/component/ui/sidebar";
import { AppSidebar } from "@/component/Appsidebar";
import { DashboardHeader } from "@/component/DashboardHeader";
import { PageTransition } from "@/component/PageTransition";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="h-screen flex w-full bg-mesh-primary overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1440px] mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
