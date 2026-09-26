import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translateError } from "../i18n/translations";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const { messages } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === "admin" ? "/admin" : "/factures/nouvelle", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(messages.auth.loginFailed));
    } finally {
      setSubmitting(false);
    }
  }

  const tone = error?.code === "PENDING" || error?.code === "PASSWORD_NOT_SET" ? "warning" : "error";

  return (
    <AuthLayout title={messages.auth.signIn} compact>
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        {error ? <Alert tone={tone}>{translateError(error.code, error.message, messages)}</Alert> : null}
        <div className="space-y-5">
          <TextField
            large
            label={messages.auth.email}
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <PasswordField
            large
            label={messages.auth.password}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            showLabel={messages.auth.showPassword}
            hideLabel={messages.auth.hidePassword}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="!mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-sika-red px-4 text-lg font-semibold text-white transition-colors hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? messages.auth.signingIn : messages.auth.signInButton}
        </button>
        <div className="text-center">
          <Link to="/forgot-password" className="text-sm font-semibold text-sika-red-dark hover:underline">
            {messages.auth.forgotPassword}
          </Link>
        </div>
        <div aria-hidden="true" className="h-px bg-ink/20" />
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-ink">{messages.auth.noAccount}</p>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center justify-center rounded-md bg-sika-yellow px-4 text-sm font-semibold text-ink transition-colors hover:bg-sika-yellow/80"
          >
            {messages.auth.signUp}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
