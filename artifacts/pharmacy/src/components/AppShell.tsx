import { Link, useLocation } from "wouter";
import { LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { InstallButton } from "./InstallButton";
import { clearActiveOfflineUser } from "@/lib/offline-auth";

export function AppShell({ user, children }: { user: any; children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    clearActiveOfflineUser();
    try {
      await logout.mutateAsync(undefined);
    } catch {
    }
    queryClient.clear();
    setLocation("/login");
  };

  const navItems = [
    { href: "/", label: "Dashboard", roles: ["admin", "manager", "cashier"] },
    { href: "/pos", label: "POS", roles: ["admin", "manager", "cashier"] },
    { href: "/products", label: "Products", roles: ["admin", "manager", "cashier"] },
    { href: "/inventory", label: "Inventory", roles: ["admin", "manager"] },
    { href: "/sales", label: "Sales", roles: ["admin", "manager", "cashier"] },
    { href: "/closing-report", label: "Closing Report", roles: ["admin", "manager", "cashier"] },
    { href: "/suppliers", label: "Suppliers", roles: ["admin", "manager"] },
    { href: "/categories", label: "Categories", roles: ["admin", "manager"] },
    { href: "/branches", label: "Branches", roles: ["admin", "manager"] },
    { href: "/users", label: "Users", roles: ["admin"] },
    { href: "/settings", label: "Settings", roles: ["admin", "manager", "cashier"] },
  ];

  return (
    <div className="flex h-screen w-full">
      <div className="w-64 bg-sidebar border-r flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <h1 className="text-xl font-bold text-white flex-1">MediStock</h1>
          {!isOnline && (
            <span title="Offline mode — using cached data">
              <WifiOff className="h-4 w-4 text-amber-300" />
            </span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 rounded ${
                  location === item.href
                    ? "bg-primary text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{user.branchName || "Main Branch"}</span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <InstallButton />
            <span className="text-sm">
              {user.fullName}{" "}
              <span className="text-muted-foreground capitalize">({user.role})</span>
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
