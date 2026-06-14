'use strict'

const { query } = require('../config/db')

async function getTemplate(templateType) {
  const { rows } = await query(
    `SELECT id, template_type, subject, message_template, variables, is_active
     FROM sms_templates
     WHERE template_type = $1 AND is_active = true
     LIMIT 1`,
    [templateType]
  )
  return rows[0] || null
}

async function getAllTemplates() {
  const { rows } = await query(
    `SELECT id, template_type, subject, message_template, variables, is_active, updated_at
     FROM sms_templates
     ORDER BY template_type ASC`
  )
  return rows
}

async function updateTemplate(templateType, messageTemplate) {
  const { rows } = await query(
    `UPDATE sms_templates
     SET message_template = $1, updated_at = NOW()
     WHERE template_type = $2
     RETURNING id, template_type, subject, message_template, variables, is_active`,
    [messageTemplate, templateType]
  )
  return rows[0] || null
}

function renderTemplate(template, variables) {
  if (!template) {
    throw { code: 'TEMPLATE_NOT_FOUND', message: 'SMS template not found.' }
  }

  let message = template.message_template
  const expectedVars = template.variables || {}

  // Replace all {VARIABLE} with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    message = message.replace(new RegExp(placeholder, 'g'), String(value))
  })

  // Check for unreplaced variables (missing variables)
  const unreplacedVars = message.match(/{[A-Z_]+}/g) || []
  if (unreplacedVars.length > 0) {
    throw {
      code: 'MISSING_TEMPLATE_VARIABLES',
      message: `Missing variables in template: ${unreplacedVars.join(', ')}`,
      missing: unreplacedVars,
    }
  }

  return message
}

module.exports = {
  getTemplate,
  getAllTemplates,
  updateTemplate,
  renderTemplate,
}
