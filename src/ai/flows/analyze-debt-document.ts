'use server';
/**
 * @fileOverview Extrae datos financieros de un contrato de deuda o préstamo.
 * Corregido el error de conexión 404 con el modelo.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDebtInputSchema = z.object({
  fileDataUri: z.string().describe('El documento en formato data URI (PDF o imagen).'),
});
export type AnalyzeDebtInput = z.infer<typeof AnalyzeDebtInputSchema>;

const AnalyzeDebtOutputSchema = z.object({
  monthlyPayment: z.number().optional().describe('Cuota mensual del préstamo.'),
  tin: z.number().optional().describe('Tipo de Interés Nominal (TIN).'),
  tae: z.number().optional().describe('Tasa Anual Equivalente (TAE).'),
  remainingPrincipal: z.number().optional().describe('Capital pendiente total.'),
  nextPaymentDate: z.string().optional().describe('Fecha de la próxima cuota (YYYY-MM-DD).'),
  loanType: z.string().optional().describe('Tipo de préstamo (hipotecario, personal, tarjeta, etc.).'),
  isDataReliable: z.boolean().describe('Indica si los datos extraídos parecen correctos y completos.'),
});
export type AnalyzeDebtOutput = z.infer<typeof AnalyzeDebtOutputSchema>;

export async function analyzeDebtDocument(input: AnalyzeDebtInput): Promise<AnalyzeDebtOutput> {
  return analyzeDebtFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDebtDocumentPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: AnalyzeDebtInputSchema},
  output: {schema: AnalyzeDebtOutputSchema},
  prompt: `Eres un experto en análisis de contratos bancarios y préstamos.
Analiza el documento adjunto y extrae los siguientes datos financieros clave:
1. Cuota mensual (mensualidad).
2. TIN (Tipo de Interés Nominal).
3. TAE (Tasa Anual Equivalente).
4. Capital pendiente (el importe que falta por pagar a día de hoy si se menciona).
5. Fecha de la próxima cuota o periodicidad.
6. Tipo de préstamo.

Si no encuentras un dato específico, déjalo como null o vacío.
USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Documento: {{media url=fileDataUri}}`,
});

const analyzeDebtFlow = ai.defineFlow(
  {
    name: 'analyzeDebtFlow',
    inputSchema: AnalyzeDebtInputSchema,
    outputSchema: AnalyzeDebtOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
