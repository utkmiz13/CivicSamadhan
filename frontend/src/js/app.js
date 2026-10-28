/**
 * CivicSamadhan Master Application Controller
 * Modeled after e-Samadhan Centralized Grievance Portal (samadhaan.ugc.ac.in)
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
  }

  async init() {
    this.setupEventListeners();
    await this.refreshData();
    this.switchSection('home');
  }

  setupEventListeners() {
    // Navigation items
    ['home', 'lodge', 'track', 'municipality', 'contractor', 'rewards'].forEach(sec => {
      document.getElementById(`nav-${sec}`)?.addEventListener('click', () => this.switchSection(sec));
    });

    // Preset selectors
    ['pothole', 'garbage', 'wire', 'water'].forEach(key => {
      document.getElementById(`preset-${key}`)?.addEventListener('click', () => citizenView.applyPreset(key));
    });

    // Grievance form
    document.getElementById('citizen-report-form')?.addEventListener('submit', e => citizenView.handleSubmit(e));

    // Municipality filter
    document.getElementById('municipality-filter')?.addEventListener('change', () => municipalityView.renderTable());
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

      // Update citizen details
      const user = appState.leaderboard.find(u => u.name.includes('Aarav') || u.userId === appState.user.id);
      if (user) {
        appState.user.points = user.points;
      }

      this.renderHomeStats();
      this.renderCurrentView();
    } catch (err) {
      console.error('[App] State refresh error:', err);
    }
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

    // Update navigation active states
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active', 'bg-gov-navy', 'border-gov-saffron');
      btn.classList.add('border-transparent');
    });

    const activeNav = document.getElementById(`nav-${section}`);
    if (activeNav) {
      activeNav.classList.add('active', 'bg-gov-navy', 'border-gov-saffron');
      activeNav.classList.remove('border-transparent');
    }

    // Toggle pages
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
    }
  }

  // Accessibility Font Sizer
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
          <p class="text-xs text-slate-400 mt-1">Please verify the reference docket number and retry.</p>
        </div>
      `;
      return;
    }

    citizenView.renderSpecificList(filtered);
  }

  // Modals
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

  claimReward(title) {
    rewardsView.claimPerk(title);
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
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

window.app = new ApplicationController();
document.addEventListener('DOMContentLoaded', () => window.app.init());
