"use client";

// Replaces the root layout when it fails, so no app styles or theme load:
// inline styles, following the OS color scheme.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" style={{ colorScheme: "light dark" }}>
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <title>Something went wrong · TrackaAI</title>
        <main style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 18 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, fontSize: 14 }}>TrackaAI couldn&apos;t load. Please try again in a moment.</p>
          <button type="button" onClick={() => retry()} style={{ marginTop: 8, padding: "8px 16px", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
