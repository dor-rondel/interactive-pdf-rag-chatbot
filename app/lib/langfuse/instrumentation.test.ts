import { afterEach, describe, expect, it, vi } from 'vitest';

const sdkStartMock = vi.fn();
const nodeSdkConstructorMock = vi.fn((..._args: unknown[]) => {
  void _args;
  return {
    start: sdkStartMock,
  };
});
const langfuseSpanProcessorConstructorMock = vi.fn((..._args: unknown[]) => {
  void _args;
  return {};
});

vi.mock('@opentelemetry/sdk-node', () => {
  return {
    NodeSDK: function NodeSDK(...args: unknown[]) {
      return nodeSdkConstructorMock(...args);
    },
  };
});

vi.mock('@langfuse/otel', () => {
  return {
    LangfuseSpanProcessor: function LangfuseSpanProcessor(...args: unknown[]) {
      return langfuseSpanProcessorConstructorMock(...args);
    },
  };
});

describe('instrumentation register()', () => {
  afterEach(() => {
    // Reset the module-level guard used by instrumentation.ts
    // (Vitest also resets envs/globals based on config, but this is explicit.)
    (
      globalThis as unknown as { __langfuseOtelStarted?: boolean }
    ).__langfuseOtelStarted = undefined;
  });

  it('does nothing on edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('LANGFUSE_PUBLIC_KEY', 'pk_test');
    vi.stubEnv('LANGFUSE_SECRET_KEY', 'sk_test');

    const mod = await import('./instrumentation');
    mod.register();

    expect(nodeSdkConstructorMock).not.toHaveBeenCalled();
    expect(langfuseSpanProcessorConstructorMock).not.toHaveBeenCalled();
    expect(sdkStartMock).not.toHaveBeenCalled();
  });

  it('does nothing when Langfuse env vars are missing', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('LANGFUSE_PUBLIC_KEY', '');
    vi.stubEnv('LANGFUSE_SECRET_KEY', '');

    const mod = await import('./instrumentation');
    mod.register();

    expect(nodeSdkConstructorMock).not.toHaveBeenCalled();
    expect(langfuseSpanProcessorConstructorMock).not.toHaveBeenCalled();
    expect(sdkStartMock).not.toHaveBeenCalled();
  });

  it('starts NodeSDK once when enabled', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('LANGFUSE_PUBLIC_KEY', 'pk_test');
    vi.stubEnv('LANGFUSE_SECRET_KEY', 'sk_test');
    vi.stubEnv('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com');
    vi.stubEnv('LANGFUSE_TRACING_ENVIRONMENT', 'test');
    vi.stubEnv('LANGFUSE_RELEASE', 'unit');

    const mod = await import('./instrumentation');
    mod.register();

    expect(langfuseSpanProcessorConstructorMock).toHaveBeenCalledTimes(1);
    expect(nodeSdkConstructorMock).toHaveBeenCalledTimes(1);
    expect(sdkStartMock).toHaveBeenCalledTimes(1);
  });

  it('does not start NodeSDK twice in the same process', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('LANGFUSE_PUBLIC_KEY', 'pk_test');
    vi.stubEnv('LANGFUSE_SECRET_KEY', 'sk_test');

    const mod = await import('./instrumentation');

    mod.register();
    mod.register();

    expect(nodeSdkConstructorMock).toHaveBeenCalledTimes(1);
    expect(sdkStartMock).toHaveBeenCalledTimes(1);
  });
});
