import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { translateError, translateText } from "../i18n/translations";
import { ApiError } from "../lib/api";
import type { SignupInput } from "../types";

const emptyForm: SignupInput = {
  phone: "",
  companyName: "",
  firstName: "",
  surname: "",
  email: "",
};

function firstError(
  errors: Record<string, string[]> | undefined,
  field: keyof SignupInput,
  messages: Parameters<typeof translateText>[1],
) {
  const message = errors?.[field]?.[0];
  return message ? translateText(message, messages) : undefined;
}

export function SignupPage() {
  const { signup } = useAuth();
  const { messages } = useLanguage();
  const [form, setForm] = useState<SignupInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof SignupInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    setSubmitting(true);
    try {
      await signup({
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim(),
        surname: form.surname.trim(),
        email: form.email.trim(),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError(messages.auth.signupFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title={messages.auth.requestSent} description={messages.auth.requestSaved}>
        <Alert tone="warning">{messages.auth.requestSaved}</Alert>
        <p className="mt-6 text-sm">
          <Link to="/login" className="font-semibold text-sika-red-dark hover:underline">
            {messages.auth.backToLogin}
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={messages.auth.requestAccessTitle} compact>
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        {error && !fieldErrors ? <Alert>{translateError(undefined, error, messages)}</Alert> : null}
        <div className="space-y-5">
          <TextField
            large
            requiredMark
            required
            label={messages.auth.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            error={firstError(fieldErrors, "phone", messages)}
          />
          <TextField
            large
            label={`${messages.auth.company} (${messages.auth.optional})`}
            name="companyName"
            autoComplete="organization"
            value={form.companyName}
            onChange={(event) => update("companyName", event.target.value)}
            error={firstError(fieldErrors, "companyName", messages)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              large
              requiredMark
              required
              label={messages.auth.firstName}
              name="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              error={firstError(fieldErrors, "firstName", messages)}
            />
            <TextField
              large
              requiredMark
              required
              label={messages.auth.surname}
              name="surname"
              autoComplete="family-name"
              value={form.surname}
              onChange={(event) => update("surname", event.target.value)}
              error={firstError(fieldErrors, "surname", messages)}
            />
          </div>
          <div>
            <TextField
              large
              requiredMark
              required
              label={messages.auth.email}
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              error={firstError(fieldErrors, "email", messages)}
            />
            <p className="mt-2 text-sm leading-5 text-ink/70">{messages.auth.emailPasswordNote}</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="!mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-sika-red px-4 text-lg font-semibold text-white transition-colors hover:bg-sika-red-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? messages.auth.sending : messages.auth.sendRequest}
        </button>
        <div aria-hidden="true" className="h-px bg-ink/20" />
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-ink">{messages.auth.alreadyAccount}</p>
          <Link
            to="/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-sika-yellow px-4 text-sm font-semibold text-ink transition-colors hover:bg-sika-yellow/80"
          >
            {messages.auth.signInButton}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
