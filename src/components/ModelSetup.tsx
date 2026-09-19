import { formatBytes, MODEL_DOWNLOAD_BYTES, MODEL_ID } from '../lib/modelClient'
import type { ModelPhase } from '../lib/useGemmaModel'
import styles from './ModelSetup.module.css'

interface Props {
  phase: ModelPhase
  progress: number
  statusText: string
  error: string | null
  onDownload: () => void
  onCancel: () => void
}

export function ModelSetup({ phase, progress, statusText, error, onDownload, onCancel }: Props) {
  const isWorking = phase === 'downloading' || phase === 'loading' || phase === 'checking'
  const canDownload = phase === 'download-required' || phase === 'error'

  return (
    <section className={styles.panel} aria-labelledby="model-setup-title">
      <div className={styles.modelMark} aria-hidden="true">
        G
      </div>
      <p className={styles.eyebrow}>Private, on-device chat</p>
      <h1 id="model-setup-title">
        {phase === 'unsupported' ? 'This browser needs WebGPU.' : 'Bring Gemma into your browser.'}
      </h1>
      <p className={styles.description}>
        {phase === 'unsupported'
          ? error
          : `Download Gemma 3 1B once, then chat locally. The ${formatBytes(MODEL_DOWNLOAD_BYTES)} model stays in this browser and your prompts are not sent to a server.`}
      </p>

      {phase !== 'unsupported' && (
        <dl className={styles.facts}>
          <div>
            <dt>Model</dt>
            <dd>Gemma 3 1B</dd>
          </div>
          <div>
            <dt>Download</dt>
            <dd>~{formatBytes(MODEL_DOWNLOAD_BYTES)}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>WebGPU</dd>
          </div>
        </dl>
      )}

      {isWorking && (
        <div className={styles.progressBlock} aria-live="polite">
          <div className={styles.progressHeader}>
            <span>{statusText}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <progress max="1" value={progress} aria-label="Model loading progress" />
        </div>
      )}

      {error && phase !== 'unsupported' && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {canDownload && (
          <button className={styles.primaryButton} type="button" onClick={onDownload}>
            {phase === 'error' ? 'Try again' : 'Download model'}
          </button>
        )}
        {phase === 'downloading' && (
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>
            Cancel download
          </button>
        )}
      </div>

      {canDownload && (
        <p className={styles.terms}>
          Downloads from Hugging Face. By continuing, you agree to the{' '}
          <a href="https://ai.google.dev/gemma/terms" target="_blank" rel="noreferrer">
            Gemma terms
          </a>
          . Model ID: <code>{MODEL_ID}</code>
        </p>
      )}
    </section>
  )
}
