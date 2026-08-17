"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Package, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CompanySwitcher, type CompanyOption } from "./company-switcher";
import { UserMenu } from "./user-menu";
import { NAV_ENTRIES, isGroup } from "./nav-items";
import type { NavItem } from "./nav-items";

export interface SessionProps {
  session: {
    user: { id: number; name: string; email: string };
    company: { id: number; name: string; logo: string | null };
    role: { id: number; name: string };
    permissions: string[];
  };
  companies: CompanyOption[];
}

function hasItemPermission(item: NavItem, permissions: string[]): boolean {
  return !item.permission || permissions.includes(item.permission);
}

function SingleNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active =
    item.href === "/dashboard"
      ? pathname === item.href
      : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );
}

function GroupNavItem({
  group,
  pathname,
  expanded,
  onToggle,
}: {
  group: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasActiveChild = group.items.some((item) =>
    item.href === "/dashboard"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          hasActiveChild && expanded
            ? "text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
        )}
      >
        <group.icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight
          className={cn(
            "size-4 transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
      </button>
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3">
          {group.items.map((item) => (
            <SingleNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ session, companies }: SessionProps) {
  const pathname = usePathname();

  const visibleEntries = NAV_ENTRIES.filter((entry) => {
    if (isGroup(entry)) {
      return entry.items.some((item) => hasItemPermission(item, session.permissions));
    }
    return hasItemPermission(entry, session.permissions);
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of visibleEntries) {
      if (isGroup(entry)) {
        const hasActive = entry.items.some((item) =>
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href),
        );
        if (hasActive) initial[entry.key] = true;
      }
    }
    return initial;
  });

  const activeGroupsFromPath = new Set<string>();
  for (const entry of visibleEntries) {
    if (!isGroup(entry)) continue;
    const hasActive = entry.items.some((item) =>
      item.href === "/dashboard"
        ? pathname === item.href
        : pathname.startsWith(item.href),
    );
    if (hasActive) activeGroupsFromPath.add(entry.key);
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupExpanded = (key: string) =>
    expandedGroups[key] || activeGroupsFromPath.has(key);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2 px-2">
        {session.company.logo ? (
          <img
            src={session.company.logo}
            alt={session.company.name}
            className="h-8 w-auto object-contain"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="size-4" />
          </div>
        )}
      </div>

      <CompanySwitcher
        companies={companies}
        activeCompanyId={session.company.id}
      />

      <nav className="flex-1 space-y-1">
        {visibleEntries.map((entry) => {
          if (isGroup(entry)) {
            const filteredItems = entry.items.filter((item) =>
              hasItemPermission(item, session.permissions),
            );
            if (filteredItems.length === 0) return null;
            return (
              <GroupNavItem
                key={entry.key}
                group={{ ...entry, items: filteredItems }}
                pathname={pathname}
                expanded={isGroupExpanded(entry.key)}
                onToggle={() => toggleGroup(entry.key)}
              />
            );
          }
          return <SingleNavItem key={entry.href} item={entry} pathname={pathname} />;
        })}
      </nav>

      <Separator />

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {session.user.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {session.company.name}
          </span>
        </span>
        <UserMenu
          name={session.user.name}
          email={session.user.email}
          roleName={session.role.name}
        />
      </div>
    </div>
  );
}

export function AppShell({
  session,
  companies,
  children,
}: SessionProps & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <SidebarContent session={session} companies={companies} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            {session.company.logo && (
              <img
                src={session.company.logo}
                alt={session.company.name}
                className="h-6 w-auto object-contain"
              />
            )}
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>

        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent session={session} companies={companies} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
