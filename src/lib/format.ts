/**
 * Formato de presentación para UI. No modifica lógica de negocio.
 * Todas las operaciones monetarias y conversiones permanecen en money.ts cuando exista.
 */

/**
 * Formatea un importe en céntimos al formato español: "1.234,56 €".
 * Separador de miles: punto. Decimal: coma. Símbolo € al final con espacio.
 *
 * @param cents - Importe en céntimos (entero). En UI usar clase `tabular-nums` donde se muestre.
 * @returns String listo para mostrar, ej. "1.234,56 €"
 */
export function formatCentsToEur(cents: number): string {
  const euros = cents / 100;
  const fixed = euros.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${decPart} €`;
}
