import { spanishAI } from "./spanish.functions";
import type { SpanishAIResponse } from "./spanish-ai";

export async function requestSpanishAI(
  options: Parameters<typeof spanishAI>[0],
): Promise<SpanishAIResponse> {
  let response: Awaited<ReturnType<typeof spanishAI>>;
  try {
    response = await spanishAI({
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(100000),
    });
  } catch {
    throw new Error(
      "The signed-in request could not reach the Spanish service. Refresh Journey and retry. Your answer has been kept. [SPANISH_APP_CONNECTION]",
    );
  }
  if (!response.ok)
    throw new Error(`${response.error.message} [${response.error.code}; ${response.error.stage}]`);
  return response.result;
}
