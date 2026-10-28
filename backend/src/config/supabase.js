/**
 * Supabase Cloud Client with Zero-Latency Local Fallback
 * 
 * Communicates directly with Supabase PostgREST endpoints.
 * Automatically synchronizes with local storage for offline redundancy.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env
const ENV_PATH = path.join(__dirname, '..', '..', '.env');
const BACKEND_ENV_PATH = path.join(__dirname, '..', '.env');

function loadEnvironment() {
  const targetPath = fs.existsSync(BACKEND_ENV_PATH) ? BACKEND_ENV_PATH : (fs.existsSync(ENV_PATH) ? ENV_PATH : null);
  if (!targetPath) return;

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (e) {
    console.error('[Config] Error reading .env file:', e.message);
  }
}

loadEnvironment();

const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');
const STORAGE_FILE = path.join(__dirname, '..', 'data', 'storage.json');

// Local Storage Fallback
function getLocalStorage() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      const initialData = fs.readFileSync(SEED_FILE, 'utf8');
      fs.writeFileSync(STORAGE_FILE, initialData, 'utf8');
    }
    return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
  } catch (error) {
    return { issues: [], contractors: [], leaderboard: [] };
  }
}

function saveLocalStorage(data) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[Database] Failed to write storage file:', error.message);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Generic Supabase REST request with 2.5s timeout
function supabaseRequest(endpoint, method = 'GET', body = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return Promise.reject(new Error('Supabase not configured'));
  }

  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(`/rest/v1/${endpoint}`, SUPABASE_URL);
      const payload = body ? JSON.stringify(body) : null;

      const req = https.request(parsedUrl, {
        method,
        timeout: 2500,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : 'count=none'),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(raw ? JSON.parse(raw) : null);
            } catch (e) {
              resolve(null);
            }
          } else {
            reject(new Error(`Supabase error ${res.statusCode}: ${raw}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Supabase connection timeout'));
      });

      req.on('error', reject);

      if (payload) req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Data Mappers (DB Snake_Case <-> App CamelCase)
function mapDbIssueToApp(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    location: {
      address: row.location_address || '',
      lat: row.lat || 28.6139,
      lng: row.lng || 77.2090
    },
    reportedBy: row.reported_by,
    reportedAt: row.created_at,
    imageUrl: row.image_url,
    assignedTo: row.assigned_to,
    resolution: row.resolution,
    aiMetadata: row.ai_metadata
  };
}

function mapAppIssueToDb(issue) {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    location_address: issue.location?.address || '',
    lat: issue.location?.lat || null,
    lng: issue.location?.lng || null,
    image_url: issue.imageUrl,
    reported_by: issue.reportedBy,
    assigned_to: issue.assignedTo,
    resolution: issue.resolution,
    ai_metadata: issue.aiMetadata
  };
}

// High-Level Data Service
const dataService = {
  async getIssues() {
    try {
      const rows = await supabaseRequest('issues?select=*&order=created_at.desc');
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(mapDbIssueToApp);
        // Sync local storage in background
        const local = getLocalStorage();
        local.issues = mapped;
        saveLocalStorage(local);
        return mapped;
      }
    } catch (err) {
      console.warn('[DataService] Supabase read fallback:', err.message);
    }
    return getLocalStorage().issues;
  },

  async createIssue(issue) {
    // 1. Save locally first for instant UI response
    const local = getLocalStorage();
    local.issues.unshift(issue);
    saveLocalStorage(local);

    // 2. Persist to Supabase Cloud asynchronously
    try {
      const dbPayload = mapAppIssueToDb(issue);
      await supabaseRequest('issues', 'POST', dbPayload);
      console.log(`[DataService] ✅ Issue ${issue.id} synced to Supabase Cloud`);
    } catch (err) {
      console.warn(`[DataService] Supabase cloud sync deferred for ${issue.id}:`, err.message);
    }

    return issue;
  },

  async updateIssue(issueId, updates) {
    const local = getLocalStorage();
    const issue = local.issues.find(i => i.id === issueId);
    if (!issue) return null;

    Object.assign(issue, updates);
    saveLocalStorage(local);

    try {
      const dbPayload = mapAppIssueToDb(issue);
      await supabaseRequest(`issues?id=eq.${issueId}`, 'PATCH', dbPayload);
      console.log(`[DataService] ✅ Issue ${issueId} updated in Supabase Cloud`);
    } catch (err) {
      console.warn(`[DataService] Supabase update deferred for ${issueId}:`, err.message);
    }

    return issue;
  },

  async getContractors() {
    try {
      const rows = await supabaseRequest('contractors?select=*');
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          rating: Number(r.rating),
          completedJobs: r.completed_jobs,
          activeJobs: r.active_jobs,
          avgTurnaroundHours: Number(r.avg_turnaround_hours)
        }));
        const local = getLocalStorage();
        local.contractors = mapped;
        saveLocalStorage(local);
        return mapped;
      }
    } catch (err) {
      console.warn('[DataService] Contractor fallback:', err.message);
    }
    return getLocalStorage().contractors;
  },

  async getLeaderboard() {
    try {
      const rows = await supabaseRequest('leaderboard?select=*&order=points.desc');
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map((r, idx) => ({
          rank: idx + 1,
          userId: r.user_id,
          name: r.name,
          points: r.points,
          issuesResolved: r.issues_resolved,
          badge: r.badge,
          tier: r.tier
        }));
        const local = getLocalStorage();
        local.leaderboard = mapped;
        saveLocalStorage(local);
        return mapped;
      }
    } catch (err) {
      console.warn('[DataService] Leaderboard fallback:', err.message);
    }
    return getLocalStorage().leaderboard;
  },

  resetToSeed() {
    const initialData = fs.readFileSync(SEED_FILE, 'utf8');
    fs.writeFileSync(STORAGE_FILE, initialData, 'utf8');
    return JSON.parse(initialData);
  }
};

module.exports = {
  dataService,
  getLocalStorage,
  saveLocalStorage
};
