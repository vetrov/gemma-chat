import { Link } from 'react-router-dom'
import styles from './NotFoundRoute.module.css'

export function NotFoundRoute() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1>This conversation does not exist.</h1>
      <p>The address may be incorrect, or the page may have moved.</p>
      <Link className={styles.link} to="/">
        Return home
      </Link>
    </main>
  )
}
