import type { RequestUser } from './request-user';

declare global {
  namespace Express {
    interface User extends RequestUser {}
  }
}

export {};
