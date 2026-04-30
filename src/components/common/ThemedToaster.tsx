import { Toaster } from 'sonner';
import { useStore } from '@/store';

export function ThemedToaster() {
  const themePref = useStore((s) => (s.user?.theme === 'Light' ? 'light' : 'dark'));

  return (
    <Toaster
      position="top-right"
      theme={themePref}
      closeButton
      toastOptions={{
        className: 'font-sans',
      }}
    />
  );
}
