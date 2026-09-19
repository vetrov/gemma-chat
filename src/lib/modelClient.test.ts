import { afterEach, describe, expect, it, vi } from 'vitest'
import { getErrorMessage, getWebGpuIssue, MODEL_APP_CONFIG, MODEL_ID } from './modelClient'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('model client diagnostics', () => {
  it('uses a valid non-sliding Gemma context configuration', () => {
    const model = MODEL_APP_CONFIG.model_list.find(({ model_id }) => model_id === MODEL_ID)

    expect(model?.overrides).toMatchObject({
      context_window_size: 4096,
      sliding_window_size: -1,
    })
  })

  it('preserves string errors returned by the WebLLM worker', () => {
    expect(getErrorMessage('Error: Unable to find a compatible GPU.', 'fallback')).toBe(
      'Unable to find a compatible GPU.',
    )
  })

  it('preserves structured error messages', () => {
    expect(getErrorMessage({ message: 'GPU device creation failed.' }, 'fallback')).toBe(
      'GPU device creation failed.',
    )
  })

  it('reports when WebGPU has no usable adapter', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue(null),
      },
    })

    await expect(getWebGpuIssue()).resolves.toContain('no compatible GPU adapter')
  })
})
