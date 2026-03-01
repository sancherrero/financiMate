"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Menu,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/Topbar";

/** Botón hamburguesa para abrir el Sheet de navegación en móvil */
function MobileNavTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden h-9 w-9"
      onClick={toggleSidebar}
      aria-label="Abrir menú de navegación"
    >
      <Menu className="size-5" aria-hidden />
    </Button>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export interface AppShellProps {
  children: React.ReactNode;
  /** Slot derecha de la Topbar (ej. SaveStatusPill en tarea 3) */
  topbarRight?: React.ReactNode;
  className?: string;
}

/**
 * Shell de la aplicación: Sidebar (desktop) + Topbar + Main.
 * En móvil la Sidebar se convierte en Sheet (hamburguesa).
 * No usar en Onboarding.
 */
function AppShell({ children, topbarRight, className }: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <AppShellContent
        pathname={pathname}
        topbarRight={topbarRight}
        className={className}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  );
}

/** Contenido que necesita useSidebar (debe estar dentro de SidebarProvider). */
function AppShellContent({
  pathname,
  topbarRight,
  className,
  children,
}: AppShellProps & { pathname: string }) {
  const { setOpenMobile } = useSidebar();

  // Cerrar Sheet de navegación en móvil al cambiar de ruta
  React.useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
      <div className={cn("flex min-h-svh w-full", className)}>
        <Sidebar>
          <SidebarHeader>
            <span className="font-semibold text-sidebar-foreground">
              FinanciMate
            </span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === href || pathname.startsWith(href + "/")}
                      >
                        <Link href={href}>
                          <Icon className="size-4" aria-hidden />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <Topbar
            left={<MobileNavTrigger />}
            right={topbarRight}
          />
          <main className="flex-1 overflow-auto px-4 py-6 md:px-6">
            {children}
          </main>
        </SidebarInset>
      </div>
  );
}

AppShell.displayName = "AppShell";

export { AppShell };
