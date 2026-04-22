import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { drainOfflineQueue } from "@/lib/offline-queue";

import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import InventoryPage from "@/pages/InventoryPage";
import SuppliersPage from "@/pages/SuppliersPage";
import CategoriesPage from "@/pages/CategoriesPage";
import BranchesPage from "@/pages/BranchesPage";
import UsersPage from "@/pages/UsersPage";
import SalesPage from "@/pages/SalesPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && error) {
      setLocation("/login");
    }
  }, [isLoading, error, setLocation]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null;

  return <AppShell user={user}>{children}</AppShell>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <AuthGate>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/pos" component={POSPage} />
            <Route path="/products" component={ProductsPage} />
            <Route path="/inventory" component={InventoryPage} />
            <Route path="/suppliers" component={SuppliersPage} />
            <Route path="/categories" component={CategoriesPage} />
            <Route path="/branches" component={BranchesPage} />
            <Route path="/users" component={UsersPage} />
            <Route path="/sales" component={SalesPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </AuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const handleOnline = async () => {
      const count = await drainOfflineQueue();
      if (count > 0) {
        toast.success(`Synced ${count} offline sales`);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
