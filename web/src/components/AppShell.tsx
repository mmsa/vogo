import { ReactNode, useState, useEffect } from "react";
import { ChatAssistant } from "./ChatAssistant";
import { BenefitReminder } from "./BenefitReminder";
import { useAuth } from "@/store/auth";
import { ChevronRight, ChevronLeft, Gift } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    const saved = localStorage.getItem("vogo_sidebar_visible");
    return saved !== "false"; // Default to visible
  });

  useEffect(() => {
    localStorage.setItem("vogo_sidebar_visible", String(sidebarVisible));
  }, [sidebarVisible]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 w-full">
          {/* Main Content */}
          <main className={cn("flex-1 min-w-0 w-full transition-all", sidebarVisible && "lg:max-w-[calc(100%-22rem)]")}>
            {children}
          </main>
          
          {/* Sidebar Toggle Button - Show when sidebar is hidden */}
          {user?.id && !sidebarVisible && (
            <div className="hidden lg:flex items-start pt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className="rounded-l-none rounded-r-lg border-l-0 shadow-lg"
                title="Show benefit reminders"
              >
                <Gift className="w-4 h-4 mr-2" />
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Sidebar - Benefit Reminder */}
          {user?.id && (
            <aside
              className={cn(
                "hidden lg:block shrink-0 sticky top-8 h-[calc(100vh-4rem)] transition-all duration-300",
                sidebarVisible ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
              )}
            >
              {sidebarVisible && (
                <div className="relative w-80 h-full">
                  <BenefitReminder userId={user.id} />
                  {/* Toggle Button - Inside sidebar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSidebar}
                    className="absolute -left-12 top-0 rounded-r-none rounded-l-lg border-r-0 shadow-lg z-10"
                    title="Hide benefit reminders"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
      <ChatAssistant />
    </div>
  );
}
