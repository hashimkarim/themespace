"use client";
import { createAuthClient } from "better-auth/react";

// Same-origin requests; Better Auth keeps the session in its HttpOnly cookie.
export const authClient = createAuthClient();
