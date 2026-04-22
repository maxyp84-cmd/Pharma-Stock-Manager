import {
  useGetMe,
  useLogout,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User as UserIcon, Building2, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/login");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Your profile and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
              {me?.fullName?.[0] ?? "?"}
            </div>
            <div>
              <p className="font-semibold">{me?.fullName}</p>
              <p className="text-sm text-muted-foreground font-mono">@{me?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Role:</span>
            <Badge>{me?.role}</Badge>
          </div>
          {me?.branchName && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Branch:</span>
              <span className="font-medium">{me.branchName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Session</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out of MediStock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
