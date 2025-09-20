// Express type augmentation za req.user support
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        fullName?: string;
        role: string;
        technicianId?: number;
        email?: string;
        phone?: string;
      };
    }
  }
}

export {};