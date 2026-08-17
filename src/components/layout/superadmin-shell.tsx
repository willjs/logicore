"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SuperAdminShellProps {
  user: { id: number; name: string; email: string };
  children: React.ReactNode;
}

export function SuperAdminShell({ user, children }: SuperAdminShellProps) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full">
      <div className="flex w-64 shrink-0 flex-col gap-4 border-r p-4">
        <div className="flex items-center gap-2 px-2">
          <img src="/logicore-logo.png" alt="LogiCore" className="h-8 w-auto object-contain" />
          <Badge>Superadmin</Badge>
        </div>

        <nav className="flex-1 space-y-1">
          <Link
            href="/superadmin"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
              pathname === "/superadmin" ? "bg-muted" : ""
            }`}
          >
            <Building2 className="size-4" />
            Empresas
          </Link>
        </nav>

        <Separator />

        <div className="flex items-center justify-between gap-2 px-1">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Cerrar sesión">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
