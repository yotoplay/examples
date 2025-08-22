import { getStoredTokens } from "../api/auth/callback/route.js";

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

export default async function Dashboard() {
  const cards = await getCards();

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
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
  );
}
