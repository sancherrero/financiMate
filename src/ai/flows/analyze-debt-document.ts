'use server';
/**
 * @fileOverview Extrae datos financieros de un contrato de deuda o préstamo.
 * Incluye fallback si la IA no está disponible.
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

const analyzePrompt = ai.definePrompt({
  name: 'analyzeDebtDocumentPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: AnalyzeDebtInputSchema},
  output: {schema: AnalyzeDebtOutputSchema},
  prompt: `Eres un experto en análisis de contratos bancarios. Analiza el documento y extrae los datos clave financieros en ESPAÑOL.

Documento: {{media url=fileDataUri}}`,
});

export async function analyzeDebtDocument(input: AnalyzeDebtInput): Promise<AnalyzeDebtOutput> {
  try {
    const {output} = await analyzePrompt(input);
    return output!;
  } catch (error) {
    console.warn("Analyze debt AI failure, returning default empty state for manual entry.", error);
    return {
      isDataReliable: false,
      loanType: "Desconocido (Error de cuota de IA)"
    };
  }
}
