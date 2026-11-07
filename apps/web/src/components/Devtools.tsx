import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

/**
 * Loaded only in dev (see routes/__root.tsx), so neither panel ends up in the build. Both buttons
 * sit bottom right, side by side: bottom left covered the sidebar footer, top right the user menu.
 */
export default function Devtools() {
  return (
    <>
      <TanStackRouterDevtools
        position="bottom-right"
        toggleButtonProps={{ style: { right: '4.5rem', bottom: '0.75rem' } }}
      />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </>
  );
}
