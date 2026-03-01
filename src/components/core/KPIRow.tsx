'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { KPIStatProps } from './KPIStat';
import { KPIStat } from './KPIStat';

export interface KPIRowProps {
  /**
   * Lista de KPIs a mostrar (máx. 4 en desktop, 2 por fila en móvil).
   * Alternativa: usar children con componentes KPIStat.
   */
  items?: KPIStatProps[];
  /** Contenido alternativo: hijos KPIStat directamente */
  children?: ReactNode;
  className?: string;
}

/**
 * Fila responsive de KPIStat según docs/ui-ux §2.3.
 * Móvil: grid 2 columnas. Desktop: hasta 4 columnas.
 */
export function KPIRow({ items, children, className }: KPIRowProps) {
  const content = items != null
    ? items.map((item, i) => <KPIStat key={i} {...item} />)
    : children;

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4',
        className
      )}
      role="list"
      aria-label="Indicadores clave"
    >
      {content}
    </div>
  );
}
