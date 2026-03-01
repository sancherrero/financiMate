"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TopbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Contenido izquierda (ej. breadcrumb v2 o hamburguesa en móvil) */
  left?: React.ReactNode;
  /** Contenido derecha (ej. SaveStatusPill, UserMenu) */
  right?: React.ReactNode;
}

/**
 * Barra superior del AppShell.
 * Spec: izquierda breadcrumb opcional (v2), centro vacío, derecha SaveStatusPill/UserMenu.
 */
const Topbar = React.forwardRef<HTMLElement, TopbarProps>(
  ({ left, right, className, ...props }, ref) => {
    return (
      <header
        ref={ref}
        role="banner"
        className={cn(
          "sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background px-4 md:px-6",
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
        <div className="hidden flex-1 md:block" aria-hidden />
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </header>
    );
  }
);
Topbar.displayName = "Topbar";

export { Topbar };
