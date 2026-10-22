# lis-hubs-front-office

Part of the Livestock Information Service (LIS), which lets livestock keepers, owners, agents and
delegates record and manage their animals.

The front-office hub is the public entry point for keepers and their agents. It signs users in,
holds their session, shows the signed-in home page with their holdings, and routes requests on to
the species microsites (spokes) that do the actual work.

Deployed on the Core Delivery Platform (CDP). See the
[CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-hubs-front-office) for
environments, deployments, logs and metrics.

## Architecture

LIS uses a hub and spoke design. A hub owns sign-in and sessions; each spoke is a separate app for
one species and task, mounted under a path on the hub:

```text
browser → front-office hub ─┬─ /cattle           → lis-apps-cattle-home     → lis-be4fe-cattle-home → lis-api-cattle
                            ├─ /cattle/register  → lis-apps-cattle-register
                            ├─ /cattle/move      → lis-apps-cattle-move
                            └─ /cattle/death     → lis-apps-cattle-death
```

- **Authentication:** users sign in with Defra Customer Identity (OIDC). The hub keeps a
  server-side session (Redis on CDP) and issues a hub JWT in a cookie, which the spokes
  verify.
- **Spokes:** the hub proxies each path to its spoke, forwarding only the hub JWT cookie. The list
  of spokes and their paths comes from
  [lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry).
- **Downstream calls:** the home page reads the user's holdings from `lis-be4fe-cattle-home`, with an
  AWS STS service token and an API key.
- **Shared packages:**
  [lis-hubs-infra-access](https://github.com/DEFRA/lis-hubs-infra-access) (auth, sessions, access decisions),
  [lis-hubs-infra-core](https://github.com/DEFRA/lis-hubs-infra-core) (logging, request context, service clients, proxy),
  [lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry) (module list),
  [lis-infra-ui-services](https://github.com/DEFRA/lis-infra-ui-services) (layout, error pages, maintenance page).

See [HUB-ARCHITECTURE.md](https://github.com/DEFRA/lis-dev/blob/main/HUB-ARCHITECTURE.md) for the
hub and spoke design.

### Sign-in and direct microsite access

The hub is the only place users sign in. A request for a spoke URL such as `/cattle/register`
without a valid hub JWT redirects to `/auth/login` with the original path as a relative
`returnUrl`. After sign-in completes at `/sso`, the hub sends the browser back to that path.

The OIDC redirect URI is `HUB_ORIGIN` followed by `OIDC_REDIRECT_PATH`. The hub always serves the
callback at `/sso`, so keep `OIDC_REDIRECT_PATH` as `/sso`: changing it alone breaks sign-in. If
`HUB_ORIGIN` changes, update the Defra Customer Identity app registration to match exactly.

The hub's `HUB_JWT_ISSUER` must be in each spoke's `HUB_ORIGINS`. `HUB_JWT_AUDIENCE`,
`HUB_JWT_COOKIE_NAME` and `HUB_JWT_SECRET` must match the spoke's values.

### Routes

| Path                  | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `/`                   | Welcome page, or the user's holdings once signed in                        |
| `/auth/login`         | Starts sign-in                                                             |
| `/sso`                | OIDC callback                                                              |
| `/auth/logout`        | Signs the user out                                                         |
| `/signout`            | Redirects to `/auth/logout` (the header link)                              |
| `/auth/access-denied` | Tells a refused user they do not have permission yet, with a sign out link |
| `/health`             | Health check                                                               |
| `/cattle/...`         | Proxied to the cattle spokes (see above)                                   |

## Prerequisites

- Node.js 24 (see `.nvmrc`, use `nvm use`)
- Docker with Docker Compose
- A local clone of [lis-dev](https://github.com/DEFRA/lis-dev) (recommended, see [Running with lis-dev](#running-with-lis-dev-recommended))

## Setup

### Development

```bash
nvm use
npm install
cp .env.example .env
```

`.env` is loaded when running standalone, and also by a sideloaded `npm run dev` for variables that
compose does not set. `HUB_JWT_SECRET` and `SESSION_COOKIE_PASSWORD` have no
default. `.env.example` sets local values for both, which you can keep for local use (the password must
be at least 32 characters).

### Test

There are no tools to install beyond `npm install`. Tests use [Vitest](https://vitest.dev/).

## Running with lis-dev (recommended)

The hub only works properly alongside the spokes, their backend services and a fake identity
provider. [lis-dev](https://github.com/DEFRA/lis-dev) runs all of these locally with Docker
Compose and serves them behind local HTTPS hostnames, so it is the recommended way to run and work
on this repo. Follow its README for the one-time setup.

Start the stack:

```bash
cd lis-dev
docker compose up -d
```

To work on this repo, swap its container for a local server with hot reload while the rest of the
stack stays in Docker:

```bash
.bin/sideload up front-office
.bin/sideload restore    # when done: back to the container
```

Then open <https://front-office.lis.defra> and sign in through the fake identity provider.

## Running standalone

You can also run the server on its own with `npm run dev`, using the values in `.env`. Without the
rest of the stack, sign-in needs an OIDC provider at `OIDC_DISCOVERY_URL`, the signed-in home page
can't load holdings, and the spoke paths have nothing to proxy to.

| Script              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Build frontend assets, then start the server with nodemon |
| `npm run dev:debug` | As `dev`, but waits for a debugger to attach              |
| `npm start`         | Production build and start                                |

### Configuration

Configuration is in `src/config/config.js`. Values marked secret must be set as secrets in the
CDP portal for every deployed environment.

| Variable                     | Description                                                                                                     | Default                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ENVIRONMENT`                | Environment name (`local`, `docker_compose`, `dev`, `test`, `prod`, ...)                                        | `local`                                 |
| `HOST`                       | Address to bind                                                                                                 | `0.0.0.0`                               |
| `PORT`                       | Port to bind                                                                                                    | `8085`                                  |
| `SERVICE_VERSION`            | Deployed version, for logs                                                                                      | none                                    |
| `ASSET_PATH`                 | Base path for static assets                                                                                     | `/public`                               |
| `STATIC_CACHE_TIMEOUT`       | Static asset cache timeout (ms)                                                                                 | `86400000`                              |
| `HTTP_PROXY`                 | Outbound HTTP proxy                                                                                             | none                                    |
| `LOG_ENABLED`                | Whether logging is on                                                                                           | `true`                                  |
| `LOG_LEVEL`                  | Log level                                                                                                       | `info`                                  |
| `LOG_FORMAT`                 | `ecs` or `pretty`                                                                                               | `ecs` in production, otherwise `pretty` |
| `LOG_HASH_SECRET`            | Secret. Key for hashing sensitive values in logs                                                                | none                                    |
| `MAINTENANCE_AVAILABLE_FROM` | UK local date-time (e.g. `2026-11-19T09:00`) to show the maintenance page until; empty means not in maintenance | empty                                   |
| `HUB_ORIGIN`                 | Public origin of the hub                                                                                        | `http://localhost:3101`                 |
| `SESSION_CACHE_ENGINE`       | `memory` or `redis`                                                                                             | `memory`                                |
| `SESSION_CACHE_NAME`         | Session cache name                                                                                              | `front-office-session`                  |
| `SESSION_CACHE_TTL`          | Server-side session TTL (ms)                                                                                    | `14400000`                              |
| `SESSION_COOKIE_TTL`         | Session cookie TTL (ms)                                                                                         | `14400000`                              |
| `SESSION_COOKIE_PASSWORD`    | Secret, required. Encrypts the session cookie (at least 32 characters)                                          | none                                    |
| `REDIS_HOST`                 | Redis host                                                                                                      | `127.0.0.1`                             |
| `REDIS_PORT`                 | Redis port                                                                                                      | `6379`                                  |
| `REDIS_USERNAME`             | Redis username                                                                                                  | empty                                   |
| `REDIS_PASSWORD`             | Secret. Redis password                                                                                          | empty                                   |
| `REDIS_KEY_PREFIX`           | Redis key prefix                                                                                                | `front-office:`                         |
| `REDIS_TLS`                  | Connect to Redis over TLS                                                                                       | `false`                                 |
| `USE_SINGLE_INSTANCE_CACHE`  | Single Redis instance rather than a cluster                                                                     | `true`                                  |
| `HUB_JWT_SECRET`             | Secret, required. Signs and verifies hub JWTs                                                                   | none                                    |
| `HUB_JWT_ISSUER`             | Hub JWT issuer                                                                                                  | `http://localhost:3101`                 |
| `HUB_JWT_AUDIENCE`           | Hub JWT audience                                                                                                | `livestock-spokes`                      |
| `HUB_JWT_COOKIE_NAME`        | Cookie that carries the hub JWT                                                                                 | `livestock_hub_jwt`                     |
| `HUB_JWT_TTL_SECONDS`        | Hub JWT TTL (seconds)                                                                                           | `14400`                                 |
| `OIDC_DISCOVERY_URL`         | Defra Customer Identity OIDC discovery URL                                                                      | none                                    |
| `OIDC_CLIENT_ID`             | OIDC client ID                                                                                                  | `front-office-client`                   |
| `OIDC_CLIENT_SECRET`         | Secret. OIDC client secret                                                                                      | local placeholder                       |
| `OIDC_REDIRECT_PATH`         | OIDC callback path                                                                                              | `/sso`                                  |
| `OIDC_SERVICE_ID`            | Optional service ID passed to the identity provider                                                             | none                                    |
| `AUTH_ALLOW_LIST_ENABLED`    | Only let users on the allow-list sign in                                                                        | `false`                                 |
| `AUTH_ALLOW_LIST_EMAILS`     | Secret. Comma-separated email addresses on the allow-list                                                       | empty                                   |
| `CATTLE_HOME_API_KEY`        | Secret. API key for `lis-be4fe-cattle-home`                                                                     | empty                                   |
| `CATTLE_HOME_API_TIMEOUT`    | Timeout for `lis-be4fe-cattle-home` requests (ms)                                                               | `5000`                                  |
| `MAPBOX_API_KEY`             | Secret. Mapbox API key                                                                                          | local placeholder                       |

On CDP, the platform also sets `AWS_REGION` for service tokens. In lis-dev, the compose files set
`AWS_ENDPOINT_URL_STS` to point at the fake STS.

## Running tests

```bash
npm test                 # unit tests
npm run test:coverage    # with coverage; fails below 90%
npm run lint             # ESLint and Stylelint
npm run format:check     # Prettier
```

End-to-end journeys are covered by [lis-journey-tests](https://github.com/DEFRA/lis-journey-tests).

## Monitoring

- Health check: `GET /health`
- Logs: OpenSearch dashboard per environment, linked from the [CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-hubs-front-office) under Logs
- Metrics: Grafana dashboard per environment, linked from the [CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-hubs-front-office) under Metrics

## Pipelines

Build, versioning and publishing run in GitHub Actions (`.github/workflows`) using Cake scripts
(`*.cake`):

- **Pull request to `main`**: validate (format, lint, test), Sonar analysis, version check
- **Push to a `feature/` or `hotfix/` branch**: prerelease version and tag
- **Merge to `main`**: release tag, then publish the container image

Versions come from git tags (SemVer). Validation builds the `production` target of the
`Dockerfile`, checks the container's `/health` endpoint and keeps the tested image as a workflow
artifact. When a tag is pushed, `publish.yml` publishes that exact image to Amazon ECR, tagged with
the version and the commit (`sha-...`), using GitHub OIDC rather than long-lived AWS keys.

The workflows need these GitHub Actions variables: `AWS_REGION`, `AWS_ACCOUNT_ID` and, optionally,
`ECR_REPOSITORY` (defaults to the repository name). AWS must have a
`github-<image-name>-build-role` IAM role that trusts this repository and can push to that ECR
repository.

## Branching policy

The repo uses mainline development. Branch from `main` and name the branch:

- `feature/LREG-<ticket>-<short-kebab-description>`
- `hotfix/LREG-<ticket>-<short-kebab-description>`

`LREG` must be uppercase, because the GitHub ruleset rejects other branch names. Rebase onto `main`
rather than merging `main` in. Incomplete work goes behind a feature flag.

## Contributing to this project

- Follow the [Defra software development standards](https://github.com/DEFRA/software-development-standards).
- A pre-commit hook runs the security audit, format check, lint and tests. Run `npm run setup:husky` once to install it.
- Open a pull request against `main` using the PR template. CI must pass and the Sonar quality gate must be green before merge.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of His Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
