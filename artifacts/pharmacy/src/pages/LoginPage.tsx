import { useState } from "react";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ data: { username, password } });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/");
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
              <Input value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
