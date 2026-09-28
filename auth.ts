import { Router } from "express";
import middleware, {
  type Options,
} from "@jtekt/express-authentication-middleware";

import { IDENTIFICATION_URL } from "./config";

// Same setup as the other backends: the user manager identifies every
// request, whether it carries a legacy JWT, an OIDC token or an API key
export const registerAuthMiddleware = (router: Router) => {
  if (!IDENTIFICATION_URL)
    throw new Error("[Auth] IDENTIFICATION_URL not provided");

  const options: Options = {
    strategies: {
      identification: {
        url: IDENTIFICATION_URL,
        identifierField: "_id",
      },
    },
  };

  router.use(middleware(options));
};
