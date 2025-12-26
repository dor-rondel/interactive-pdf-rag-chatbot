import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';

type LangfuseGlobal = typeof globalThis & {
  __langfuseOtelStarted?: boolean;
};

/**
 * Returns whether Langfuse tracing should be enabled for this process.
 *
 * Langfuse tracing is considered enabled only when both `LANGFUSE_PUBLIC_KEY`
 * and `LANGFUSE_SECRET_KEY` are present.
 */
function isLangfuseEnabled(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
  );
}

/**
 * Registers OpenTelemetry and exports spans to Langfuse.
 *
 * Notes:
 * - No-op on Edge runtime.
 * - No-op if required Langfuse env vars are missing.
 * - Guarded to run only once per process.
 */
export function register(): void {
  // Next can run instrumentation for different runtimes.
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  if (!isLangfuseEnabled()) {
    return;
  }

  const langfuseGlobal = globalThis as LangfuseGlobal;

  if (langfuseGlobal.__langfuseOtelStarted) {
    return;
  }
  langfuseGlobal.__langfuseOtelStarted = true;

  const sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        exportMode: 'immediate',
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL,
        environment: process.env.LANGFUSE_TRACING_ENVIRONMENT,
        release: process.env.LANGFUSE_RELEASE,
      }),
    ],
  });

  sdk.start();
}
