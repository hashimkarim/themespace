"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="main-shell page-state">
      <div className="panel page-state-card">
        <span className="brand-mark" aria-hidden="true" />
        <p className="eyebrow">THEMESPACE</p>
        <h1>This page couldn’t open.</h1>
        <p>Please try again in a moment, or return to your Studio.</p>
        <div className="page-state-actions">
          <button className="primary-button" onClick={reset}>
            Try again
          </button>
          <Link className="secondary-button" href="/">
            Open Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
