import styles from './HomeRoute.module.css'

export function HomeRoute() {
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>Gemma Chat</p>
        <h1>A focused place to talk with Gemma.</h1>
        <p className={styles.summary}>
          The project foundation is ready. Chat functionality will arrive in a future iteration.
        </p>
      </section>
    </main>
  )
}
