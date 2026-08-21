import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/subscriptions")({ component: SubscriptionsRedirect });

function SubscriptionsRedirect() {
  const navigate = useNavigate();
  useEffect(() => { void navigate({ to: "/dashboard" }); }, [navigate]);
  return <AppShell><div className="flex min-h-72 items-center justify-center"><Loader2 className="size-6 animate-spin text-violet-600" /></div></AppShell>;
}
