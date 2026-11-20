import { createServiceClient } from '@defra/lis-hubs-infra-core'

import { config } from '#config/config.js'

/**
 * @typedef {object} UserHolding
 * @property {string} cph
 * @property {string | null} [holding_id]
 * @property {string | null} [holding_name]
 * @property {string | null} [role]
 */

/**
 * @typedef {object} UserDetails
 * @property {string} subject
 * @property {string} [email]
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [display_name]
 * @property {UserHolding[]} cphs
 */

// The BE4FE always stays in docker per the project's local dev workflow, so
// the hub reaches it via its published port whether it runs as 'local' or
// 'docker_compose'.
const localPort = 8087

const notFound = 404

const cphPattern = /^\d{2}\/\d{3}\/\d{4}$/

/**
 * @typedef {object} CattleSummary
 * @property {string} cattle_id
 * @property {string} eartag
 */

/**
 * @typedef {object} HerdMark
 * @property {string} mark
 * @property {string[]} species
 */

/**
 * @typedef {object} HoldingDetails
 * @property {string} cph
 * @property {string | null} [name]
 * @property {string[]} [address]
 * @property {string[]} [correspondence_address] absent from BE4FE releases before LREG-779
 * @property {HerdMark[]} [herd_marks]
 */

const be4fe = createServiceClient({
  environment: config.get('environment'),
  serviceName: 'lis-be4fe-cattle-home',
  port: localPort,
  apiKey: config.get('cattleHomeApi.apiKey'),
  timeout: config.get('cattleHomeApi.timeout'),
  circuitBreaker: config.get('cattleHomeApi.circuitBreaker')
})

/**
 * @param {string} path BE4FE path to GET
 * @returns {Promise<any | null>} the response's data, or null if the BE4FE answers not found
 */
async function getOrNull(path) {
  try {
    const { payload } = await be4fe.get(path)
    return payload.data
  } catch (error) {
    if (error.statusCode === notFound) {
      return null
    }
    throw error
  }
}

/**
 * @param {string} userId
 * @returns {Promise<UserDetails | null>} the user's details and the CPHs they hold, or null if the BE4FE doesn't know the user
 */
export async function getUserDetails(userId) {
  return getOrNull(`api/users/${encodeURIComponent(userId)}`)
}

/**
 * The live cattle on a holding. The BE4FE returns the whole list; there is
 * no paging or total count on this endpoint.
 *
 * @param {string} cph county/parish/holding, e.g. 12/345/0001
 * @returns {Promise<CattleSummary[] | null>} the cattle, or null if the BE4FE doesn't know the holding
 */
export async function getCattleOnHolding(cph) {
  if (!cphPattern.test(cph)) {
    throw new TypeError('CPH must contain county, parish and holding')
  }

  return getOrNull(`api/cphs/${cph}/cattle`)
}

/**
 * @param {string} cph county/parish/holding, e.g. 12/345/0001
 * @returns {Promise<HoldingDetails | null>} the holding's details, or null if the BE4FE doesn't know the holding
 */
export async function getHoldingDetails(cph) {
  if (!cphPattern.test(cph)) {
    throw new TypeError('CPH must contain county, parish and holding')
  }

  return getOrNull(`api/cphs/${cph}`)
}

/**
 * Creates the user's account from their identity provider claims, or
 * refreshes it if it already exists. Called on every successful logon.
 *
 * @param {{ sub: string, email: string, given_name?: string | null, family_name?: string | null }} claims
 * @returns {Promise<UserDetails>} the user's details and the CPHs they hold
 */
export async function createUser(claims) {
  const { payload } = await be4fe.post('api/users', { payload: claims })
  return payload.data
}
