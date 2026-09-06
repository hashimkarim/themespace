"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="main-shell empty-state">
      <p className="eyebrow">THEMESPACE</p>
      <h1>This page couldn’t open.</h1>
      <p>Please try again in a moment, or return to your Studio.</p>
      <button className="secondary-button" onClick={reset}>
        Try again
      </button>
      <Link className="secondary-button" href="/">
        Open Studio
      </Link>
    </main>
  );
}
