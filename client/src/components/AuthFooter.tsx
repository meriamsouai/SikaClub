import { useLanguage } from "../context/LanguageContext";

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/Sika",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M14.5 8.5V6.8c0-.7.5-1 1.1-1H17V3h-2.2C12.2 3 11 4.4 11 6.6v1.9H9v2.8h2V21h3.2v-9.7h2.2l.3-2.8h-2.2z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/sika_ag/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm8 1.8H8A3.2 3.2 0 0 0 4.8 8v8A3.2 3.2 0 0 0 8 19.2h8a3.2 3.2 0 0 0 3.2-3.2V8A3.2 3.2 0 0 0 16 4.8zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zm4.35-2.55a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@sikagroup",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M22 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C17.9 5 12 5 12 5s-5.9 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9 2 12.2 2 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1c1.6.5 7.5.5 7.5.5s5.9 0 7.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6zM10 15.5v-6.6l5.2 3.3z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/sika",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M6.5 9.5H3.7V20h2.8zM5.1 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM20.3 20h-2.8v-5.6c0-1.6-.6-2.6-2-2.6a2.1 2.1 0 0 0-2 1.4 2.6 2.6 0 0 0-.1.9V20H10.6s.1-9.1 0-10.5h2.8v1.7a3.2 3.2 0 0 1 2.6-1.5c1.9 0 3.3 1.2 3.3 3.9z" />
      </svg>
    ),
  },
] as const;

export function AuthFooter() {
  const { messages } = useLanguage();
  const footer = messages.footer;

  return (
    <footer className="bg-sika-yellow text-ink">
      <div aria-hidden="true" className="h-1.5 bg-sika-red" />
      <div className="mx-auto grid max-w-6xl grid-cols-4 items-start gap-4 px-4 py-5 sm:gap-8 sm:px-8">
        <div>
          <img src="/images/Logo_Sika_AG.svg.webp" alt="Sika" className="h-auto w-16 sm:w-24" />
        </div>
        <address className="not-italic text-xs leading-5 sm:text-sm sm:leading-6">
          <p className="font-semibold">Sika Tunisie</p>
          <p>Zone Industrielle</p>
          <p>2086 Douar Hicher</p>
          <p>{footer.country}</p>
        </address>
        <div className="text-xs leading-5 sm:text-sm sm:leading-6">
          <p>
            {footer.phone}{" "}
            <a href="tel:+21670022700" className="hover:underline">
              +216 700 22 700
            </a>
          </p>
          <p>
            {footer.fax} +216 715 47 130
          </p>
          <p className="break-all">
            {footer.email}{" "}
            <a href="mailto:sika.tunisienne@tn.sika.com" className="hover:underline">
              sika.tunisienne@tn.sika.com
            </a>
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors hover:border-sika-red hover:bg-sika-red hover:text-white"
              >
                {link.icon}
              </a>
            ))}
          </div>
          <a
            href="https://tun.sika.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium hover:underline sm:text-sm"
          >
            tun.sika.com
          </a>
        </div>
      </div>
      <p className="px-4 pb-4 text-center text-sm font-medium">
        <a
          href={footer.legalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {footer.legal}
        </a>
        {` | ${footer.copyright}`}
      </p>
    </footer>
  );
}
