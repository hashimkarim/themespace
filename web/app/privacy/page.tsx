import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ThemeSpace",
  description:
    "How ThemeSpace and the ThemeSpace Companion browser extension handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          themespace<span className="beta">BETA</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Studio</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/integrations">Integrations</Link>
          <Link href="/components">Components</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <div className="header-right">
          <Link className="secondary-button" href="/">
            Open Studio
          </Link>
        </div>
      </header>
      <main className="main-shell privacy-page">
        <article className="panel privacy-card">
          <p className="eyebrow">PRIVACY POLICY</p>
          <h1>ThemeSpace &amp; ThemeSpace Companion</h1>
          <p className="subheading">Last updated: November 2026</p>

          <section>
            <h2>Summary</h2>
            <p>
              ThemeSpace and the ThemeSpace Companion browser extension do not
              run analytics, advertising trackers, or third-party telemetry, and
              never sell or share your data with third parties.
            </p>
          </section>

          <section>
            <h2>ThemeSpace Companion browser extension</h2>
            <ul>
              <li>
                <strong>No browsing history collection:</strong> The extension
                does not collect, log, or transmit your browsing history, page
                contents, or personal information.
              </li>
              <li>
                <strong>On-demand page access:</strong> Previewing a theme or
                picking up a site&rsquo;s colors runs locally in your browser
                using <code>activeTab</code> only when you click the extension.
                Per-site host permission is requested only if you choose{" "}
                <em>Always use this theme here</em>, and is removed when you
                unpin that site.
              </li>
              <li>
                <strong>Local storage first:</strong> Picked-up website themes,
                pinned site preferences, and your cached live Studio draft stay
                in local browser storage on your device. A picked-up palette is
                sent to <code>themespace.app</code> only when you explicitly
                click <em>Open in ThemeSpace</em> to edit or publish it.
              </li>
              <li>
                <strong>Single-origin sync:</strong> The extension only
                communicates with <code>https://themespace.app</code> to read
                published community themes, check whether you are signed in,
                sync your Studio draft while you edit, and hand off themes you
                choose to open in Studio.
              </li>
            </ul>
          </section>

          <section>
            <h2>ThemeSpace web application</h2>
            <ul>
              <li>
                <strong>Guest use:</strong> You can design, preview, extract
                palettes from images (processed locally on your device), and
                export themes without an account. Guest drafts and site
                preferences are stored locally in your browser.
              </li>
              <li>
                <strong>Optional accounts:</strong> If you create an account on{" "}
                <code>themespace.app</code>, we store your display name, email
                address, securely hashed password, session cookie, private saved
                draft, and any themes you explicitly publish to the Explore
                collection.
              </li>
              <li>
                <strong>Published themes:</strong> Themes you choose to publish
                are public, versioned snapshots visible to anyone visiting
                ThemeSpace.
              </li>
            </ul>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              ThemeSpace is created by{" "}
              <a
                href="https://hashimkarim.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hashim Karim
              </a>
              . Questions or data deletion requests can be sent via{" "}
              <a
                href="https://github.com/hashimkarim/themespace/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>{" "}
              or{" "}
              <a
                href="https://hashimkarim.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                hashimkarim.com
              </a>
              .
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
