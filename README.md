# Front Office

Role: deployable hub application for livestock keepers, owners, agents, and delegates.

Purpose: to manage the lifecycle of an animal.

Authentication:

- Defra CI only

Expected dependencies:

- `@defra/lis-hubs-infra-access`
- `@defra/lis-hubs-infra-core`
- `@defra/lis-hubs-infra-registry`
- `@defra/lis-infra-ui-services`

This project is the active external hub boundary for the solution.

Current state:

- minimal deployable shell exists
- `/` now renders the richer front-office welcome page and signed-in livestock summary dashboard
- `/profile` renders a front-office profile and settings page for authenticated users
- `/health` responds with a simple health payload
- static asset and favicon routes are now wired through the front-office server shell
- content security policy is now owned by the front-office server shell
- shared module metadata comes from `@defra/lis-hubs-infra-registry`
- authentication, sessions and access decisions come from `@defra/lis-hubs-infra-access`

## Container publishing

Pull requests, short-lived branches, and merged changes on `main` run the shared
validation workflow. After tests pass, it builds the `production` target from
the root `Dockerfile`, verifies the container's `/health` endpoint, and uploads
the tested image as a commit-addressed GitHub Actions artifact.

Stable and prerelease Git tags trigger `.github/workflows/publish.yml`. This
workflow validates the tag and its source branch, downloads the image artifact
for the tagged commit, verifies its image ID and `git.hash` label, and publishes
that exact image to Amazon ECR with two immutable tags:

- the semantic version, for example `1.2.3`
- the source revision, for example `sha-0123456789abcdef...`

The repository or organisation must provide these GitHub Actions variables:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ECR_REPOSITORY`

`ECR_REPOSITORY` is optional and defaults to the GitHub repository name. AWS
must contain a `github-<image-name>-build-role` IAM role that trusts this
repository through GitHub OIDC and can upload images to the configured ECR
repository. No long-lived AWS access keys are required.

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
