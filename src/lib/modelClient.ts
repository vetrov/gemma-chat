import {
  CreateWebWorkerMLCEngine,
  prebuiltAppConfig,
  type AppConfig,
  type InitProgressReport,
  type WebWorkerMLCEngine,
} from '@mlc-ai/web-llm'

export const MODEL_ID = 'gemma3-1b-it-q4f16_1-MLC'
export const MODEL_DOWNLOAD_BYTES = 600_000_000

const prebuiltModel = prebuiltAppConfig.model_list.find(({ model_id }) => model_id === MODEL_ID)

if (!prebuiltModel) {
  throw new Error(`WebLLM does not provide the configured model: ${MODEL_ID}`)
}

export const MODEL_APP_CONFIG: AppConfig = {
  cacheBackend: prebuiltAppConfig.cacheBackend,
  model_list: [
    {
      ...prebuiltModel,
      overrides: {
        ...prebuiltModel.overrides,
        context_window_size: 4096,
        sliding_window_size: -1,
      },
    },
  ],
}

export interface ModelConnection {
  engine: WebWorkerMLCEngine
  worker: Worker
}

export async function connectToModel(
  onProgress: (report: InitProgressReport) => void,
  onWorkerCreated: (worker: Worker) => void,
  signal?: AbortSignal,
): Promise<ModelConnection> {
  const worker = new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' })
  onWorkerCreated(worker)

  try {
    const loadPromise = CreateWebWorkerMLCEngine(worker, MODEL_ID, {
      initProgressCallback: onProgress,
      appConfig: MODEL_APP_CONFIG,
    })
    const engine = signal
      ? await Promise.race([loadPromise, rejectWhenAborted(signal)])
      : await loadPromise
    return { engine, worker }
  } catch (error) {
    worker.terminate()
    throw error
  }
}

function rejectWhenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Model loading was cancelled.', 'AbortError'))
      return
    }

    signal.addEventListener(
      'abort',
      () => reject(new DOMException('Model loading was cancelled.', 'AbortError')),
      { once: true },
    )
  })
}

export async function getWebGpuIssue(): Promise<string | null> {
  if (!globalThis.isSecureContext && window.location.hostname !== 'localhost') {
    return 'Gemma requires a secure HTTPS connection.'
  }

  if (!navigator.gpu) {
    return 'WebGPU is not available in this browser. Use a current Chrome, Edge, or supported Safari version.'
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
    if (!adapter) {
      return 'WebGPU is enabled, but no compatible GPU adapter was found. Check browser GPU acceleration settings and visit webgpureport.org for diagnostics.'
    }

    if (adapter.limits.maxBufferSize < 1 << 28) {
      return `This GPU exposes a ${formatBytes(adapter.limits.maxBufferSize)} maximum buffer, but WebLLM requires at least 268 MB.`
    }

    if (adapter.limits.maxStorageBufferBindingSize < 1 << 27) {
      return `This GPU exposes a ${formatBytes(adapter.limits.maxStorageBufferBindingSize)} storage buffer limit, but WebLLM requires at least 134 MB.`
    }

    if (
      adapter.limits.maxComputeWorkgroupStorageSize < 32 << 10 ||
      adapter.limits.maxStorageBuffersPerShaderStage < 10
    ) {
      return 'This GPU does not expose the WebGPU compute limits required by WebLLM.'
    }

    return null
  } catch (error) {
    return `WebGPU could not be initialized: ${getErrorMessage(error, 'unknown adapter error')}`
  }
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(0)} MB`
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error.replace(/^Error:\s*/, '')
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return fallback
}
