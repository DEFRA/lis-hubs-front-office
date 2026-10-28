import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

import {
  positiveInteger,
  secret
} from '@defra/lis-infra-ui-services/config-formats'
import { milliseconds } from '@defra/lis-infra-ui-services/duration'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)
convict.addFormat(positiveInteger)
convict.addFormat(secret)

export const config = convict({
  serviceVersion: {
    doc: 'The deployed service version for logging and diagnostics',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  environment: {
    doc: 'The current environment',
    format: [
      'local',
      'docker_compose',
      'dev',
      'test',
      'ext-test',
      'perf-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 8085,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Application service name',
    format: String,
    default: 'Livestock Information'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Base asset path for direct application access',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  staticCacheTimeout: {
    doc: 'Cache timeout for static assets in milliseconds',
    format: positiveInteger.name,
    default: milliseconds.oneDay,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  isProduction: {
    doc: 'Whether the application is running in production',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'Whether the application is running in development',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'Whether the application is running in test',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pretty'],
      default: isProduction ? 'ecs' : 'pretty',
      env: 'LOG_FORMAT'
    },
    hashSecret: {
      doc: 'Fixed key used to hash sensitive log context values (e.g. user_email_hash) so they stay searchable without exposing the raw value',
      format: String,
      nullable: true,
      default: null,
      env: 'LOG_HASH_SECRET',
      sensitive: true
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  maintenance: {
    availableFrom: {
      doc: 'When the service is available again, as a UK local date-time without an offset, e.g. 2026-11-19T09:00. Empty means the service is not in maintenance',
      format: String,
      default: '',
      env: 'MAINTENANCE_AVAILABLE_FROM'
    }
  },
  session: {
    cache: {
      engine: {
        doc: 'Backend cache engine',
        format: ['redis', 'memory'],
        default: 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'Server-side session cache name',
        format: String,
        default: 'front-office-session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'Server-side session cache ttl',
        format: positiveInteger.name,
        default: milliseconds.fourHours,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: positiveInteger.name,
        default: milliseconds.fourHours,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'Session cookie password',
        format: secret.name,
        default: null,
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    port: {
      doc: 'Redis cache port',
      format: 'port',
      default: 6379,
      env: 'REDIS_PORT'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      env: 'REDIS_PASSWORD',
      sensitive: true
    },
    keyPrefix: {
      doc: 'Redis key prefix',
      format: String,
      default: 'front-office:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster',
      format: Boolean,
      default: true,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: false,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  mapbox: {
    apiKey: {
      doc: 'API key sent to access MAPBOX',
      format: String,
      default: 'ADD_OWN_MAPBOX_KEY_HERE',
      env: 'MAPBOX_API_KEY',
      sensitive: true
    }
  },
  proxy: {
    timeout: {
      doc: 'Milliseconds to wait for a spoke to send its response headers before answering 504',
      format: positiveInteger.name,
      default: 30000,
      env: 'PROXY_TIMEOUT'
    },
    circuitBreaker: {
      failureThreshold: {
        doc: 'Consecutive spoke transport failures (connection refused, timeout) that open its circuit breaker',
        format: positiveInteger.name,
        default: 5,
        env: 'PROXY_CIRCUIT_BREAKER_FAILURE_THRESHOLD'
      },
      resetTimeout: {
        doc: 'Milliseconds the spoke circuit breaker stays open before letting a probe request through',
        format: positiveInteger.name,
        default: 30000,
        env: 'PROXY_CIRCUIT_BREAKER_RESET_TIMEOUT'
      }
    }
  },
  cattleHomeApi: {
    apiKey: {
      doc: 'API key sent to the cattle-home BE4FE as x-api-key',
      format: String,
      default: '',
      env: 'CATTLE_HOME_API_KEY',
      sensitive: true
    },
    timeout: {
      doc: 'Total milliseconds allowed for a cattle-home BE4FE API response, headers and body',
      format: positiveInteger.name,
      default: 5000,
      env: 'CATTLE_HOME_API_TIMEOUT'
    },
    circuitBreaker: {
      failureThreshold: {
        doc: 'Consecutive cattle-home BE4FE transport failures (connection refused, timeout) that open its circuit breaker',
        format: positiveInteger.name,
        default: 5,
        env: 'CATTLE_HOME_API_CIRCUIT_BREAKER_FAILURE_THRESHOLD'
      },
      resetTimeout: {
        doc: 'Milliseconds the cattle-home BE4FE circuit breaker stays open before letting a probe request through',
        format: positiveInteger.name,
        default: 30000,
        env: 'CATTLE_HOME_API_CIRCUIT_BREAKER_RESET_TIMEOUT'
      }
    }
  },
  auth: {
    hubOrigin: {
      doc: 'Public origin for the front-office hub',
      format: String,
      default: 'http://localhost:3101',
      env: 'HUB_ORIGIN'
    },
    allowList: {
      enabled: {
        doc: 'Only let users on the allow-list sign in to the front office',
        format: Boolean,
        default: false,
        env: 'AUTH_ALLOW_LIST_ENABLED'
      },
      emails: {
        doc: 'Comma-separated email addresses allowed to sign in when the allow-list is enabled',
        format: Array,
        default: [],
        env: 'AUTH_ALLOW_LIST_EMAILS',
        sensitive: true
      }
    },
    hubJwt: {
      cookieName: {
        doc: 'Cookie name that carries the hub-issued JWT',
        format: String,
        default: 'livestock_hub_jwt',
        env: 'HUB_JWT_COOKIE_NAME'
      },
      secret: {
        doc: 'Shared secret used to sign and verify hub-issued JWTs',
        format: secret.name,
        default: null,
        env: 'HUB_JWT_SECRET',
        sensitive: true
      },
      issuer: {
        doc: 'Issuer used for hub-issued JWTs',
        format: String,
        default: 'http://localhost:3101',
        env: 'HUB_JWT_ISSUER'
      },
      audience: {
        doc: 'Audience used for hub-issued JWTs',
        format: String,
        default: 'livestock-spokes',
        env: 'HUB_JWT_AUDIENCE'
      },
      ttlSeconds: {
        doc: 'TTL in seconds for hub-issued JWTs',
        format: positiveInteger.name,
        default: 14400,
        env: 'HUB_JWT_TTL_SECONDS'
      }
    },
    oidc: {
      discoveryUrl: {
        doc: 'OIDC discovery URL for Defra CI',
        format: String,
        nullable: true,
        default: null,
        env: 'OIDC_DISCOVERY_URL'
      },
      clientId: {
        doc: 'OIDC client id',
        format: String,
        default: 'front-office-client',
        env: 'OIDC_CLIENT_ID'
      },
      clientSecret: {
        doc: 'OIDC client secret',
        format: String,
        default: 'front-office-client-secret',
        env: 'OIDC_CLIENT_SECRET',
        sensitive: true
      },
      redirectPath: {
        doc: 'OIDC callback path',
        format: String,
        default: '/sso',
        env: 'OIDC_REDIRECT_PATH'
      },
      serviceId: {
        doc: 'Optional OIDC service id passed to the provider',
        format: String,
        nullable: true,
        default: null,
        env: 'OIDC_SERVICE_ID'
      }
    }
  }
})

config.validate({ allowed: 'strict' })
