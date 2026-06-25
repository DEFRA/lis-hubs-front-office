# Front Office

Role: deployable hub application for livestock keepers, owners, agents, and delegates.

Purpose: to manage the lifecycle of an animal.

Authentication:

- Defra CI only

Expected dependencies:

- `@livestock/hub-core`
- `@livestock/hub-registry`
- `@livestock/hub-access`
- `@livestock/infrastructure`

This project is the active external hub boundary for the solution.

Current state:

- minimal deployable shell exists
- `/` now renders the richer front-office welcome page and signed-in livestock summary dashboard
- `/profile` renders a front-office profile and settings page for authenticated users
- `/health` responds with a simple health payload
- static asset and favicon routes are now wired through the front-office server shell
- content security policy is now owned by the front-office server shell
- shared module metadata comes from `@livestock/hub-registry`
- shared session access comes from `@livestock/hub-core`
- shared access filtering comes from `@livestock/hub-access`
- front-office authentication is wired through the shared hub auth mechanics

Remaining work:

- tighten front-office-specific module membership and capability policies
- add the remaining deployment packaging and environment conventions needed for standalone hosting
