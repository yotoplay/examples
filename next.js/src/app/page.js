import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <h1>🔒 Yoto Next.js Example</h1>

        <div className={styles.ctas}>
          <a className={styles.primary} href="/api/auth/login">
            🔐 Login
          </a>
          <a href="/dashboard" className={styles.secondary}>
            📊 View Dashboard
          </a>
        </div>
      </main>
      <footer className={styles.footer}>
        <a href="https://yoto.dev/authentication/auth/">
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Learn about Yoto Auth Flows
        </a>
      </footer>
    </div>
  );
}
