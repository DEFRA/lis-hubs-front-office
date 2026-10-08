import { config } from '#config/config.js'

function normaliseEmail(email) {
  return email?.trim().toLowerCase() ?? ''
}

/**
 * Whether a signed-in user may use the front office. Everyone is allowed
 * while the allow-list is disabled.
 *
 * @param {string | undefined} email - The email from the Defra CI ID token.
 * @returns {boolean}
 */
export function isAllowListed(email) {
  if (!config.get('auth.allowList.enabled')) {
    return true
  }

  const normalisedEmail = normaliseEmail(email)

  return (
    normalisedEmail !== '' &&
    config
      .get('auth.allowList.emails')
      .some((allowed) => normaliseEmail(allowed) === normalisedEmail)
  )
}
