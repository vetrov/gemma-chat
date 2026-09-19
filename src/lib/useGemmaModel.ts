import { useEffect, useRef, useState } from 'react'
import {
  deleteModelAllInfoInCache,
  hasModelInCache,
  type ChatCompletionMessageParam,
  type WebWorkerMLCEngine,
} from '@mlc-ai/web-llm'
import type { ChatMessage } from '../types/chat'
import {
  connectToModel,
  formatBytes,
  getErrorMessage,
  getWebGpuIssue,
  MODEL_APP_CONFIG,
  MODEL_DOWNLOAD_BYTES,
  MODEL_ID,
} from './modelClient'

export type ModelPhase =
  | 'checking'
  | 'unsupported'
  | 'download-required'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'error'

interface GenerateOptions {
  messages: ChatMessage[]
  onToken: (text: string) => void
}

export function useGemmaModel() {
  const [phase, setPhase] = useState<ModelPhase>('checking')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Checking browser and model cache...')
  const [error, setError] = useState<string | null>(null)
  const engineRef = useRef<WebWorkerMLCEngine | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const loadAbortControllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef<'load' | 'download' | 'remove' | null>(null)
  const stopRequestedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    void initialize()

    async function initialize() {
      const supportIssue = await getWebGpuIssue()
      if (cancelled) {
        return
      }
      if (supportIssue) {
        setError(supportIssue)
        setPhase('unsupported')
        return
      }

      try {
        const cached = await hasModelInCache(MODEL_ID, MODEL_APP_CONFIG)
        if (cancelled) {
          return
        }

        if (!cached) {
          setPhase('download-required')
          setStatusText('Gemma is not downloaded yet.')
          return
        }

        setPhase('loading')
        setStatusText('Loading Gemma from browser storage...')
        operationRef.current = 'load'
        const controller = new AbortController()
        loadAbortControllerRef.current = controller
        const connection = await connectToModel(
          handleProgress,
          (worker) => {
            workerRef.current = worker
          },
          controller.signal,
        )

        if (cancelled) {
          connection.worker.terminate()
          return
        }

        engineRef.current = connection.engine
        setPhase('ready')
        setStatusText('Gemma is ready.')
      } catch (caughtError) {
        if (!cancelled && !isAbortError(caughtError)) {
          showError(caughtError)
        }
      } finally {
        if (operationRef.current === 'load') {
          operationRef.current = null
        }
      }
    }

    return () => {
      cancelled = true
      loadAbortControllerRef.current?.abort()
      engineRef.current?.interruptGenerate()
      workerRef.current?.terminate()
      engineRef.current = null
      workerRef.current = null
    }
  }, [])

  function handleProgress(report: { progress: number; text: string }) {
    setProgress(report.progress)
    setStatusText(report.text)
  }

  function showError(caughtError: unknown) {
    console.error('Gemma initialization failed:', caughtError)
    setError(getErrorMessage(caughtError, 'Gemma could not be loaded.'))
    setPhase('error')
  }

  async function downloadModel() {
    if ((phase !== 'download-required' && phase !== 'error') || operationRef.current) {
      return
    }

    operationRef.current = 'download'
    setError(null)
    setPhase('downloading')
    setProgress(0)
    setStatusText('Preparing model download...')
    const controller = new AbortController()
    loadAbortControllerRef.current = controller

    try {
      const storage = navigator.storage
      if (storage?.estimate) {
        const estimate = await storage.estimate()
        if (
          estimate.quota !== undefined &&
          estimate.usage !== undefined &&
          estimate.quota - estimate.usage < MODEL_DOWNLOAD_BYTES
        ) {
          throw new Error(
            `At least ${formatBytes(MODEL_DOWNLOAD_BYTES)} of browser storage is required.`,
          )
        }
      }

      await storage?.persist?.()
      if (controller.signal.aborted) {
        throw new DOMException('Model loading was cancelled.', 'AbortError')
      }
      setStatusText('Starting model download...')

      const connection = await connectToModel(
        handleProgress,
        (worker) => {
          workerRef.current = worker
        },
        controller.signal,
      )
      engineRef.current = connection.engine
      setPhase('ready')
      setStatusText('Gemma is ready.')
    } catch (caughtError) {
      if (!isAbortError(caughtError)) {
        showError(caughtError)
      }
    } finally {
      if (operationRef.current === 'download') {
        operationRef.current = null
      }
    }
  }

  async function removeModel() {
    if (operationRef.current || phase === 'generating') {
      return
    }

    operationRef.current = 'remove'
    setPhase('loading')
    setStatusText('Removing Gemma from browser storage...')

    try {
      engineRef.current?.interruptGenerate()
      workerRef.current?.terminate()
      engineRef.current = null
      workerRef.current = null
      await deleteModelAllInfoInCache(MODEL_ID, MODEL_APP_CONFIG)
      setProgress(0)
      setError(null)
      setPhase('download-required')
      setStatusText('Gemma was removed from browser storage.')
    } catch (caughtError) {
      showError(caughtError)
    } finally {
      operationRef.current = null
    }
  }

  async function cancelDownload() {
    if (operationRef.current !== 'download') {
      return
    }

    operationRef.current = 'remove'
    setPhase('loading')
    setStatusText('Cleaning up the cancelled download...')
    loadAbortControllerRef.current?.abort()
    workerRef.current?.terminate()
    workerRef.current = null
    engineRef.current = null
    try {
      await deleteModelAllInfoInCache(MODEL_ID, MODEL_APP_CONFIG)
      setProgress(0)
      setPhase('download-required')
      setStatusText('Download cancelled. You can try again when ready.')
    } catch (caughtError) {
      showError(caughtError)
    } finally {
      operationRef.current = null
    }
  }

  async function generate({ messages, onToken }: GenerateOptions): Promise<string> {
    const engine = engineRef.current
    if (!engine) {
      throw new Error('Gemma is not ready yet.')
    }

    setError(null)
    setPhase('generating')
    stopRequestedRef.current = false
    let response = ''

    try {
      const completionMessages: ChatCompletionMessageParam[] = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))
      const chunks = await engine.chat.completions.create({
        messages: completionMessages,
        stream: true,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
      })

      if (stopRequestedRef.current) {
        engine.interruptGenerate()
        return response
      }

      for await (const chunk of chunks) {
        response += chunk.choices[0]?.delta.content ?? ''
        onToken(response)
      }

      return response
    } catch (caughtError) {
      if (stopRequestedRef.current) {
        return response
      }
      setError(getErrorMessage(caughtError, 'Gemma stopped unexpectedly.'))
      throw caughtError
    } finally {
      if (engineRef.current) {
        setPhase('ready')
        setStatusText('Gemma is ready.')
      }
    }
  }

  function stopGeneration() {
    stopRequestedRef.current = true
    engineRef.current?.interruptGenerate()
  }

  return {
    phase,
    progress,
    statusText,
    error,
    downloadModel,
    cancelDownload,
    removeModel,
    generate,
    stopGeneration,
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
