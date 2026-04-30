import { Dialog } from '@headlessui/react';
import { isApplePointerPlatform } from '@/lib/utils';
import { ThemeBackdrop } from './ThemeBackdrop';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function KeyboardShortcutsDialog({ open, onClose }: Props) {
  const mod = isApplePointerPlatform() ? '⌘' : 'Ctrl';

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <ThemeBackdrop />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded-lg border border-surface-border bg-surface-raised p-6 shadow-elevated">
          <Dialog.Title className="font-sans text-lg font-semibold tracking-tight text-content-primary">
            Keyboard shortcuts
          </Dialog.Title>
          <Dialog.Description className="mt-2 font-sans text-sm text-content-tertiary">
            Speed up navigation when you are not typing in a field. You can also open Settings from the sidebar (above Collapse) or from your profile menu.
          </Dialog.Description>

          <dl className="mt-6 space-y-4 font-sans text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-3">
              <dt className="text-content-secondary">Open global search</dt>
              <dd>
                <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                  {mod}
                </kbd>
                <span className="mx-1 text-content-muted">+</span>
                <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                  K
                </kbd>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-3">
              <dt className="text-content-secondary">Quick add entry</dt>
              <dd>
                <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                  Q
                </kbd>
              </dd>
            </div>
            <div className="space-y-2 border-b border-surface-border pb-3">
              <dt className="text-content-secondary">Go to page (press in order)</dt>
              <dd className="space-y-2 text-content-tertiary">
                <p>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    G
                  </kbd>
                  <span className="mx-1.5">then</span>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    D
                  </kbd>
                  <span className="ml-2 text-content-muted">Pay List</span>
                </p>
                <p>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    G
                  </kbd>
                  <span className="mx-1.5">then</span>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    T
                  </kbd>
                  <span className="ml-2 text-content-muted">Transactions</span>
                </p>
                <p>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    G
                  </kbd>
                  <span className="mx-1.5">then</span>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    B
                  </kbd>
                  <span className="ml-2 text-content-muted">Bills</span>
                </p>
                <p>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    G
                  </kbd>
                  <span className="mx-1.5">then</span>
                  <kbd className="rounded border border-surface-border bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-content-primary">
                    S
                  </kbd>
                  <span className="ml-2 text-content-muted">Settings</span>
                </p>
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg border border-surface-border bg-transparent px-4 py-2 font-sans text-sm font-medium text-content-secondary transition-colors hover:bg-content-primary/[0.04] hover:text-content-primary focus-app"
          >
            Close
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
