import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { formatPoints } from "../lib/format";

export function PointsHistoryPage() {
  const { user } = useAuth();
  const { locale, messages } = useLanguage();
  const copy = messages.points;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{messages.nav.points}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy.description}</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="h-1 bg-sika-red" />
        <div className="px-6 py-6">
          <p className="text-sm font-medium text-muted">{copy.total}</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums">{formatPoints(user?.totalPoints ?? 0, locale)}</p>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{copy.invoice}</th>
                <th className="px-4 py-3 font-medium">{copy.eyebrow}</th>
                <th className="px-4 py-3 font-medium">{messages.invoices.date}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted">
                  {copy.empty}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
