export const DEEPSEEK_PRODUCTION_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_CHAT_COMPLETIONS_PATH = '/chat/completions';
export const DEEPSEEK_MAX_ATTEMPTS = 3;
export const DEEPSEEK_RETRY_DELAYS_MS = [500, 1000] as const;
export const DEEPSEEK_PER_ATTEMPT_TIMEOUT_MS = 30_000;
export const DEEPSEEK_RETRY_AFTER_CAP_MS = 2_000;
export const DEEPSEEK_MAX_RESPONSE_BYTES = 65_536;
export const DEEPSEEK_MAX_TOKENS = 256;
export const DEEPSEEK_API_KEY_ENV = 'DEEPSEEK_API_KEY';
export const DEEPSEEK_PROVIDER_ID = 'deepseek' as const;

export const DEEPSEEK_GATEWAY_PORT = Symbol('DEEPSEEK_GATEWAY_PORT');
