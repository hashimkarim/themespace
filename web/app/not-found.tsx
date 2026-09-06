import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-shell empty-state">
      <p className="eyebrow">THEMESPACE</p>
      <h1>That theme isn’t here.</h1>
      <p>Explore the collection to find a new starting point.</p>
      <Link className="secondary-button" href="/explore">
        Explore themes
      </Link>
    </main>
  );
}
