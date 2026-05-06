import Link from "next/link";
import { ReactNode } from "react";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-(--color-surface)">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--color-surface-border) bg-(--color-surface)/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] text-(--color-content) transition-opacity hover:opacity-80">
            OWEABLE
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              prefetch={false}
              href="/auth"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-(--color-content-secondary) transition-colors hover:text-(--color-content)"
            >
              Sign in
            </Link>
            <Link
              prefetch={false}
              href="/auth"
              className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover)"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-(--color-surface-border) px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link href="/" className="text-sm font-bold tracking-[0.2em] text-(--color-content)">
                OWEABLE
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-(--color-content-tertiary)">
                One place for every financial obligation — bills, debt, subscriptions, citations, mileage, and more.
              </p>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-(--color-content-tertiary)">
                Product
              </p>
              <ul className="space-y-3">
                <li><Link prefetch={false} href="/auth" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">Get started</Link></li>
                <li><Link prefetch={false} href="/auth" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-(--color-content-tertiary)">
                Legal
              </p>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">Terms of Service</Link></li>
                <li><Link href="/support" className="text-sm text-(--color-content-secondary) transition-colors hover:text-(--color-content)">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-(--color-surface-border) pt-8 sm:flex-row sm:items-center">
            <p className="text-xs text-(--color-content-tertiary)">
              &copy; {new Date().getFullYear()} Oweable. All rights reserved.
            </p>
            <p className="text-xs text-(--color-content-tertiary)">
              Built for people who want to stop guessing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
