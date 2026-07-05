/**
 * Utilitário de resiliência para chamadas outbound da API da Meta.
 * Implementa estratégia de backoff exponencial para lidar com Rate Limits (Erro 131056).
 */

export async function fetchWithMetaBackoff(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      
      // Se for rate limit específico do WhatsApp Cloud API ou geral
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      // Lê a resposta para inspecionar erros específicos do corpo se necessário
      const clonedResponse = response.clone();
      const body = await clonedResponse.json().catch(() => ({}));

      if (body.error && body.error.code === 131056) {
        throw new Error('Rate limit exceeded (131056)');
      }

      return response;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Cálculo exponencial: 4^X segundos
      const backoffSeconds = Math.pow(4, attempt + 1);
      console.warn(`[Meta API] Rate limit atingido. Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${backoffSeconds}s...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
      attempt++;
    }
  }
  
  throw new Error('Maximum retries exceeded');
}
