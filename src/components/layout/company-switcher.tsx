"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface CompanyOption {
  id: number;
  name: string;
}

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: CompanyOption[];
  activeCompanyId: number;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const active = companies.find((c) => c.id === activeCompanyId);

  async function switchCompany(companyId: number) {
    if (companyId === activeCompanyId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message ?? "No se pudo cambiar de empresa");
        return;
      }
      toast.success("Empresa cambiada");
      router.refresh();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={switching}
        >
          <span className="truncate">{active?.name ?? "Seleccionar empresa"}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Cambiar de empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onSelect={() => switchCompany(company.id)}
          >
            <span className="flex-1 truncate">{company.name}</span>
            {company.id === activeCompanyId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
