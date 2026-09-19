import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModelSetup } from './ModelSetup'

describe('ModelSetup', () => {
  it('waits for an explicit click before starting the model download', () => {
    const onDownload = vi.fn()

    render(
      <ModelSetup
        phase="download-required"
        progress={0}
        statusText="Gemma is not downloaded yet."
        error={null}
        onDownload={onDownload}
        onCancel={vi.fn()}
      />,
    )

    expect(onDownload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Download model' }))
    expect(onDownload).toHaveBeenCalledOnce()
  })

  it('reports download progress and allows cancellation', () => {
    const onCancel = vi.fn()

    render(
      <ModelSetup
        phase="downloading"
        progress={0.42}
        statusText="Downloading model files..."
        error={null}
        onDownload={vi.fn()}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('progressbar')).toHaveValue(0.42)
    expect(screen.getByText('42%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel download' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows a compatibility message without offering a download', () => {
    render(
      <ModelSetup
        phase="unsupported"
        progress={0}
        statusText="WebGPU unavailable"
        error="WebGPU is not available in this browser."
        onDownload={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('WebGPU is not available in this browser.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download model' })).not.toBeInTheDocument()
  })
})
