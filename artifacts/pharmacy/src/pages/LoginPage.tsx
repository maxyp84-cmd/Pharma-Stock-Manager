import { useState } from "react";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WifiOff } from "lucide-react";
import {
  cacheCredentials,
  offlineLogin,
  setActiveOfflineUser,
  isNetworkError,
  type OfflineProfile,
} from "@/lib/offline-auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const login = useLogin();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const profile = await login.mutateAsync({ data: { username, password } });
      await cacheCredentials(username, password, profile as OfflineProfile);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/");
    } catch (err: any) {
      if (isNetworkError(err)) {
        const cached = await offlineLogin(username, password);
        if (cached) {
          setActiveOfflineUser(cached);
          queryClient.setQueryData(getGetMeQueryKey(), cached);
          toast.success("Logged in offline — using cached credentials");
          setLocation("/");
        } else {
          toast.error("You are offline and no cached credentials were found for this account. Please connect to the internet first.");
        }
      } else {
        toast.error(err?.message || "Login failed");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {!navigator.onLine && (
        <div className="w-full max-w-md mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are offline. Login with a previously used account will work without internet.</span>
        </div>
      )}

      <Card className="w-full max-w-md mb-8">
        <CardHeader>
          <CardTitle>Demo Credentials</CardTitle>
          <CardDescription>Use these to test the app</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5">
            <li>admin / admin123</li>
            <li>manager / manager123</li>
            <li>cashier / cashier123</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to MediStock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Username</label>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Logging in…" : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
