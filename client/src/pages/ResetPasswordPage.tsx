import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { useLanguage } from "../context/LanguageContext";
import { translateError } from "../i18n/translations";
import { ApiError, resetPassword } from "../lib/api";

export function ResetPasswordPage() {
  const { messages } = useLanguage();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError(messages.auth.missingResetToken);
      return;
    }
    if (password.length < 8) {
      setError(messages.errors.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(messages.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(messages.errors.invalidResetToken);
      setError(translateError(apiError.code, apiError.message, messages));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title={messages.auth.resetTitle}>
        <Alert tone="warning">{messages.auth.resetDone}</Alert>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-sika-red-dark hover:underline">
            {messages.auth.signInButton}
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={messages.auth.resetTitle} description={messages.auth.resetDescription}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error ? <Alert>{error}</Alert> : null}
        <PasswordField
          large
          label={messages.auth.newPassword}
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          showLabel={messages.auth.showPassword}
          hideLabel={messages.auth.hidePassword}
        />
        <PasswordField
          large
          label={messages.auth.confirmPassword}
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          showLabel={messages.auth.showPassword}
          hideLabel={messages.auth.hidePassword}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-sika-red px-4 text-lg font-semibold text-white transition-colors hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? messages.auth.resetting : messages.auth.resetButton}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-sika-red-dark hover:underline">
          {messages.auth.backToLogin}
        </Link>
      </p>
    </AuthLayout>
  );
}
