export type UserRole = "client" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";

export type PublicUser = {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  companyName: string;
  role: UserRole;
  status: AccountStatus;
  totalPoints: number;
  createdAt: string;
};

export type SignupInput = {
  phone: string;
  companyName: string;
  firstName: string;
  surname: string;
  email: string;
};

export type PublicGift = {
  id: string;
  name: string;
  valueTnd: number;
  pointsRequired: number;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicAd = {
  id: string;
  title: string;
  imageUrl: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductTier = {
  minQty: number;
  maxQty: number | null;
  points: number;
};

export type PublicProduct = {
  id: string;
  reference: string;
  name: string;
  imageUrl: string;
  unit: string;
  tiers: ProductTier[];
};

export type InvoiceStatus = "pending" | "approved" | "rejected";

export type PublicInvoice = {
  id: string;
  userId: string;
  userName?: string;
  companyName?: string;
  distributor: string;
  products: Array<{
    productId: string;
    productName: string;
    productReference: string;
    distributor: string;
    quantity: number;
    points: number;
    igolflexSeaux: number;
    igolflexPoints: number;
  }>;
  fileUrl: string;
  fileUrls: string[];
  status: InvoiceStatus;
  estimatedPoints: number;
  pointsAwarded: number;
  reference: string;
  adminNote: string;
  clientProblemReport: string;
  createdAt: string;
  updatedAt: string;
};

export type PointEntryType = "welcome" | "invoice" | "redemption" | "redemption_refund";

export type PublicPointEntry = {
  id: string;
  points: number;
  type: PointEntryType;
  label: string;
  invoiceId?: string;
  giftRedemptionId?: string;
  createdAt: string;
};

export type RedemptionStatus = "en_cours" | "claimed" | "cancelled";

export type PublicGiftRedemption = {
  id: string;
  userId: string;
  userName?: string;
  companyName?: string;
  giftId: string;
  giftName: string;
  giftValueTnd: number;
  pointsSpent: number;
  reference: string;
  status: RedemptionStatus;
  createdAt: string;
  updatedAt: string;
};
