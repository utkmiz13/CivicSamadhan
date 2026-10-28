/**
 * Auth Controller - Real Authentication
 * Strictly validates credentials against Supabase and storage.
 * Does NOT auto-login unregistered users.
 */

const { getLocalStorage, saveLocalStorage } = require('../config/supabase');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://irgxrbovjxocmecsyfbd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_k-W0eVs332SKUukAPAZkxQ_Ti7zYHOT';

function supabaseAuthRequest(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, data: parsed });
          } else {
            resolve({ ok: false, status: res.statusCode, error: parsed });
          }
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: { message: body } });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const authController = {
  /**
   * User Registration (Real Supabase Auth + Email Confirmation)
   */
  signup: async (req, res) => {
    const { name, email, phone, role, password } = req.body || {};

    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name, email address, password, and account role.'
      });
    }

    try {
      // 1. Call real Supabase Auth to trigger confirmation email
      const authRes = await supabaseAuthRequest('signup', {
        email: email.trim().toLowerCase(),
        password,
        data: { name: name.trim(), phone: phone || '', role: role.toLowerCase() }
      });

      if (!authRes.ok) {
        const errMsg = authRes.error?.msg || authRes.error?.message || 'Failed to create account.';
        return res.status(400).json({ success: false, error: errMsg });
      }

      // 2. Persist user metadata in local storage / database
      const storage = getLocalStorage();
      storage.users = storage.users || [];
      const userId = authRes.data.id || `USR-${Math.floor(1000 + Math.random() * 9000)}`;

      const newUser = {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        role: role.toLowerCase(),
        points: 100,
        badge: 'Civic Novice 🥉',
        confirmed: Boolean(authRes.data.email_confirmed_at),
        createdAt: new Date().toISOString()
      };

      storage.users.push(newUser);

      // Register contractor if contractor role
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
        message: `Account created for ${email}! 📧 Confirmation email sent. Please check your inbox and verify before signing in.`,
        confirmationSent: Boolean(authRes.data.confirmation_sent_at),
        user: newUser
      });
    } catch (err) {
      console.error('[Auth Signup Error]', err);
      return res.status(500).json({ success: false, error: 'Internal signup error: ' + err.message });
    }
  },

  /**
   * User Login (Strict Verification - Rejects Unregistered / Unconfirmed Users)
   */
  login: async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
      // Check real Supabase credentials
      const authRes = await supabaseAuthRequest('token?grant_type=password', {
        email: email.trim().toLowerCase(),
        password
      });

      if (!authRes.ok) {
        const errCode = authRes.error?.error_code;
        const errMsg = authRes.error?.msg || authRes.error?.error_description || authRes.error?.message;

        if (errCode === 'email_not_confirmed') {
          return res.status(400).json({
            success: false,
            error: '📧 Email not confirmed! Please open your email inbox and click the verification link before logging in.'
          });
        }

        if (errCode === 'invalid_credentials') {
          return res.status(400).json({
            success: false,
            error: '❌ Invalid email or password. If you have not created an account yet, please click "Sign Up" first!'
          });
        }

        return res.status(400).json({ success: false, error: errMsg || 'Login failed.' });
      }

      // Login successful!
      const meta = authRes.data.user?.user_metadata || {};
      const storage = getLocalStorage();
      storage.users = storage.users || [];
      const localUser = storage.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      const user = {
        id: authRes.data.user.id,
        name: meta.name || localUser?.name || email.split('@')[0],
        email: email.toLowerCase(),
        phone: meta.phone || localUser?.phone || '',
        role: (meta.role || localUser?.role || 'citizen').toLowerCase(),
        points: localUser?.points || 150,
        badge: localUser?.badge || 'Active Member'
      };

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        token: authRes.data.access_token,
        user
      });
    } catch (err) {
      console.error('[Auth Login Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Redeem Points
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

    if (citizen) citizen.points -= pointsCost;

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
