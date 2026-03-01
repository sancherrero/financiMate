import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** Título principal de la página */
  title: string;
  /** Descripción corta opcional */
  subtitle?: string;
  /** Acciones (botones, etc.) alineadas a la derecha; en móvil pasan debajo, alineadas a la derecha */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabecera reutilizable de página según docs/ui-ux §2.2.
 * En viewport estrecho las acciones se apilan debajo del título/subtítulo, alineadas a la derecha.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        className
      )}
      role="banner"
    >
      <div className="space-y-1 min-w-0">
        <h1 className="text-3xl font-headline font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-base">{subtitle}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
