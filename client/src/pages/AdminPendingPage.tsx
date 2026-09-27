import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useLanguage } from "../context/LanguageContext";
import { approveAccount, getPendingAccounts, rejectAccount, ApiError } from "../lib/api";
import { translateError } from "../i18n/translations";
import type { PublicUser } from "../types";

type PendingAction = { type: "approve" | "reject"; user: PublicUser };

export function AdminPendingPage() {
  const { messages } = useLanguage();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPendingAccounts();
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeDialog() {
    if (!busy) setPendingAction(null);
  }

  async function runPendingAction() {
    if (!pendingAction) return;
    const { user, type } = pendingAction;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = type === "approve" ? await approveAccount(user.id) : await rejectAccount(user.id);
      setMessage(result.message);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setPendingAction(null);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : messages.admin.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{messages.admin.pending}</h1>
        <p className="mt-2 text-sm text-muted">{messages.admin.pendingDescription}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}
      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{messages.admin.noPending}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{messages.admin.name}</th>
                <th className="px-4 py-3">{messages.auth.company}</th>
                <th className="px-4 py-3">{messages.auth.email}</th>
                <th className="px-4 py-3">{messages.auth.phone}</th>
                <th className="px-4 py-3">{messages.admin.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {user.firstName} {user.surname}
                  </td>
                  <td className="px-4 py-3">{user.companyName}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingAction({ type: "approve", user })}
                        className="rounded-md bg-sika-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
                      >
                        {messages.admin.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPendingAction({ type: "reject", user })}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-60"
                      >
                        {messages.admin.reject}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction?.type === "approve"}
        title={messages.admin.confirmTitle}
        message={messages.admin.approveAccountConfirm}
        confirmLabel={messages.admin.approve}
        cancelLabel={messages.admin.cancel}
        busy={busy}
        onCancel={closeDialog}
        onConfirm={() => void runPendingAction()}
      />
      <ConfirmDialog
        open={pendingAction?.type === "reject"}
        title={messages.admin.confirmTitle}
        message={messages.admin.rejectAccountConfirm}
        confirmLabel={messages.admin.reject}
        cancelLabel={messages.admin.cancel}
        busy={busy}
        tone="danger"
        onCancel={closeDialog}
        onConfirm={() => void runPendingAction()}
      />
    </div>
  );
}
