"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./page.module.css";

type AuthControlsProps = {
  isSignedIn: boolean;
};

export function AuthControls({ isSignedIn }: AuthControlsProps) {
  const [authError, setAuthError] = useState<string | null>(null);

  async function signIn() {
    setAuthError(null);

    const result = await authClient.signIn.oauth2({
      providerId: "yoto",
    });

    if (result.error) {
      setAuthError(result.error.message ?? "Sign in failed");
    }
  }

  function signOut() {
    setAuthError(null);
    authClient.signOut({
      fetchOptions: {
        onError(context) {
          setAuthError(context.error.message ?? "Sign out failed");
        },
        onSuccess() {
          window.location.href = "/";
        },
      },
    });
  }

  return (
    <>
      <button
        className={styles.primary}
        onClick={isSignedIn ? signOut : signIn}
        type="button"
      >
        {isSignedIn ? "Sign out" : "Sign in with Yoto"}
      </button>
      {authError && <p>{authError}</p>}
    </>
  );
}
