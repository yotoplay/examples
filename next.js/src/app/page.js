import Image from "next/image";
import styles from "./page.module.css";
import { getStoredTokens } from "./api/auth/callback/route.js";

// Server Component - fetch data on server and pass as props
async function getCards() {
  const storedTokens = getStoredTokens();

  if (!storedTokens?.accessToken) {
    return [];
  }

  // Fetch cards from Yoto API (server-side)
  const response = await fetch("https://api.yotoplay.com/content/mine", {
    headers: {
      Authorization: `Bearer ${storedTokens.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch cards:", response.statusText);
    return [];
  }

  const { cards } = await response.json();
  return cards || [];
}

export default async function Home() {
  const cards = await getCards();
  const storedTokens = getStoredTokens();
  const isLoggedIn = !!storedTokens?.accessToken;

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
        {!isLoggedIn ? (
          <div className={styles.ctas}>
            <a className={styles.primary} href="/api/auth/login">
              🔐 Login
            </a>
          </div>
        ) : (
          <div className={styles.ctas}>
            <form action="/api/auth/logout" method="POST" style={{ margin: 0 }}>
              <button type="submit" className={styles.primary}>
                🏃‍♂️‍➡️ Logout
              </button>
            </form>
          </div>
        )}

        {isLoggedIn && (
          <div style={{ padding: "2rem" }}>
            <h2>Your Cards</h2>
            {cards.length === 0 ? (
              <p>No cards found.</p>
            ) : (
              <ul>
                {cards.map((card) => (
                  <li key={card.cardId}>
                    {card.cardId} - {card.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
