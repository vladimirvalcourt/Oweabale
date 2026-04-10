import { Toaster } from 'sonner';
import { useStore } from '../store/useStore';

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
