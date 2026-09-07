"use client";

import { UserRound } from "lucide-react";
import { UserButton } from "./auth/user/user-button";
import { useAccountActions } from "./account-provider";

export function AccountButton() {
  const { signOut, signingOut } = useAccountActions();
  return (
    <div className="account-ui header-account">
      <UserButton
        align="end"
        variant="ghost"
        className="account-trigger"
        hideSettings
        onSignOut={signOut}
        signingOut={signingOut}
        links={[
          {
            label: "My account",
            href: "/account",
            icon: <UserRound className="text-muted-foreground" />,
            visibility: "authenticated",
          },
        ]}
      />
    </div>
  );
}
