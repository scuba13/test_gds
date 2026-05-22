import type { RequestUser } from './request-user';

declare global {
  namespace Express {
    // Prefer typing the request shape (req.user) we actually use.
    // This avoids relying on Passport's `Express.User`.
    // Merge into Express.User with a type alias to avoid no-empty-object-type.
    type User = RequestUser;

    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
