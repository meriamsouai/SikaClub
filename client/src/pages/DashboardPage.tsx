import { useState, type FormEvent } from "react";
import { Alert } from "../components/Alert";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translateError } from "../i18n/translations";
import { ApiError, changePassword } from "../lib/api";

export function DashboardPage() {
  const { user } = useAuth();
  const { messages } = useLanguage();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<ApiError | string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  function startChangePassword() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSaved(false);
    setChangingPassword(true);
  }

  function cancelChangePassword() {
    setChangingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError(messages.errors.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(messages.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new ApiError(messages.dashboard.passwordFailed));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {user.role === "admin" ? (
        <p className="rounded-md border border-sika-yellow bg-sika-yellow-soft px-4 py-3 text-sm">
          {messages.dashboard.adminNote}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-ink sm:text-3xl">
          {messages.dashboard.profile}
        </h2>

        {saved ? <Alert tone="warning">{messages.dashboard.passwordSaved}</Alert> : null}

        <div className="rounded-lg border border-line bg-white px-6 py-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{messages.auth.firstName}</dt>
              <dd className="mt-1 text-sm">{user.firstName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{messages.auth.surname}</dt>
              <dd className="mt-1 text-sm">{user.surname}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{messages.auth.company}</dt>
              <dd className="mt-1 text-sm">{user.companyName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{messages.auth.email}</dt>
              <dd className="mt-1 text-sm">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{messages.dashboard.phone}</dt>
              <dd className="mt-1 text-sm">{user.phone}</dd>
            </div>
          </dl>
        </div>

        {changingPassword ? null : (
          <button
            type="button"
            onClick={startChangePassword}
            className="inline-flex h-9 items-center justify-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white transition-colors hover:bg-sika-red-dark"
          >
            {messages.dashboard.changePassword}
          </button>
        )}

        {changingPassword ? (
          <form
            className="space-y-4 rounded-lg border border-line bg-white px-6 py-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <h3 className="text-base font-semibold text-ink">{messages.dashboard.changePassword}</h3>
            {error ? (
              <Alert>
                {typeof error === "string"
                  ? error
                  : translateError(error.code, error.message, messages)}
              </Alert>
            ) : null}
            <PasswordField
              label={messages.dashboard.currentPassword}
              name="currentPassword"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              showLabel={messages.auth.showPassword}
              hideLabel={messages.auth.hidePassword}
            />
            <PasswordField
              label={messages.auth.newPassword}
              name="newPassword"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              showLabel={messages.auth.showPassword}
              hideLabel={messages.auth.hidePassword}
            />
            <PasswordField
              label={messages.auth.confirmPassword}
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              showLabel={messages.auth.showPassword}
              hideLabel={messages.auth.hidePassword}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white transition-colors hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? messages.dashboard.savingPassword : messages.dashboard.savePassword}
              </button>
              <button
                type="button"
                onClick={cancelChangePassword}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
              >
                {messages.dashboard.cancel}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
