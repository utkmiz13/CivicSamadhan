/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks across Citizen, Municipality Admin, and Contractor endpoints.
 */

const ROLES = {
  CITIZEN: 'citizen',
  MUNICIPALITY: 'municipality',
  CONTRACTOR: 'contractor',
  ADMIN: 'admin'
};

/**
 * Enforce minimum role level for request execution
 * @param {Array<string>} allowedRoles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // Check role header or query parameter (e.g. for demo testing)
    const userRole = (req.headers['x-user-role'] || req.query.role || 'citizen').toLowerCase();

    if (allowedRoles.includes(userRole) || userRole === ROLES.ADMIN) {
      req.user = {
        role: userRole,
        id: req.headers['x-user-id'] || 'USR-101',
        name: req.headers['x-user-name'] || 'Authenticated User'
      };
      return next();
    }

    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: false,
      error: `Access Denied. Role '${userRole}' lacks permission to execute this operation.`,
      requiredRoles: allowedRoles
    }));
  };
}

module.exports = {
  ROLES,
  authorizeRoles
};

