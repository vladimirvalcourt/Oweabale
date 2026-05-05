import { MarketingShell } from "@/components/layout/MarketingShell";

const EFFECTIVE_DATE = "May 1, 2026";

export const metadata = {
  title: "Terms of Service — Oweable",
  description: "The terms governing your use of the Oweable financial obligation management service.",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="px-6 py-20">
        <div className="mx-auto max-w-3xl">

          {/* Page header */}
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-(--color-accent)">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-(--color-content)">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-(--color-content-tertiary)">
            Effective date: {EFFECTIVE_DATE}
          </p>

          <p className="mt-8 text-base leading-relaxed text-(--color-content-secondary)">
            Please read these Terms of Service (&quot;Terms&quot;) carefully before using Oweable. By creating an account or using the service you agree to be bound by these Terms. If you do not agree, do not use Oweable.
          </p>

          <div className="my-10 border-t border-(--color-surface-border)" />

          <div className="space-y-12">

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">1. The service</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Oweable is a financial obligation management tool that helps individuals track bills, debts, subscriptions, mileage, citations, and tax deductions in one place. Oweable is a personal finance tool, not a financial advisor, broker, or bank. Nothing in the service constitutes financial, tax, or legal advice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">2. Accounts and eligibility</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>You must be at least 13 years old to use Oweable. By creating an account you represent that you meet this requirement.</p>
                <p>You are responsible for keeping your account credentials secure and for all activity that occurs under your account. Notify us immediately at <span className="text-(--color-content)">support@oweable.com</span> if you suspect unauthorized access.</p>
                <p>You may only create one account per person. Accounts are non-transferable.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">3. Free trial and subscription</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p><span className="font-medium text-(--color-content)">Free trial.</span> New accounts receive a 14-day free trial with full access to all features. No credit card is required to start the trial.</p>
                <p><span className="font-medium text-(--color-content)">Paid subscription.</span> After your trial period, continued use of Oweable requires an active paid subscription. Subscription fees and billing cycles are shown on the pricing page at the time of purchase.</p>
                <p><span className="font-medium text-(--color-content)">Cancellation.</span> You may cancel your subscription at any time from the Settings → Billing page. Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial billing periods.</p>
                <p><span className="font-medium text-(--color-content)">Pricing changes.</span> We may change subscription prices with at least 30 days&apos; notice. Price changes take effect at the next billing cycle.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">4. Acceptable use</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>You agree to use Oweable only for lawful purposes and in accordance with these Terms. You must not:</p>
                <ul className="mt-2 list-inside list-disc space-y-1.5">
                  <li>Use the service to track financial obligations on behalf of others without their consent.</li>
                  <li>Attempt to reverse-engineer, scrape, or extract data from the service by automated means.</li>
                  <li>Introduce malware, viruses, or other harmful code.</li>
                  <li>Attempt to gain unauthorized access to other users&apos; accounts or our systems.</li>
                  <li>Use the service in any way that violates applicable laws or regulations.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">5. Your data</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>You own all financial obligation data you enter into Oweable. You grant us a limited license to store and process that data solely for the purpose of providing the service.</p>
                <p>You can export your data at any time from the Settings page. If you delete your account, we will delete your data within 30 days as described in our Privacy Policy.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">6. Intellectual property</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                All intellectual property in the Oweable application — including the software, design, branding, and content we create — belongs to Oweable. These Terms do not grant you any right to use our trademarks, logos, or brand materials without written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">7. Third-party services</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Oweable integrates with third-party services including Plaid (bank connections) and Google (authentication). Your use of those services is governed by their respective terms and privacy policies. We are not responsible for the practices of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">8. Disclaimers</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>Oweable is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not warrant that the service will be error-free, uninterrupted, or free of security vulnerabilities.</p>
                <p>Financial information displayed in Oweable is based on data you enter or that is retrieved from connected accounts. We make no representation about the accuracy of that data or its suitability for any purpose, including tax preparation.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">9. Limitation of liability</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                To the maximum extent permitted by law, Oweable&apos;s total liability to you for any claim arising from or related to the service is limited to the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) $50 USD. In no event will we be liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits or data, even if advised of the possibility of such damages.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">10. Termination</h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-(--color-content-secondary)">
                <p>You may close your account at any time. We may suspend or terminate your account if you violate these Terms or if we reasonably believe your use poses a security risk to other users or the platform.</p>
                <p>Upon termination, your right to use the service ends immediately. Data deletion is handled as described in our Privacy Policy.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">11. Governing law</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                These Terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles. Any disputes arising from these Terms will be resolved in the state or federal courts located in Florida.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">12. Changes to these terms</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                We may update these Terms from time to time. We will notify you of material changes at least 14 days before they take effect via email or an in-app notice. Continued use of Oweable after the effective date means you accept the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight text-(--color-content)">13. Contact</h2>
              <p className="mt-4 text-sm leading-relaxed text-(--color-content-secondary)">
                Questions about these Terms? Email us at{" "}
                <a href="mailto:legal@oweable.com" className="text-(--color-accent) hover:underline">
                  legal@oweable.com
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
