// Public API of the identity module (ADR-0001): other modules import only from here.
export { CurrentUser, Public } from './auth.decorators.js';
export type { SessionUser } from './auth.types.js';
export { IdentityModule } from './identity.module.js';
