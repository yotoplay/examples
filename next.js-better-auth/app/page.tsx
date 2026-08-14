import { AuthControls } from "@/app/auth-controls";
import { getSession, getYotoAccessToken } from "@/lib/auth";
import styles from "./page.module.css";

type Card = {
  cardId: string;
  title: string;
};

async function fetchYotoCards() {
  const accessToken = await getYotoAccessToken();

  if (!accessToken) {
    throw new Error("Yoto access token is unavailable");
  }

  const response = await fetch("https://api.yotoplay.com/content/mine", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const message = `Failed to fetch Yoto cards: ${response.status} ${response.statusText}${responseBody ? ` - ${responseBody}` : ""}`;

    console.error(message);
    throw new Error(
      message,
    );
  }

  const { cards } = (await response.json()) as { cards?: Card[] };

  if (!Array.isArray(cards)) {
    throw new Error("Yoto response did not contain a cards array");
  }

  return cards;
}

export default async function Home() {
  const session = await getSession();
  let cards: Card[] = [];

  if (session?.user) {
    try {
      cards = await fetchYotoCards();
    } catch (error) {
      console.error("Unable to show Yoto cards", error);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Next.js Better Auth</h1>
          {session?.user ? (
            <>
              <p>
                Signed in as {session.user.name} ({session.user.email})
              </p>
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
            </>
          ) : (
            <p>Sign in with your Yoto account.</p>
          )}
          <AuthControls isSignedIn={Boolean(session?.user)} />
        </div>
      </main>
    </div>
  );
}
