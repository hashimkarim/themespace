"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, LogOut } from "lucide-react";
import { useSession } from "@better-auth-ui/react";
import { SignIn } from "@/components/auth/sign-in";
import { SignUp } from "@/components/auth/sign-up";
import { UserProfile } from "@/components/auth/settings/account/user-profile";
import { ChangePassword } from "@/components/auth/settings/security/change-password";
import { Button } from "@/components/auth-ui/button";
import { useAccountActions } from "./account-provider";
import { authClient } from "@/lib/auth-client";
import type { AccountUser } from "@/lib/account";

type AccountPageProps = {
  user: AccountUser | null;
  loaded: boolean;
  onUserChange: (user: AccountUser) => void;
};

export function AccountPage(props: AccountPageProps) {
  if (!props.loaded)
    return (
      <div className="account-loading" role="status">
        <LoaderCircle size={20} className="spin" /> Opening your account…
      </div>
    );
  return (
    <div className="account-ui">
      <AccountContent {...props} />
    </div>
  );
}

function AccountContent({ user, onUserChange }: AccountPageProps) {
  const pathname = usePathname();
  const { data: session } = useSession(authClient);
  const { signOut, signingOut, signOutError } = useAccountActions();

  useEffect(() => {
    if (
      user &&
      session?.user.id === user.id &&
      (session.user.name !== user.displayName ||
        session.user.email !== user.email)
    ) {
      onUserChange({
        ...user,
        displayName: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      });
    }
  }, [session, user, onUserChange]);

  if (!user)
    return (
      <div className="account-entry">
        <div className="account-intro">
          <p className="eyebrow">YOUR COLORS, WITH YOU</p>
          <h1>A home for your themes.</h1>
          <p className="subheading">
            Save your draft across devices and share your favorite palettes with
            the community.
          </p>
          <ul className="account-benefits">
            <li>
              <Check size={17} /> A private, saved workspace
            </li>
            <li>
              <Check size={17} /> Your published themes in Explore
            </li>
            <li>
              <Check size={17} /> All the same open, portable exports
            </li>
          </ul>
          <Link className="text-button" href="/">
            Keep creating as a guest <ArrowRight size={15} />
          </Link>
        </div>
        <div className="account-access">
          {pathname === "/account/sign-up" ? (
            <SignUp className="account-auth-card" />
          ) : (
            <SignIn className="account-auth-card" />
          )}
          <p className="account-footnote">
            Your guest draft stays in this browser while you sign in.
          </p>
        </div>
      </div>
    );

  return (
    <>
      <div className="studio-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE, YOUR ACCOUNT</p>
          <h1>Make yourself at home, {user.displayName}.</h1>
          <p className="subheading account-email">{user.email}</p>
        </div>
      </div>
      <div className="account-settings">
        <UserProfile />
        <ChangePassword />
        <section className="panel account-card account-sign-out">
          <div>
            <h2>Done for now?</h2>
            <p>Your draft is saved to your account before you sign out.</p>
            {signOutError && (
              <p className="account-feedback error" role="alert">
                {signOutError}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={signOut} disabled={signingOut}>
            {signingOut ? <LoaderCircle className="spin" /> : <LogOut />}
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </section>
      </div>
    </>
  );
}
