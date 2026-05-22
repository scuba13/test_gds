import type { RequestUser } from './request-user';

declare global {
  namespace Express {
    // Prefer typing the request shape (req.user) we actually use.
    // This avoids relying on Passport's `Express.User`.
    interface User extends RequestUser {}

    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
