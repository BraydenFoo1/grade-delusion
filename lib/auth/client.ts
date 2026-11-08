"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin: the browser talks to /api/auth on whatever host served the page, so previews,
// localhost and production all work without configuration.
export const authClient = createAuthClient();
