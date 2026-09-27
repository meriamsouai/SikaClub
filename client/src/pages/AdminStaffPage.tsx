import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { TextField } from "../components/TextField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ApiError, createStaff, disableStaff, enableStaff, getStaff } from "../lib/api";
import { isSuperAdmin } from "../lib/roles";
import { translateError } from "../i18n/translations";
import type { PublicUser } from "../types";

const emptyForm = {
  firstName: "",
  surname: "",
  email: "",
  phone: "",
};

export function AdminStaffPage() {
  const { user } = useAuth();
  const { messages } = useLanguage();
  const copy = messages.admin;
  const [staff, setStaff] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStaff();
      setStaff(result.users);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, messages]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSuperAdmin(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createStaff({
        firstName: form.firstName.trim(),
        surname: form.surname.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });
      setMessage(result.message || copy.staffCreated);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.actionFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(member: PublicUser) {
    setError(null);
    setMessage(null);
    try {
      if (member.status === "disabled") {
        const result = await enableStaff(member.id);
        setMessage(result.message || copy.staffEnabled);
      } else {
        const result = await disableStaff(member.id);
        setMessage(result.message || copy.staffDisabled);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.code, err.message, messages) : copy.actionFailed);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.staff}</h1>
        <p className="mt-2 text-sm text-muted">{copy.staffDescription}</p>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="warning">{message}</Alert> : null}

      <form className="space-y-4 rounded-lg border border-line bg-white p-5" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold text-ink">{copy.addStaff}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={messages.auth.firstName}
            name="firstName"
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            required
          />
          <TextField
            label={messages.auth.surname}
            name="surname"
            value={form.surname}
            onChange={(event) => setForm((current) => ({ ...current, surname: event.target.value }))}
            required
          />
        </div>
        <TextField
          label={copy.staffEmail}
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          required
        />
        <TextField
          label={copy.staffPhone}
          name="phone"
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-md bg-sika-red px-4 text-sm font-semibold text-white hover:bg-sika-red-dark disabled:opacity-60"
        >
          {submitting ? copy.saving : copy.createStaff}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">{messages.nav.loading}</p>
      ) : staff.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">{copy.noStaff}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{copy.name}</th>
                <th className="px-4 py-3">{copy.staffEmail}</th>
                <th className="px-4 py-3">{copy.status}</th>
                <th className="px-4 py-3">{messages.auth.phone}</th>
                <th className="px-4 py-3">{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {member.firstName} {member.surname}
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {member.role === "super_admin" ? copy.roleSuperAdmin : copy.roleAdmin}
                    </span>
                  </td>
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3">{copy.statusLabels[member.status]}</td>
                  <td className="px-4 py-3">{member.phone}</td>
                  <td className="px-4 py-3">
                    {member.role === "super_admin" || member.id === user?.id ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void toggle(member)}
                        className="text-sm font-semibold text-sika-red-dark hover:underline"
                      >
                        {member.status === "disabled" ? copy.enableStaff : copy.disableStaff}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
