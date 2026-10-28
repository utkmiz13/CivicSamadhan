/**
 * Auth Controller
 * Handles user sign up, sign in, session tokens, and role verification.
 */

const { getLocalStorage, saveLocalStorage } = require('../config/supabase');

const authController = {
  /**
   * User Registration (Citizen, Contractor, Municipal Officer)
   */
  signup: (req, res) => {
    const { name, email, phone, role, password } = req.body || {};

    if (!name || !email || !phone || !role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name, email, phone number, and account role.'
      });
    }

    const storage = getLocalStorage();
    storage.users = storage.users || [];

    // Check existing email
    const existing = storage.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.'
      });
    }

    const userId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newUser = {
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: role.toLowerCase(),
      points: 100, // Joining bonus points!
      badge: 'Civic Novice 🥉',
      createdAt: new Date().toISOString()
    };

    storage.users.push(newUser);

    // If role is citizen, also add to leaderboard
    if (role.toLowerCase() === 'citizen') {
      storage.leaderboard.push({
        rank: storage.leaderboard.length + 1,
        userId: newUser.id,
        name: `${newUser.name} (You)`,
        points: 100,
        issuesResolved: 0,
        badge: 'Civic Novice 🥉',
        tier: 'Bronze'
      });
    }

    // If role is contractor, register contractor profile
    if (role.toLowerCase() === 'contractor') {
      storage.contractors.push({
        id: `CONT-${Math.floor(10 + Math.random() * 90)}`,
        name: newUser.name,
        category: 'General Civil Works',
        rating: 5.0,
        completedJobs: 0,
        activeJobs: 0,
        avgTurnaroundHours: 24.0
      });
    }

    saveLocalStorage(storage);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! +100 Welcome Civic Points awarded.',
      token: `jwt-${userId}-${Date.now()}`,
      user: newUser
    });
  },

  /**
   * User Login
   */
  login: (req, res) => {
    const { email, password } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const storage = getLocalStorage();
    storage.users = storage.users || [];

    let user = storage.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Demo auto-account creation if testing with new email
    if (!user) {
      const isContractor = email.includes('contractor') || email.includes('apex');
      const isOfficer = email.includes('admin') || email.includes('gov') || email.includes('officer');
      
      const role = isContractor ? 'contractor' : (isOfficer ? 'municipality' : 'citizen');
      const name = email.split('@')[0].replace(/[._]/g, ' ');

      user = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: email.toLowerCase(),
        phone: '+91 98765 00000',
        role,
        points: 150,
        badge: 'Active Member',
        createdAt: new Date().toISOString()
      };

      storage.users.push(user);
      saveLocalStorage(storage);
    }

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token: `jwt-${user.id}-${Date.now()}`,
      user
    });
  },

  /**
   * Redeem Points for Real Utility Vouchers
   */
  redeemVoucher: (req, res) => {
    const { userId, perkTitle, pointsCost } = req.body || {};

    const storage = getLocalStorage();
    const citizen = storage.leaderboard.find(u => u.userId === userId || u.name.includes('You'));

    if (citizen && citizen.points < pointsCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient Civic Points. You have ${citizen.points} points, but need ${pointsCost} points.`
      });
    }

    if (citizen) {
      citizen.points -= pointsCost;
    }

    const voucherCode = `CIVIC-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    saveLocalStorage(storage);

    return res.json({
      success: true,
      message: `Successfully redeemed: ${perkTitle}!`,
      voucherCode,
      remainingPoints: citizen ? citizen.points : 0
    });
  }
};

module.exports = authController;
