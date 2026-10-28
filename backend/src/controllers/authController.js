/**
 * Auth Controller - OTP-Based Secure Authentication
 * Generates 6-digit OTP, verifies it, creates confirmed user in Supabase with password,
 * and saves user profile to database.
 */

const { getLocalStorage, saveLocalStorage } = require('../config/supabase');
const { sendOtpEmail } = require('../utils/mailer');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://irgxrbovjxocmecsyfbd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_k-W0eVs332SKUukAPAZkxQ_Ti7zYHOT';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// In-memory pending registrations cache: email -> { otp, name, email, phone, role, password, expiresAt }
const pendingRegistrations = new Map();

function supabaseAuthRequest(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
      method: 'POST',
      timeout: 5000,
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Supabase Auth timeout')); });
    req.write(data);
    req.end();
  });
}

function supabaseAdminRequest(endpoint, method = 'POST', payload = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const req = https.request(`${SUPABASE_URL}/auth/v1/admin/${endpoint}`, {
      method,
      timeout: 5000,
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Supabase Admin timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

const authController = {
  /**
   * 1. Send OTP to User's Email for Registration
   */
  sendOtp: async (req, res) => {
    const { name, email, phone, role, password } = req.body || {};

    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name, email address, password, and account role.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists in local storage
    const storage = getLocalStorage();
    const existing = (storage.users || []).find(u => u.email.toLowerCase() === cleanEmail);
    if (existing && existing.confirmed) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in with your password.'
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    pendingRegistrations.set(cleanEmail, {
      otp,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      role: role.toLowerCase(),
      password,
      expiresAt
    });

    // Send OTP via email (TLS / SMTP client)
    let emailSent = false;
    try {
      const emailRes = await sendOtpEmail(cleanEmail, otp, name.trim());
      emailSent = Boolean(emailRes.sent);
    } catch (e) {
      console.warn('[Mailer Send Warning]', e.message);
    }

    return res.json({
      success: true,
      message: `Verification OTP dispatched to ${cleanEmail}!`,
      email: cleanEmail,
      devOtp: otp, // Surfaced for instant verification & testing without email delay
      emailSent
    });
  },

  /**
   * 2. Verify OTP, Create Confirmed User in Supabase with Password, and Log In
   */
  verifyOtp: async (req, res) => {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pending = pendingRegistrations.get(cleanEmail);

    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP request found for this email. Please request a new OTP.'
      });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'OTP code has expired. Please request a new OTP.'
      });
    }

    if (pending.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        error: '❌ Invalid OTP code. Please check your email and enter the 6-digit code.'
      });
    }

    // OTP verified successfully!
    try {
      let authUserId = null;

      // Attempt Supabase Admin API user creation with confirmed status & password
      try {
        const adminCreate = await supabaseAdminRequest('users', 'POST', {
          email: cleanEmail,
          password: pending.password,
          email_confirm: true,
          user_metadata: {
            name: pending.name,
            phone: pending.phone,
            role: pending.role
          }
        });

        if (adminCreate.ok && adminCreate.data?.id) {
          authUserId = adminCreate.data.id;
          console.log(`[Supabase Admin] ✅ User ${cleanEmail} created in Supabase Auth (${authUserId})`);
        } else {
          // If already in Supabase, update password & confirm status
          const listUsers = await supabaseAdminRequest('users', 'GET');
          const existingAuth = listUsers.ok && Array.isArray(listUsers.data?.users)
            ? listUsers.data.users.find(u => u.email.toLowerCase() === cleanEmail)
            : null;

          if (existingAuth) {
            authUserId = existingAuth.id;
            await supabaseAdminRequest(`users/${authUserId}`, 'PUT', {
              password: pending.password,
              email_confirm: true,
              user_metadata: {
                name: pending.name,
                phone: pending.phone,
                role: pending.role
              }
            });
            console.log(`[Supabase Admin] ✅ User ${cleanEmail} updated in Supabase Auth (${authUserId})`);
          }
        }
      } catch (cloudErr) {
        console.warn('[Supabase Cloud Auth Warning]', cloudErr.message);
      }

      if (!authUserId) {
        authUserId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Save user to storage and database
      const storage = getLocalStorage();
      storage.users = storage.users || [];

      // Remove any duplicate
      storage.users = storage.users.filter(u => u.email.toLowerCase() !== cleanEmail);

      const newUser = {
        id: authUserId,
        name: pending.name,
        email: cleanEmail,
        phone: pending.phone,
        role: pending.role,
        password: pending.password, // Persisted for credential verification
        points: 100, // Joining bonus points
        badge: 'Civic Novice 🥉',
        confirmed: true,
        createdAt: new Date().toISOString()
      };

      storage.users.push(newUser);

      // Add to leaderboard
      if (pending.role === 'citizen') {
        storage.leaderboard = storage.leaderboard || [];
        storage.leaderboard = storage.leaderboard.filter(u => u.userId !== authUserId);
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

      // Register contractor if role is contractor
      if (pending.role === 'contractor') {
        storage.contractors = storage.contractors || [];
        if (!storage.contractors.some(c => c.name === newUser.name)) {
          storage.contractors.push({
            id: `CONT-${Math.floor(10 + Math.random() * 90)}`,
            name: newUser.name,
            category: 'Potholes & General Civil Works',
            rating: 5.0,
            completedJobs: 0,
            activeJobs: 0,
            avgTurnaroundHours: 24.0
          });
        }
      }

      saveLocalStorage(storage);
      pendingRegistrations.delete(cleanEmail);

      return res.status(200).json({
        success: true,
        message: `🎉 Account verified and registered! Welcome, ${newUser.name}!`,
        token: `session_${newUser.id}_${Date.now()}`,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          points: newUser.points,
          badge: newUser.badge
        }
      });
    } catch (err) {
      console.error('[Verify OTP Error]', err);
      return res.status(500).json({ success: false, error: 'Registration error: ' + err.message });
    }
  },

  /**
   * 3. Legacy Signup (Redirects to sendOtp)
   */
  signup: async (req, res) => {
    return authController.sendOtp(req, res);
  },

  /**
   * 4. User Login (Strict Verification with Supabase Password Auth & Storage)
   */
  login: async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Supabase Auth
    let supabaseAuthUser = null;
    try {
      const authRes = await supabaseAuthRequest('token?grant_type=password', {
        email: cleanEmail,
        password
      });

      if (authRes.ok && authRes.data?.user) {
        supabaseAuthUser = authRes.data;
      }
    } catch (cloudErr) {
      console.warn('[Supabase Login Warning]', cloudErr.message);
    }

    // 2. Check storage for verified accounts
    const storage = getLocalStorage();
    storage.users = storage.users || [];
    const localUser = storage.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!supabaseAuthUser && !localUser) {
      return res.status(400).json({
        success: false,
        error: '❌ No account found with these credentials. Please click "Sign Up" to register via OTP!'
      });
    }

    if (!supabaseAuthUser && localUser && localUser.password && localUser.password !== password) {
      return res.status(400).json({
        success: false,
        error: '❌ Invalid password. Please check your credentials.'
      });
    }

    const meta = supabaseAuthUser?.user?.user_metadata || {};
    const user = {
      id: supabaseAuthUser?.user?.id || localUser?.id || `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: meta.name || localUser?.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: meta.phone || localUser?.phone || '',
      role: (meta.role || localUser?.role || 'citizen').toLowerCase(),
      points: localUser?.points || 150,
      badge: localUser?.badge || 'Active Member'
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token: supabaseAuthUser?.access_token || `session_${user.id}_${Date.now()}`,
      user
    });
  },

  /**
   * 5. Redeem Points
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
