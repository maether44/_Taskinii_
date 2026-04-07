'use client';

/* ----------------------------------------------------------
   FOOTER
   4-column grid: Logo+social, Product, Company, Support.
   Border-top: lime #C8F135.
   Column headers: Inter 500, 11px, uppercase, lime.
   Links: Inter 400, 14px, muted → white on hover.
   Bottom bar: copyright + "Made with AI" lime-border pill.
   ---------------------------------------------------------- */

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#plans' },
    { label: 'Download App', href: '#download' },
  ],
  Support: [
    { label: 'Help Center', href: '#help' },
    { label: 'Contact', href: '#contact' },
    { label: 'Privacy Policy', href: '#privacy' },
    { label: 'Terms of Service', href: '#terms' },
  ],
};


function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--bq-muted)',
          textDecoration: 'none',
          lineHeight: 1,
          transition: 'color 150ms ease',
          display: 'inline-block',
          paddingBottom: '12px',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-white)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--bq-muted)'; }}
      >
        {children}
      </a>
    </li>
  );
}

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bq-black)',
        borderTop: `1px solid var(--bq-lime)`,
      }}
    >
      {/* Main grid */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '72px 24px 48px',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr',
          gap: '48px',
        }}
        className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* ── Column 1: Brand ── */}
        <div>
          {/* Logotype */}
          <a
            href="/"
            aria-label="BodyQ home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: '22px',
                color: 'var(--bq-white)',
              }}
            >
              BodyQ
            </span>
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--bq-lime)',
                display: 'block',
              }}
            />
          </a>

          {/* Tagline */}
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: '14px',
              color: 'var(--bq-muted)',
              lineHeight: 1.65,
              maxWidth: '220px',
            }}
          >
            Train Smarter. Move Better. Live Longer.
          </p>
        </div>

        {/* ── Columns 2-4: Link groups ── */}
        {Object.entries(FOOTER_LINKS).map(([category, links]) => (
          <div key={category}>
            {/* Column header */}
            <div
              style={{
                fontFamily: 'var(--font-inter)',
                fontWeight: 500,
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--bq-lime)',
                marginBottom: '20px',
              }}
            >
              {category}
            </div>
            <ul style={{ listStyle: 'none' }}>
              {links.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>
        ))}
      </div>

    </footer>
  );
}
