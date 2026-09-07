"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { authMutationKeys } from "@better-auth-ui/core";
import { useSignOut } from "@better-auth-ui/react";
import {
  matchMutation,
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/auth-ui/sonner";
import { TooltipProvider } from "@/components/auth-ui/tooltip";
import { authClient } from "@/lib/auth-client";

type AccountActions = {
  signOut: () => Promise<void>;
  signingOut: boolean;
  signOutError: string;
};
const AccountActionsContext = createContext<AccountActions | null>(null);
export function useAccountActions() {
  const actions = useContext(AccountActionsContext);
  if (!actions) throw new Error("Account controls need an AccountProvider.");
  return actions;
}

function navigateAccount({ to, replace }: { to: string; replace?: boolean }) {
  // Better Auth UI can read redirectTo from the URL; keep it on this app.
  let destination = new URL("/", window.location.origin);
  try {
    const requested = new URL(to, window.location.origin);
    if (
      requested.origin === window.location.origin &&
      !requested.username &&
      !requested.password
    )
      destination = requested;
  } catch {}
  // A new identity must load its own workspace and saved draft.
  if (replace) window.location.replace(destination.href);
  else window.location.assign(destination.href);
}

type AccountProviderProps = {
  children: ReactNode;
  beforeSignIn: () => boolean;
  beforeSignOut: () => Promise<void>;
  onSessionTransition: (active: boolean) => void;
};

export function AccountProvider({
  children,
  beforeSignIn,
  ...actions
}: AccountProviderProps) {
  const { onSessionTransition } = actions;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
        mutationCache: new MutationCache({
          onMutate: (_variables, mutation) => {
            if (
              matchMutation(
                { mutationKey: authMutationKeys.signIn.all },
                mutation,
              ) ||
              matchMutation(
                { mutationKey: authMutationKeys.signUp.all },
                mutation,
              )
            )
              onSessionTransition(true);
          },
          onError: (_error, _variables, _result, mutation) => {
            if (
              matchMutation(
                { mutationKey: authMutationKeys.signIn.all },
                mutation,
              ) ||
              matchMutation(
                { mutationKey: authMutationKeys.signUp.all },
                mutation,
              )
            )
              onSessionTransition(false);
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        authClient={authClient}
        basePaths={{ auth: "/account" }}
        redirectTo="/"
        navigate={(options) => {
          if (
            ["/account/sign-in", "/account/sign-up"].includes(
              options.to.split("?")[0],
            ) &&
            !beforeSignIn()
          )
            return;
          navigateAccount(options);
        }}
        Link={Link}
        avatar={{ enabled: false }}
        emailAndPassword={{
          enabled: true,
          name: true,
          rememberMe: true,
          confirmPassword: true,
          minPasswordLength: 8,
          maxPasswordLength: 128,
          requireEmailVerification: false,
          forgotPassword: false,
        }}
        localization={{
          auth: { name: "Display name", signUp: "Create account" },
        }}
      >
        <TooltipProvider>
          <AccountActionsProvider {...actions}>
            {children}
          </AccountActionsProvider>
          <div className="account-ui">
            <Toaster closeButton />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AccountActionsProvider({
  children,
  beforeSignOut,
  onSessionTransition,
}: Omit<AccountProviderProps, "beforeSignIn">) {
  const { mutateAsync: endSession } = useSignOut(authClient);
  const busy = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  async function signOut() {
    if (busy.current) return;
    busy.current = true;
    setSigningOut(true);
    setSignOutError("");
    onSessionTransition(true);
    try {
      await beforeSignOut();
      await endSession({});
      navigateAccount({ to: "/" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not sign out. Please try again.";
      busy.current = false;
      onSessionTransition(false);
      setSigningOut(false);
      setSignOutError(message);
      toast.error(message);
    }
  }
  return (
    <AccountActionsContext value={{ signOut, signingOut, signOutError }}>
      {children}
    </AccountActionsContext>
  );
}
