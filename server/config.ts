/** Read generation credentials only inside the server runtime. */
export interface GenerationConfig {
  provider: 'openai' | 'gemini';
  model: string;
  apiKey: string;
  password?: string;
}

export function generationConfig(
  env: NodeJS.ProcessEnv = process.env,
): GenerationConfig | undefined {
  const provider = env.LLM_PROVIDER;

  if (provider !== 'openai' && provider !== 'gemini') return;

  const model = env.LLM_MODEL?.trim();
  const apiKey = (provider === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY)?.trim();
  const configuredPassword = env.QUIZ_GENERATION_PASSWORD;
  const password = configuredPassword?.trim() ? configuredPassword : undefined;

  if (!model || !apiKey || (password?.length ?? 0) > 1024) return;

  return { provider, model, apiKey, password };
}
