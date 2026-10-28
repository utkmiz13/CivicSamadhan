/**
 * CivicSamadhan Master Application Controller
 */

import { appState } from './state.js';
import { apiClient } from './api.js';
import { citizenView } from './views/citizenView.js';
import { municipalityView } from './views/municipalityView.js';
import { contractorView } from './views/contractorView.js';
import { rewardsView } from './views/rewardsView.js';

class ApplicationController {
  constructor() {
    this.activeSection = 'home';
    this.currentFontSize = 14;
    this.activeVerifyIssueId = null;
    this.authMode = 'signup'; // 'signup' or 'login'
  }

  async init() {
    this.setupEventListeners();
    this.updateUserSessionUI();
    this.renderGovPortals();
    await this.refreshData();
    this.switchSection('home');
  }

  setupEventListeners() {
    // Navigation
    ['home', 'lodge', 'track', 'municipality', 'contractor', 'rewards', 'portals'].forEach(sec => {
      document.getElementById(`nav-${sec}`)?.addEventListener('click', () => this.switchSection(sec));
    });

    // Demo presets
    ['pothole', 'garbage', 'wire', 'water'].forEach(key => {
      document.getElementById(`preset-${key}`)?.addEventListener('click', () => citizenView.applyPreset(key));
    });

    // Forms
    document.getElementById('citizen-report-form')?.addEventListener('submit', e => citizenView.handleSubmit(e));
    document.getElementById('municipality-filter')?.addEventListener('change', () => municipalityView.renderTable());
    document.getElementById('auth-form')?.addEventListener('submit', e => this.handleAuthSubmit(e));
  }

  async refreshData() {
    try {
      const [issuesRes, contractorsRes, statsRes, leaderboardRes] = await Promise.all([
        apiClient.fetchIssues(),
        apiClient.fetchContractors(),
        apiClient.fetchStats(),
        apiClient.fetchLeaderboard()
      ]);

      if (issuesRes.success) appState.issues = issuesRes.data;
      if (contractorsRes.success) appState.contractors = contractorsRes.data;
      if (statsRes.success) appState.stats = statsRes.data;
      if (leaderboardRes.success) appState.leaderboard = leaderboardRes.data;

      // Sync user points from leaderboard if exists
      if (appState.currentUser) {
        const userInBoard = appState.leaderboard.find(u => u.userId === appState.currentUser.id || u.name.includes(appState.currentUser.name));
        if (userInBoard) {
          appState.currentUser.points = userInBoard.points;
          localStorage.setItem('civic_user', JSON.stringify(appState.currentUser));
        }
      }

      this.updateUserSessionUI();
      this.renderHomeStats();
      this.renderCurrentView();
    } catch (err) {
      console.error('[App] State refresh error:', err);
    }
  }

  // User Authentication & OTP Flow
  openAuthModal(mode = 'signup') {
    this.authMode = mode;
    this.authStep = 'details';

    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const sub = document.getElementById('auth-modal-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const signupFields = document.querySelectorAll('.auth-signup-only');
    const tabSignup = document.getElementById('auth-tab-signup');
    const tabLogin = document.getElementById('auth-tab-login');
    const stepDetails = document.getElementById('auth-step-details');
    const stepOtp = document.getElementById('auth-step-otp');

    if (stepDetails) stepDetails.classList.remove('hidden');
    if (stepOtp) stepOtp.classList.add('hidden');

    if (mode === 'signup') {
      if (title) title.textContent = 'Create Citizen / Contractor Account';
      if (sub) sub.textContent = 'Register with email & password, verify via OTP, and earn +100 bonus tokens.';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i> Send Verification OTP (+100 Bonus Pts)';
      signupFields.forEach(el => el.classList.remove('hidden'));
      if (tabSignup) {
        tabSignup.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-gov-blue text-gov-blue transition';
      }
      if (tabLogin) {
        tabLogin.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-gov-blue transition';
      }
    } else {
      if (title) title.textContent = 'Sign In to CivicSamadhan';
      if (sub) sub.textContent = 'Enter your registered email and password to access your civic wallet and tasks.';
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-1.5"></i> Sign In';
      signupFields.forEach(el => el.classList.add('hidden'));
      if (tabLogin) {
        tabLogin.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-gov-blue text-gov-blue transition';
      }
      if (tabSignup) {
        tabSignup.className = 'flex-1 py-2 text-center text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-gov-blue transition';
      }
    }

    modal?.classList.remove('hidden');
  }

  closeAuthModal() {
    document.getElementById('auth-modal')?.classList.add('hidden');
  }

  async handleAuthSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('auth-name')?.value?.trim();
    const email = document.getElementById('auth-email')?.value?.trim();
    const phone = document.getElementById('auth-phone')?.value?.trim();
    const role = document.getElementById('auth-role')?.value || 'citizen';
    const password = document.getElementById('auth-password')?.value;

    const submitBtn = document.getElementById('auth-submit-btn');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...';
    }

    try {
      if (this.authMode === 'signup') {
        const res = await apiClient.sendOtp({ name, email, phone, role, password });
        this.pendingSignupData = { name, email, phone, role, password };

        // Switch to OTP step inside modal
        this.authStep = 'otp';
        const stepDetails = document.getElementById('auth-step-details');
        const stepOtp = document.getElementById('auth-step-otp');
        const otpTargetEmail = document.getElementById('otp-target-email');
        const otpInput = document.getElementById('auth-otp-input');

        if (stepDetails) stepDetails.classList.add('hidden');
        if (stepOtp) stepOtp.classList.remove('hidden');
        if (otpTargetEmail) otpTargetEmail.textContent = email;

        if (otpInput) {
          otpInput.value = '';
          setTimeout(() => otpInput.focus(), 150);
        }

        if (res.rateLimited && res.fallbackOtp) {
          this.showToast(`⚠️ Supabase email limit reached (3/hr). For immediate testing, OTP is: ${res.fallbackOtp}`, 'info');
        } else {
          this.showToast(res.message || `📧 6-digit OTP sent to ${email}! Check your inbox.`, 'info');
        }
      } else {
        const res = await apiClient.login({ email, password });
        if (res.success && res.user) {
          appState.currentUser = res.user;
          localStorage.setItem('civic_user', JSON.stringify(res.user));
          this.updateUserSessionUI();
          this.closeAuthModal();
          this.showToast(res.message || `Welcome back, ${res.user.name}!`, 'success');
          await this.refreshData();

          // Direct user based on role
          if (res.user.role === 'contractor') {
            this.switchSection('contractor');
          } else if (res.user.role === 'municipality') {
            this.switchSection('municipality');
          }
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }

  backToDetails() {
    this.authStep = 'details';
    document.getElementById('auth-step-details')?.classList.remove('hidden');
    document.getElementById('auth-step-otp')?.classList.add('hidden');
  }

  async resendOtp() {
    if (!this.pendingSignupData) {
      this.backToDetails();
      return;
    }
    try {
      this.showToast('Re-dispatching OTP to ' + this.pendingSignupData.email + '...', 'info');
      const res = await apiClient.sendOtp(this.pendingSignupData);
      this.showToast(res.message || 'New OTP dispatched! Check your email inbox.', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleOtpVerify() {
    const otpInput = document.getElementById('auth-otp-input');
    const otp = otpInput?.value?.trim();
    if (!otp || otp.length !== 6) {
      this.showToast('Please enter the full 6-digit OTP code received in your email.', 'error');
      return;
    }

    if (!this.pendingSignupData) {
      this.showToast('Session expired. Please fill your registration details again.', 'error');
      this.backToDetails();
      return;
    }

    const verifyBtn = document.getElementById('auth-verify-btn');
    const origText = verifyBtn ? verifyBtn.innerHTML : '';
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Verifying with Supabase & Storing Password...';
    }

    try {
      const res = await apiClient.verifyOtp({
        email: this.pendingSignupData.email,
        otp,
        password: this.pendingSignupData.password,
        name: this.pendingSignupData.name,
        phone: this.pendingSignupData.phone,
        role: this.pendingSignupData.role
      });

      if (res.success && res.user) {
        appState.currentUser = res.user;
        localStorage.setItem('civic_user', JSON.stringify(res.user));
        this.updateUserSessionUI();
        this.closeAuthModal();
        this.showToast(res.message || `🎉 Welcome to CivicSamadhan, ${res.user.name}!`, 'success');
        await this.refreshData();

        if (res.user.role === 'contractor') {
          this.switchSection('contractor');
        } else if (res.user.role === 'municipality') {
          this.switchSection('municipality');
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = origText;
      }
    }
  }

  signOut() {
    appState.currentUser = null;
    localStorage.removeItem('civic_user');
    this.updateUserSessionUI();
    this.showToast('Signed out successfully.', 'info');
    this.switchSection('home');
  }

  updateUserSessionUI() {
    const authActions = document.getElementById('header-auth-actions');
    const userChip = document.getElementById('header-user-chip');
    const userName = document.getElementById('header-user-name');
    const userPoints = document.getElementById('header-user-points');
    const userRole = document.getElementById('header-user-role');

    if (!authActions || !userChip) return;

    if (appState.currentUser) {
      authActions.classList.add('hidden');
      userChip.classList.remove('hidden');
      if (userName) userName.textContent = appState.currentUser.name;
      if (userPoints) userPoints.textContent = `${appState.currentUser.points} Pts`;
      if (userRole) userRole.textContent = appState.currentUser.role.toUpperCase();
    } else {
      authActions.classList.remove('hidden');
      userChip.classList.add('hidden');
    }

    // Update mini-cards across views
    const citizenPts = document.getElementById('citizen-points');
    const citizenName = document.getElementById('citizen-name');
    if (citizenPts && appState.currentUser) citizenPts.textContent = appState.currentUser.points;
    if (citizenName && appState.currentUser) citizenName.textContent = appState.currentUser.name;
  }

  // Redeem Reward Action
  async redeemPerkAction(perkTitle, pointsCost) {
    if (!appState.currentUser) {
      this.openAuthModal('signup');
      this.showToast('Please sign in or create an account to redeem rewards.', 'info');
      return;
    }

    if (appState.currentUser.points < pointsCost) {
      this.showToast(`Insufficient points! You need ${pointsCost - appState.currentUser.points} more points.`, 'error');
      return;
    }

    try {
      const res = await apiClient.redeemPerk({
        userId: appState.currentUser.id,
        perkTitle,
        pointsCost
      });

      if (res.success) {
        appState.currentUser.points = res.remainingPoints;
        localStorage.setItem('civic_user', JSON.stringify(appState.currentUser));

        appState.claimedVouchers.unshift({
          title: perkTitle,
          code: res.voucherCode,
          date: new Date().toLocaleDateString(),
          points: pointsCost
        });

        this.updateUserSessionUI();
        rewardsView.render();
        this.showToast(`🎉 Success! Voucher code: ${res.voucherCode}`, 'success');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // Government Portals Grid
  renderGovPortals() {
    const container = document.getElementById('gov-portals-grid');
    if (!container) return;

    container.innerHTML = '';
    appState.govPortals.forEach(portal => {
      const card = document.createElement('div');
      card.className = 'p-5 rounded-xl bg-white border border-gov-border shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3';

      card.innerHTML = `
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="w-10 h-10 rounded-lg bg-blue-50 text-gov-blue flex items-center justify-center text-lg">
              <i class="fa-solid ${portal.icon}"></i>
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-ash text-slate-700 border border-slate-300">
              ${portal.badge}
            </span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-sm">${portal.name}</h4>
            <p class="text-xs font-semibold text-gov-blue">${portal.title}</p>
          </div>
          <p class="text-[11px] text-slate-500 leading-relaxed">${portal.ministry}</p>
        </div>

        <a href="${portal.url}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 rounded-lg bg-gov-ash hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-300">
          <span>Visit Official Portal</span>
          <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      `;

      container.appendChild(card);
    });
  }

  renderHomeStats() {
    const s = appState.stats;
    if (!s) return;

    const elTotal = document.getElementById('home-stat-total');
    const elResolved = document.getElementById('home-stat-resolved');
    const elProgress = document.getElementById('home-stat-inprogress');
    const elPending = document.getElementById('home-stat-pending');

    if (elTotal) elTotal.textContent = s.totalIssues;
    if (elResolved) elResolved.textContent = s.resolved;
    if (elProgress) elProgress.textContent = s.inProgress;
    if (elPending) elPending.textContent = s.pending;
  }

  switchSection(section) {
    this.activeSection = section;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active', 'bg-gov-navy', 'border-gov-saffron');
      btn.classList.add('border-transparent');
    });

    const activeNav = document.getElementById(`nav-${section}`);
    if (activeNav) {
      activeNav.classList.add('active', 'bg-gov-navy', 'border-gov-saffron');
      activeNav.classList.remove('border-transparent');
    }

    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.add('hidden');
      sec.classList.remove('block');
    });

    const activeSec = document.getElementById(`section-${section}`);
    if (activeSec) {
      activeSec.classList.remove('hidden');
      activeSec.classList.add('block');
    }

    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentView() {
    switch (this.activeSection) {
      case 'home':
        this.renderHomeStats();
        break;
      case 'lodge':
        citizenView.render();
        break;
      case 'track':
        citizenView.renderReportsList();
        break;
      case 'municipality':
        municipalityView.render();
        break;
      case 'contractor':
        contractorView.render();
        break;
      case 'rewards':
        rewardsView.render();
        break;
      case 'portals':
        this.renderGovPortals();
        break;
    }
  }

  adjustFontSize(delta) {
    if (delta === 0) {
      this.currentFontSize = 14;
    } else {
      this.currentFontSize = Math.max(12, Math.min(20, this.currentFontSize + delta * 2));
    }
    document.documentElement.style.fontSize = `${this.currentFontSize}px`;
  }

  searchDocket() {
    const input = document.getElementById('track-search-input')?.value.trim().toLowerCase();
    if (!input) {
      citizenView.renderReportsList();
      return;
    }

    const filtered = appState.issues.filter(i => 
      i.id.toLowerCase().includes(input) || 
      i.title.toLowerCase().includes(input) ||
      i.category.toLowerCase().includes(input)
    );

    const container = document.getElementById('citizen-issues-list');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
          <p class="font-bold text-sm">No Grievance Found with Docket ID "${input}"</p>
          <p class="text-xs text-slate-400 mt-1">Please verify the docket reference number and retry.</p>
        </div>
      `;
      return;
    }

    citizenView.renderSpecificList(filtered);
  }

  openAssignModal(issueId) {
    municipalityView.openAssignModal(issueId);
  }

  closeAssignModal() {
    municipalityView.closeAssignModal();
  }

  confirmAssignment() {
    municipalityView.confirmAssignment();
  }

  submitContractorWork(issueId) {
    contractorView.handleResolutionSubmit(issueId);
  }

  openVerifyModal(issueId) {
    this.activeVerifyIssueId = issueId;
    const issue = appState.issues.find(i => i.id === issueId);
    if (!issue || !issue.resolution) return;

    const beforeImg = document.getElementById('verify-before-img');
    const afterImg = document.getElementById('verify-after-img');
    const notesElem = document.getElementById('verify-notes');

    if (beforeImg) beforeImg.src = issue.imageUrl;
    if (afterImg) afterImg.src = issue.resolution.resolvedImageUrl;
    if (notesElem) notesElem.textContent = issue.resolution.notes;

    document.getElementById('verify-modal')?.classList.remove('hidden');
  }

  closeVerifyModal() {
    document.getElementById('verify-modal')?.classList.add('hidden');
    this.activeVerifyIssueId = null;
  }

  async confirmCitizenVerification() {
    if (!this.activeVerifyIssueId) return;

    try {
      const response = await apiClient.verifyResolution(this.activeVerifyIssueId, 'Resolution confirmed! Clean repair job.', true);
      if (response.success) {
        this.showToast('🎉 Grievance verified and disposed! +45 Civic Tokens awarded to your wallet!', 'success');
        this.closeVerifyModal();
        await this.refreshData();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async resetDemoData() {
    try {
      const res = await apiClient.resetDatabase();
      if (res.success) {
        this.showToast('🔄 Database reset to original seed state.', 'success');
        await this.refreshData();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let bg = 'bg-gov-navy border-gov-blue text-white';
    if (type === 'success') bg = 'bg-emerald-900 border-emerald-500 text-white';
    if (type === 'error') bg = 'bg-rose-900 border-rose-500 text-white';

    toast.className = `pointer-events-auto px-4 py-3 rounded-lg border shadow-xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-4 opacity-0 ${bg}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 3500);
    }, 3800);
  }
}

window.app = new ApplicationController();
document.addEventListener('DOMContentLoaded', () => window.app.init());
