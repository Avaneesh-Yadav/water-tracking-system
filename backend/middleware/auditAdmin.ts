import type { Response, NextFunction } from "express";
import AuditLog from "../models/AuditLog";
import type { AuthRequest } from "../types/express";

type EntityIdResolver =
  | string
  | ((req: AuthRequest, body: unknown) => string | null | undefined)
  | null;

function auditAdmin(
  action: string,
  entityType: string | null = null,
  getEntityId: EntityIdResolver = null
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const status = res.statusCode;
      if (req.user && status >= 200 && status < 400) {
        const entityId =
          typeof getEntityId === "function"
            ? getEntityId(req, body)
            : req.params?.uuid || getEntityId;
        AuditLog.create(
          {
            user_uuid: req.user.uuid,
            user_role: req.user.role || "ADMIN",
            action,
            entity_type: entityType,
            entity_id: entityId || null,
            details: { method: req.method, path: req.path },
            ip_address: req.ip || req.socket?.remoteAddress || null,
          },
          () => {}
        );
      }
      return originalJson(body);
    };
    next();
  };
}

export { auditAdmin };
