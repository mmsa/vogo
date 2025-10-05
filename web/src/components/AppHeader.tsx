import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Gift,
  Lightbulb,
  Search,
  User,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ModeToggle } from "./ui/ModeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/memberships", label: "Memberships", icon: CreditCard },
  { path: "/benefits", label: "Benefits", icon: Gift },
  { path: "/recommendations", label: "Recommendations", icon: Lightbulb },
];

export function AppHeader() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl px-3 py-1.5">
                <span className="text-white font-bold text-xl">Vogo</span>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden lg:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search... (⌘K)"
                className="pl-9 w-64 h-9"
              />
            </div>

            {/* Theme Toggle */}
            <ModeToggle />

            {/* User Menu */}
            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
