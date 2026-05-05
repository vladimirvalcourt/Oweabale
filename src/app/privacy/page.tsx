import { MarketingShell } from "@/components/layout/MarketingShell";

const EFFECTIVE_DATE = "May 1, 2026";

export const metadata = {
  title: "Privacy Policy — Oweable",
  description: "How Oweable collects, uses, and protects your personal and financial data.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="px-6 py-20">
        <div className="mx-auto max-w-3xl">

          {/* Page header */}
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-(--color-content)">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-(--color-content-tertiary)">
            Effective date: {EFFECTIVE_DATE}
          </p>

          {/* Intro */}
          <p className="mt-8 text-base leading-relaxed text-(--color-content-secondary)">
            Oweable (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains what data we collect when you use Oweable, how we use it, and the choices you have. By using Oweable you agree to the practices described below.
          </p>

          {/* Divider */}
          <div className="my-10 border-t border-(--color-surface-border)" />

          {/* Sections */}
          <div className="space-y-12">

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">1. Information we collect</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-(--color-content-secondary)">
                <p><span className="font-medium text-(--color-content)">Account information.</span> When you create an account we collect your name and email address through your Google account via OAuth. We do not store your Google password.</p>
                <p><span className="font-medium text-(--color-content)">Financial obligation data.</span> Oweable stores the bills, debts, subscriptions, mileage logs, citations, and tax deductions you enter manually. This data lives in your account and is used only to provide the service.</p>
                <p><span className="font-medium text-(--color-content)">Bank connection data (optional).</span> If you choose to connect a bank account, we use Plaid to retrieve read-only transaction and balance information. We never store your banking credentials. Plaid&apos;s privacy policy governs data collected through their service.</p>
                <p><span className="font-medium text-(--color-content)">Usage data.</span> We collect logs of how you interact with the product (pages visited, features used, error events) to improve reliability and performance. This data is not linked to your financial obligation data.</p>
                <p><span className="font-medium text-(--color-content)">Device and technical data.</span> IP address, browser type, and operating system are collected automatically by our hosting infrastructure for security and abuse prevention.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">2. How we use your information</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-(--color-content-secondary)">
                <li>Provide, maintain, and improve the Oweable service.</li>
                <li>Send account-related emails (payment confirmations, security alerts, trial expiration notices).</li>
                <li>Detect and prevent fraud, abuse, and security incidents.</li>
                <li>Analyze aggregate usage patterns to prioritize product improvements.</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p className="mt-4 text-sm text-(--color-content-secondary)">
                We do not sell your personal data. We do not use your financial obligation data to train machine learning models or serve advertising.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">3. Data sharing and third parties</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-(--color-content-secondary)">
                <p><span className="font-medium text-(--color-content)">Supabase.</span> We use Supabase to host our database and handle authentication. Your data is stored in Supabase&apos;s managed PostgreSQL infrastructure with encryption at rest and in transit.</p>
                <p><span className="font-medium text-(--color-content)">Plaid (optional).</span> If you connect a bank account, your credentials are handled directly by Plaid and are never transmitted to Oweable servers.</p>
                <p><span className="font-medium text-(--color-content)">Vercel.</span> Our application is hosted on Vercel. Vercel may process request logs as part of serving the application.</p>
                <p><span className="font-medium text-(--color-content)">Legal requirements.</span> We may disclose your information if required to do so by law or in response to valid legal process.</p>
                <p>We do not share your data with any third party for advertising, marketing, or data-broker purposes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">4. Data retention</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                We retain your account and financial obligation data for as long as your account is active. If you delete your account, we delete your personal data within 30 days, except where retention is required by law. Anonymized, aggregate analytics data may be retained indefinitely.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">5. Security</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                All data is encrypted in transit using TLS 1.2+. Data at rest is encrypted by our database provider. We implement row-level security so that your data is never accessible to other users. We support multi-factor authentication (MFA) for additional account protection.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">6. Your rights</h2>
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>Depending on your location, you may have the following rights regarding your personal data:</p>
                <ul className="mt-3 list-inside list-disc space-y-2">
                  <li><span className="font-medium text-(--color-content)">Access.</span> Request a copy of the data we hold about you.</li>
                  <li><span className="font-medium text-(--color-content)">Correction.</span> Ask us to correct inaccurate information.</li>
                  <li><span className="font-medium text-(--color-content)">Deletion.</span> Request deletion of your account and personal data.</li>
                  <li><span className="font-medium text-(--color-content)">Portability.</span> Request an export of your data in a machine-readable format.</li>
                  <li><span className="font-medium text-(--color-content)">Objection.</span> Object to certain processing activities.</li>
                </ul>
                <p className="mt-3">To exercise any of these rights, email us at <span className="text-(--color-content)">privacy@oweable.com</span>.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">7. Cookies</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Oweable uses a small number of essential cookies required for authentication and session management. We do not use tracking cookies or advertising cookies. You can disable cookies in your browser settings, but doing so will prevent you from staying signed in.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">8. Children&apos;s privacy</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Oweable is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. If we become aware that we have collected data from a child under 13, we will delete that information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">9. Changes to this policy</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before the changes take effect. Continued use of Oweable after that period constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">10. Contact</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Questions about this Privacy Policy? Email us at{" "}
                <a href="mailto:privacy@oweable.com" className="text-(--color-accent) hover:underline">
                  privacy@oweable.com
                </a>
                .
              </p>
            </section>

          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
