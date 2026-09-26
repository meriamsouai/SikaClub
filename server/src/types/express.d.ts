import type { UserDocument } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      authUser?: UserDocument;
    }
  }
}

export {};
