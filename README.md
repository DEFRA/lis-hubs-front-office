# Front Office

Role: deployable hub application for livestock keepers, owners, agents, and delegates.

Purpose: to manage the lifecycle of an animal.

Authentication:

- Defra CI only

Expected dependencies:

- `@livestock/hubs-infra-access`
- `@livestock/hubs-infra-core`
- `@livestock/hubs-infra-registry`
- `@livestock/ui-services`

This project is the active external hub boundary for the solution.

Current state:

- minimal deployable shell exists
- `/` now renders the richer front-office welcome page and signed-in livestock summary dashboard
- `/profile` renders a front-office profile and settings page for authenticated users
- `/health` responds with a simple health payload
- static asset and favicon routes are now wired through the front-office server shell
- content security policy is now owned by the front-office server shell
- shared module metadata comes from `@livestock/hubs-infra-registry`
- authentication, sessions and access decisions come from `@livestock/hubs-infra-access`

## OIDC callback

Defra CI must redirect to `/sso`. The complete redirect URI is the public
`HUB_ORIGIN` followed by `/sso`. The path defaults to `/sso` and can be changed
with `OIDC_REDIRECT_PATH`; the Defra CI application registration must be updated
to exactly the same URI whenever it changes.

## Direct microsite access

Front office is the canonical authentication entry point for public microsite
URLs such as `/cattle/register`. A microsite request without a valid hub JWT
redirects to `/auth/login` on `HUB_ORIGIN` with its mounted path as a relative
`returnUrl`. After `/sso` completes, the hub redirects the browser back to the
original microsite path. Microsites must use the same `HUB_JWT_ISSUER`, audience,
cookie name and signing secret as front office.

Remaining work:

- tighten front-office-specific module membership and capability policies
- add the remaining deployment packaging and environment conventions needed for standalone hosting
