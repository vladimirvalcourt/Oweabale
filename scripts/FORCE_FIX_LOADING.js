// Emergency fix for stuck loading state
// Paste this in browser console at http://localhost:3000

// Force stop loading
useStore.setState({ isLoading: false, phase2Hydrated: true });

// Check current state
console.log('Current state:', {
  isLoading: useStore.getState().isLoading,
  phase2Hydrated: useStore.getState().phase2Hydrated,
  user: useStore.getState().user?.id,
});

// If still stuck, clear everything and reload
// localStorage.clear();
// window.location.reload();
