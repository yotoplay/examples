import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getTokens } from "../token-utils";

export default function AppForm() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);

  useEffect(() => {
    async function getCards() {
      const tokens = await getTokens();

      if (!tokens) {
        navigate("/login");
        return;
      }

      const res = await fetch("https://api.yotoplay.com/card/mine", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      const { cards } = await res.json();
      console.log(cards);
      setCards(cards);
    }

    getCards();
  }, [navigate]);

  return (
    <div>
      <h1>Welcome to the App</h1>
      <p>Here's a list of your cards</p>
      <ul>
        {cards.map((card) => (
          <li key={card.cardId}>{card.title}</li>
        ))}
      </ul>
    </div>
  );
}
