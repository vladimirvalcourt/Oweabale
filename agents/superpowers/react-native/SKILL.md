# Skill: React Native + Expo

## Trigger
Load this skill whenever working with:
- `.tsx` or `.ts` files in a React Native or Expo project
- Navigation (Expo Router, React Navigation)
- Native device APIs (camera, notifications, storage, biometrics)
- Styling with StyleSheet, NativeWind, or Tamagui
- Platform-specific code (`Platform.OS`, `.ios.tsx`, `.android.tsx`)

## Type
**Flexible** — These are strong conventions. Deviate only when the platform, library, or user instruction explicitly requires it, and document why.

## Instructions

### Component Structure
1. One component per file. File name matches the exported component name (PascalCase).
2. Order within a component file:
   - Imports (React, then RN core, then third-party, then local)
   - Types/interfaces
   - Constants (outside component, no magic numbers inline)
   - Component function
   - StyleSheet.create() at the bottom
3. Use functional components with hooks only. No class components.
4. Keep components under 200 lines. Extract sub-components or hooks when exceeded.

### Styling
5. Use `StyleSheet.create()` for all styles. No inline style objects (they create new objects on every render).
6. Exception: dynamic styles that depend on runtime values may use inline objects for the dynamic part only.
7. Use `Platform.select()` for platform-specific style differences, not separate files unless the divergence is large.
8. Respect safe areas: always wrap screen-level components with `<SafeAreaView>` or use `useSafeAreaInsets()`.

### Navigation (Expo Router)
9. File-based routing: screens live in `app/` directory. Nested routes use folders.
10. Use `<Link>` for declarative navigation, `router.push()` for imperative.
11. Pass only serializable params through navigation (strings, numbers). Fetch full objects inside the destination screen.
12. Use layout files (`_layout.tsx`) for shared headers, tab bars, and auth guards.

### Data & State
13. Keep server state (Supabase, API) in React Query or Zustand. Do not store it in `useState`.
14. Use `useCallback` and `useMemo` for functions and values passed as props to list items.
15. For FlatList/SectionList: always provide `keyExtractor`, `getItemLayout` when item height is fixed, and `removeClippedSubviews={true}` for long lists.

### Native APIs
16. Always check permissions before accessing camera, location, or notifications. Handle the denied state explicitly.
17. Wrap native module calls in try/catch. Native failures are silent on some platforms.
18. Use Expo SDK modules over bare React Native APIs when an equivalent exists.

### Performance
19. Lazy-load heavy screens with `React.lazy()` or dynamic imports in Expo Router.
20. Profile with Flipper or React DevTools before optimizing. Do not guess at bottlenecks.

## Verification
- No inline style objects except for dynamic values.
- No class components.
- All screens handle safe areas.
- Navigation params are serializable primitives only.
- Permission checks exist before all native API calls.
