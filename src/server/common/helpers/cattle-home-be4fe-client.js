import { BaseClient } from '@defra/lis-hubs-infra-core'

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

class CattleHomeBe4FeClient extends BaseClient {
  /**
   * @param {object} options
   * @param {string} options.environment 'local' | 'docker_compose' | 'dev' | 'test' | 'ext-test' | 'perf-test' | 'prod'
   * @param {string} [options.apiKey] API key sent to the cattle-home BE4FE as x-api-key
   * @param {number} [options.timeout] request timeout in milliseconds
   */
  constructor({ environment, apiKey, timeout }) {
    super({
      environment,
      serviceName: 'lis-be4fe-cattle-home',
      port: localPort,
      apiKey,
      timeout
    })
  }

  /**
   * @param {string} userId
   * @returns {Promise<UserDetails | null>} the user's details and the CPHs they hold, or null if the BE4FE doesn't know the user
   */
  async getUserDetails(userId) {
    try {
      const { payload } = await this._get(
        `api/users/${encodeURIComponent(userId)}`
      )
      return payload.data
    } catch (error) {
      if (error.statusCode === notFound) {
        return null
      }
      throw error
    }
  }
}

export const cattleHomeBe4FeClient = new CattleHomeBe4FeClient({
  environment: config.get('environment'),
  apiKey: config.get('cattleHomeApi.apiKey'),
  timeout: config.get('cattleHomeApi.timeout')
})
