/**
 * Stats & Analytics Controller
 * Provides executive telemetry for municipal dashboards and civic leaderboards.
 */

const { dataService } = require('../config/supabase');

const statsController = {
  /**
   * Get citywide KPI statistics
   */
  getCityStats: async (req, res) => {
    const issues = await dataService.getIssues();
    const contractors = await dataService.getContractors();

    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'Resolved').length;
    const inProgress = issues.filter(i => i.status === 'In Progress').length;
    const underVerification = issues.filter(i => i.status === 'Under Verification').length;
    const pending = issues.filter(i => i.status === 'Pending').length;
    const criticalHazards = issues.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalIssues: total,
        pending,
        inProgress,
        underVerification,
        resolved,
        resolutionRate,
        criticalHazards,
        avgResolutionHours: 21.4,
        activeContractors: contractors.length,
        totalRewardsDistributed: 3450
      }
    });
  },

  /**
   * Get list of authorized contractors
   */
  getContractors: async (req, res) => {
    const contractors = await dataService.getContractors();
    return res.json({
      success: true,
      data: contractors
    });
  },

  /**
   * Get civic rewards leaderboard
   */
  getLeaderboard: async (req, res) => {
    const leaderboard = await dataService.getLeaderboard();
    return res.json({
      success: true,
      data: leaderboard
    });
  },

  /**
   * Reset database back to seed state (useful for hackathon resets)
   */
  resetData: (req, res) => {
    const freshData = dataService.resetToSeed();
    return res.json({
      success: true,
      message: 'Database reset to original seed state.',
      data: freshData
    });
  }
};

module.exports = statsController;
