/**
 * Auth Controller
 * Handles user sessions, role selection, and profile state.
 */

const authController = {
  /**
   * Switch active profile session (Citizen, Municipality, Contractor)
   */
  switchProfile: (req, res) => {
    const { role } = req.body || {};
    const validRoles = ['citizen', 'municipality', 'contractor'];

    if (!validRoles.includes(role?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const profiles = {
      citizen: {
        id: 'USR-101',
        name: 'Aarav Sharma',
        role: 'citizen',
        phone: '+91 98765 43210',
        points: 540,
        badge: 'Ward Hero 🥈'
      },
      municipality: {
        id: 'ADM-201',
        name: 'Municipal Commissioner Office',
        role: 'municipality',
        department: 'Urban Development & Public Works',
        jurisdiction: 'New Delhi Central Zone'
      },
      contractor: {
        id: 'CONT-01',
        name: 'Apex Road Infrastructure Ltd',
        role: 'contractor',
        category: 'Potholes & Roads',
        activeJobs: 3
      }
    };

    const selectedProfile = profiles[role.toLowerCase()];

    return res.json({
      success: true,
      message: `Profile context switched to ${role.toUpperCase()}`,
      token: `demo-jwt-${role}-session-token`,
      profile: selectedProfile
    });
  }
};

module.exports = authController;

