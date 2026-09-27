import type { PublicAd, PublicGift, PublicGiftRedemption, PublicInvoice, PublicPointEntry, PublicProduct, PublicUser, SignupInput, RedemptionStatus, PublicAdminAuditLog } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

/** Prefix relative `/uploads/...` paths with the API host (needed on Vercel). */
export function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("/images/")
  ) {
    return url;
  }
  return `${API_URL}${url}`;
}

export class ApiError extends Error {
  code?: string;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, code?: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
};

type RequestOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

function notifySessionLost() {
  window.dispatchEvent(new CustomEvent("sika:session-lost"));
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function shouldAttemptRefresh(path: string, options: RequestOptions, status: number) {
  if (status !== 401 || options.skipAuthRefresh) return false;
  if (path.startsWith("/api/auth/login")) return false;
  if (path.startsWith("/api/auth/logout")) return false;
  if (path.startsWith("/api/auth/refresh")) return false;
  if (path.startsWith("/api/auth/signup")) return false;
  if (path.startsWith("/api/auth/forgot-password")) return false;
  if (path.startsWith("/api/auth/reset-password")) return false;
  return true;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError(
      "Impossible de joindre le serveur. Vérifiez que l’API est démarrée.",
      "NETWORK",
    );
  }

  if (response.status === 401 && shouldAttemptRefresh(path, options, response.status)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, skipAuthRefresh: true });
    }
    notifySessionLost();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) {
    if (data.code === "UNAUTHENTICATED") {
      notifySessionLost();
    }
    throw new ApiError(
      data.message ?? "Une erreur est survenue.",
      data.code,
      data.fieldErrors,
    );
  }
  return data;
}

export function signup(input: SignupInput) {
  return request<{ message: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(email: string, password: string) {
  return request<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRefresh: true,
  });
}

export function logout() {
  return request<void>("/api/auth/logout", { method: "POST", body: "{}", skipAuthRefresh: true });
}

export function refreshSession() {
  return request<{ user: PublicUser }>("/api/auth/refresh", {
    method: "POST",
    body: "{}",
    skipAuthRefresh: true,
  });
}

export function getMe() {
  return request<{ user: PublicUser }>("/api/auth/me");
}

export function updateProfile(input: SignupInput) {
  return request<{ user: PublicUser }>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function forgotPassword(email: string) {
  return request<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuthRefresh: true,
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
    skipAuthRefresh: true,
  });
}

export function getActiveGifts() {
  return request<{ gifts: PublicGift[] }>("/api/gifts");
}

export function redeemGift(giftId: string) {
  return request<{ redemption: PublicGiftRedemption; message: string }>("/api/gifts/redeem", {
    method: "POST",
    body: JSON.stringify({ giftId }),
  });
}

export function getMyRedemptions() {
  return request<{ redemptions: PublicGiftRedemption[] }>("/api/gifts/redemptions/mine");
}

export function getAdminRedemptions() {
  return request<{ redemptions: PublicGiftRedemption[] }>("/api/gifts/admin/redemptions");
}

export function updateRedemptionStatus(id: string, status: RedemptionStatus) {
  return request<{ redemption: PublicGiftRedemption; message: string }>(
    `/api/gifts/admin/redemptions/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getPendingAccounts() {
  return request<{ users: PublicUser[] }>("/api/admin/accounts/pending");
}

export function approveAccount(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/accounts/${id}/approve`, {
    method: "POST",
    body: "{}",
  });
}

export function rejectAccount(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/accounts/${id}/reject`, {
    method: "POST",
    body: "{}",
  });
}

export function getClients() {
  return request<{ users: PublicUser[] }>("/api/admin/clients");
}

export function banClient(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/clients/${id}/ban`, {
    method: "POST",
    body: "{}",
  });
}

export function unbanClient(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/clients/${id}/unban`, {
    method: "POST",
    body: "{}",
  });
}

export function getLeaderboard() {
  return request<{
    users: Array<PublicUser & { rank: number; lifetimePoints: number; currentPoints: number }>;
  }>("/api/admin/leaderboard");
}

export function getAdminGifts() {
  return request<{ gifts: PublicGift[] }>("/api/admin/gifts");
}

export function createGift(formData: FormData) {
  return request<{ gift: PublicGift }>("/api/admin/gifts", {
    method: "POST",
    body: formData,
  });
}

export function updateGift(id: string, formData: FormData) {
  return request<{ gift: PublicGift }>(`/api/admin/gifts/${id}`, {
    method: "PATCH",
    body: formData,
  });
}

export function hideGift(id: string) {
  return request<{ gift: PublicGift }>(`/api/admin/gifts/${id}/hide`, {
    method: "POST",
    body: "{}",
  });
}

export function restoreGift(id: string) {
  return request<{ gift: PublicGift }>(`/api/admin/gifts/${id}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export function getAds() {
  return request<{ ads: PublicAd[] }>("/api/ads");
}

export function getAdminAds() {
  return request<{ ads: PublicAd[] }>("/api/admin/ads");
}

export function createAd(formData: FormData) {
  return request<{ ad: PublicAd }>("/api/admin/ads", {
    method: "POST",
    body: formData,
  });
}

export function updateAd(id: string, formData: FormData) {
  return request<{ ad: PublicAd }>(`/api/admin/ads/${id}`, {
    method: "PATCH",
    body: formData,
  });
}

export function hideAd(id: string) {
  return request<{ ad: PublicAd }>(`/api/admin/ads/${id}/hide`, {
    method: "POST",
    body: "{}",
  });
}

export function restoreAd(id: string) {
  return request<{ ad: PublicAd }>(`/api/admin/ads/${id}/restore`, {
    method: "POST",
    body: "{}",
  });
}

export function getProducts() {
  return request<{ products: PublicProduct[] }>("/api/invoices/products");
}

export function getMyInvoices() {
  return request<{ invoices: PublicInvoice[] }>("/api/invoices/mine");
}

export function getMyPoints() {
  return request<{ entries: PublicPointEntry[] }>("/api/points/mine");
}

export function submitInvoice(formData: FormData) {
  return request<{ invoice: PublicInvoice; message: string }>("/api/invoices", {
    method: "POST",
    body: formData,
  });
}

export function getPendingInvoices() {
  return request<{ invoices: PublicInvoice[] }>("/api/invoices/admin/pending");
}

export function getReviewedInvoices() {
  return request<{ invoices: PublicInvoice[] }>("/api/invoices/admin/reviewed");
}

export function approveInvoice(id: string, note = "") {
  return request<{ invoice: PublicInvoice; message: string }>(`/api/invoices/admin/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function rejectInvoice(id: string, note = "") {
  return request<{ invoice: PublicInvoice; message: string }>(`/api/invoices/admin/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function getAdminUserPoints(userId: string) {
  return request<{ entries: PublicPointEntry[] }>(`/api/points/admin/user/${userId}`);
}

export function getStaff() {
  return request<{ users: PublicUser[] }>("/api/admin/staff");
}

export function createStaff(body: { firstName: string; surname: string; email: string; phone?: string }) {
  return request<{ user: PublicUser; message: string }>("/api/admin/staff", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function disableStaff(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/staff/${id}/disable`, {
    method: "POST",
    body: "{}",
  });
}

export function enableStaff(id: string) {
  return request<{ user: PublicUser; message: string }>(`/api/admin/staff/${id}/enable`, {
    method: "POST",
    body: "{}",
  });
}

export function getAuditLogs(limit = 100) {
  return request<{ entries: PublicAdminAuditLog[] }>(`/api/admin/audit-logs?limit=${limit}`);
}
