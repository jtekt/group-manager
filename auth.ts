import { NextFunction, Request, Response, Router } from "express";

import legacyAuth from "@moreillon/express_identification_middleware";
import oidcAuth from "@moreillon/express-oidc";
import apiKeyAuth from "@jtekt/express-api-key-middleware";

import {
  OIDC_JWKS_URI,
  IDENTIFICATION_URL,
  API_KEY_MANAGER_URL,
  AUTH_USER_ID_FIELDS,
} from "./config";

export const registerAuthMiddleware = (router: Router) => {
  let legacyMiddleware: ReturnType<typeof legacyAuth> | null = null;
  let oidcMiddleware: ReturnType<typeof oidcAuth> | null = null;
  let apiKeyMiddleware: ReturnType<typeof apiKeyAuth> | null = null;

  if (IDENTIFICATION_URL) {
    console.log(`[Auth] Legacy auth enabled with URL: ${IDENTIFICATION_URL}`);

    legacyMiddleware = legacyAuth({
      url: IDENTIFICATION_URL,
    });
  }

  if (OIDC_JWKS_URI) {
    console.log(`[Auth] OIDC auth enabled with JWKS URI: ${OIDC_JWKS_URI}`);

    oidcMiddleware = oidcAuth({
      jwksUri: OIDC_JWKS_URI,
    });
  }

  if (API_KEY_MANAGER_URL) {
    console.log(
      `[Auth] API Key auth enabled with validation URL: ${API_KEY_MANAGER_URL}`,
    );

    apiKeyMiddleware = apiKeyAuth({
      url: `${API_KEY_MANAGER_URL}/validate`,
      userIdFieldName: AUTH_USER_ID_FIELDS?.split(",")[0],
    });
  }

  const hasAuth = !!legacyMiddleware || !!oidcMiddleware || !!apiKeyMiddleware;

  if (!hasAuth) {
    throw new Error(
      "[Auth] No authentication configured. Set IDENTIFICATION_URL, OIDC_JWKS_URI, or API_KEY_MANAGER_URL",
    );
  }

  router.use((req: Request, res: Response, next: NextFunction) => {
    // API Key authentication
    if (apiKeyMiddleware && req.headers["x-api-key"]) {
      return apiKeyMiddleware(req, res, next);
    }

    // JWT authentication
    // Route to the correct middleware based on the JWT header's kid field.
    // Legacy JWTs never carry a kid; OIDC JWTs always do (required for JWKS
    // key lookup). This lets us avoid running both middlewares on every request.
    const token = req.headers.authorization?.split(" ")[1];

    let hasKid = false;

    if (token) {
      try {
        const header = JSON.parse(
          Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
        );

        hasKid = !!header.kid;
      } catch {
        // Malformed token — let the selected middleware produce the error
      }
    }

    if (hasKid && oidcMiddleware) {
      return oidcMiddleware(req, res, next);
    }

    if (legacyMiddleware) {
      return legacyMiddleware(req, res, next);
    }

    return res.status(401).json({
      message: "Unauthorized",
    });
  });
};
