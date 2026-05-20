'use strict'

const { OAuth2Client } = require('google-auth-library')
const { env }          = require('../config/env')

let client = null
function getClient() {
  if (!client) client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
  return client
}

async function verifyGoogleCredential(credential) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw { code: 'UNAUTHORIZED', message: 'Google sign-in is not configured on this server.' }
  }
  const ticket  = await getClient().verifyIdToken({
    idToken:  credential,
    audience: env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload.email_verified) {
    throw { code: 'UNAUTHORIZED', message: 'Google account email is not verified.' }
  }
  return {
    googleId: payload.sub,
    email:    payload.email,
    name:     payload.name || payload.email.split('@')[0],
  }
}

module.exports = { verifyGoogleCredential }
