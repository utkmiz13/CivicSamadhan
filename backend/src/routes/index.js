/**
 * API Router Definition
 * Maps REST endpoints to corresponding controllers and RBAC guards.
 */

const issueController = require('../controllers/issueController');
const statsController = require('../controllers/statsController');
const authController = require('../controllers/authController');
const { authorizeRoles, ROLES } = require('../middleware/rbac');

// Route table definition
const routes = [
  // Issue Endpoints
  { method: 'GET', path: '/api/issues', handler: issueController.getIssues },
  { method: 'POST', path: '/api/issues', middleware: authorizeRoles(ROLES.CITIZEN, ROLES.ADMIN), handler: issueController.createIssue },
  { method: 'POST', path: '/api/issues/:issueId/assign', middleware: authorizeRoles(ROLES.MUNICIPALITY, ROLES.ADMIN), handler: issueController.assignContractor },
  { method: 'POST', path: '/api/issues/:issueId/resolve', middleware: authorizeRoles(ROLES.CONTRACTOR, ROLES.ADMIN), handler: issueController.submitResolution },
  { method: 'POST', path: '/api/issues/:issueId/verify', middleware: authorizeRoles(ROLES.CITIZEN, ROLES.ADMIN), handler: issueController.verifyResolution },

  // Analytics & Reference Endpoints
  { method: 'GET', path: '/api/stats', handler: statsController.getCityStats },
  { method: 'GET', path: '/api/contractors', handler: statsController.getContractors },
  { method: 'GET', path: '/api/leaderboard', handler: statsController.getLeaderboard },
  { method: 'POST', path: '/api/reset', handler: statsController.resetData },

  // Auth & Session
  { method: 'POST', path: '/api/auth/profile', handler: authController.switchProfile }
];

module.exports = routes;

