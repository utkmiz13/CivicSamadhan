/**
 * API Router Definition
 * Maps REST endpoints to corresponding controllers and RBAC guards.
 */

const issueController = require('../controllers/issueController');
const statsController = require('../controllers/statsController');
const authController = require('../controllers/authController');

const routes = [
  // Issue Endpoints
  { method: 'GET', path: '/api/issues', handler: issueController.getIssues },
  { method: 'POST', path: '/api/issues', handler: issueController.createIssue },
  { method: 'POST', path: '/api/issues/:issueId/assign', handler: issueController.assignContractor },
  { method: 'POST', path: '/api/issues/:issueId/resolve', handler: issueController.submitResolution },
  { method: 'POST', path: '/api/issues/:issueId/verify', handler: issueController.verifyResolution },

  // Analytics & Reference Endpoints
  { method: 'GET', path: '/api/stats', handler: statsController.getCityStats },
  { method: 'GET', path: '/api/contractors', handler: statsController.getContractors },
  { method: 'GET', path: '/api/leaderboard', handler: statsController.getLeaderboard },
  { method: 'POST', path: '/api/reset', handler: statsController.resetData },

  // Auth & Session
  { method: 'POST', path: '/api/auth/send-otp', handler: authController.sendOtp },
  { method: 'POST', path: '/api/auth/verify-otp', handler: authController.verifyOtp },
  { method: 'POST', path: '/api/auth/signup', handler: authController.signup },
  { method: 'POST', path: '/api/auth/login', handler: authController.login },
  { method: 'POST', path: '/api/rewards/redeem', handler: authController.redeemVoucher }
];

module.exports = routes;
