const AuditLog = require('../models/AuditLog');

/**
 * How values get into audit_log:
 *
 * 1. Routes use auditAdmin('ACTION_NAME', 'entityType', getEntityId?) middleware on admin mutation endpoints.
 * 2. The middleware wraps res.json(). When the controller calls res.json(body) with a success status (2xx),
 *    we write one row to audit_log before sending the response.
 * 3. Values stored:
 *    - user_uuid, user_role: from req.user (the admin who made the request)
 *    - action: string you pass, e.g. 'CREATE_USER', 'ADD_CONSUMPTION', 'BACKUP_RESTORE'
 *    - entity_type: e.g. 'user', 'consumption'
 *    - entity_id: from getEntityId(req, body) or req.params.uuid (e.g. the created/updated record's uuid)
 *    - details: { method, path }
 *    - ip_address: req.ip or connection remoteAddress
 * 4. Run the migration 001_audit_log.sql once so the audit_log table exists.
 */
function auditAdmin(action, entityType = null, getEntityId = null) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const status = res.statusCode;
      if (req.user && status >= 200 && status < 400) {
        const entityId = typeof getEntityId === 'function' ? getEntityId(req, body) : (req.params?.uuid || getEntityId);
        AuditLog.create({
          user_uuid: req.user.uuid,
          user_role: req.user.role || 'ADMIN',
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: { method: req.method, path: req.path },
          ip_address: req.ip || req.connection?.remoteAddress,
        }, () => {});
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditAdmin };
