import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-shell page-state">
      <div className="panel page-state-card">
        <span className="brand-mark" aria-hidden="true" />
        <p className="eyebrow">THEMESPACE</p>
        <h1>This page isn’t here.</h1>
        <p>Explore the collection to find a new starting point.</p>
        <div className="page-state-actions">
          <Link className="secondary-button" href="/explore">
            Explore themes
          </Link>
          <Link className="primary-button" href="/">
            Open Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
