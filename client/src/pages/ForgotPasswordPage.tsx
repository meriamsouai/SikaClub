import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { TextField } from "../components/TextField";
import { useLanguage } from "../context/LanguageContext";
import { translateError } from "../i18n/translations";
import { ApiError, forgotPassword } from "../lib/api";

export function ForgotPasswordPage() {
  const { messages } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await forgotPassword(email.trim());
      setResetUrl(result.resetUrl ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(messages.auth.signupFailed));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title={messages.auth.forgotTitle}>
        <Alert tone="warning">{messages.auth.forgotSent}</Alert>
        {resetUrl ? (
          <p className="mt-4 text-sm leading-6 text-ink/80">
            {messages.auth.devResetHint}{" "}
            <a href={resetUrl} className="break-all font-semibold text-sika-red-dark hover:underline">
              {resetUrl}
            </a>
          </p>
        ) : null}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-sika-red-dark hover:underline">
            {messages.auth.backToLogin}
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={messages.auth.forgotTitle} description={messages.auth.forgotDescription}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error ? <Alert>{translateError(error.code, error.message, messages)}</Alert> : null}
        <TextField
          large
          label={messages.auth.email}
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-sika-red px-4 text-lg font-semibold text-white transition-colors hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? messages.auth.sendingReset : messages.auth.sendResetLink}
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
