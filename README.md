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

Remaining work:

- tighten front-office-specific module membership and capability policies
- add the remaining deployment packaging and environment conventions needed for standalone hosting
