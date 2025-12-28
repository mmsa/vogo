import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Gift,
  Lightbulb,
  Search,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ModeToggle } from "./ui/ModeToggle";
import { Badge } from "./ui/Badge";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const baseNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/memberships", label: "Memberships", icon: CreditCard },
  { path: "/benefits", label: "Benefits", icon: Gift },
  { path: "/recommendations", label: "Recommendations", icon: Lightbulb },
];

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Add admin link for admin users
  const navItems = user?.role === 'admin' 
    ? [...baseNavItems, { path: "/admin", label: "Admin", icon: Shield }]
    : baseNavItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <Logo size="md" showText={false} />
              <span className="hidden sm:inline ml-2 text-sm text-zinc-600 dark:text-zinc-400 font-medium">vogoplus.app</span>
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
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 px-3"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-medium">
                  {user?.email.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {user?.email.split('@')[0]}
                </span>
                {user?.role === 'admin' && (
                  <Badge variant="default" className="hidden lg:inline-flex">
                    Admin
                  </Badge>
                )}
              </Button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-medium">
                          {user?.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {user?.email}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            {user?.role === 'admin' && (
                              <>
                                <Shield className="h-3 w-3" />
                                Administrator
                              </>
                            )}
                            {user?.role === 'user' && 'Member'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/privacy"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Privacy Policy
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Navigate to settings when implemented
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
