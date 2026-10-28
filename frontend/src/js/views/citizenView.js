/**
 * Citizen Grievance View Component
 */

import { appState } from '../state.js';
import { apiClient } from '../api.js';

export const citizenView = {
  activePresetKey: 'pothole',

  render() {
    this.renderProfile();
    this.applyPreset(this.activePresetKey);
    this.renderReportsList();
  },

  renderProfile() {
    const pointsElem = document.getElementById('citizen-points');
    const badgeElem = document.getElementById('citizen-badge');
    if (pointsElem) pointsElem.textContent = appState.user.points;
    if (badgeElem) badgeElem.textContent = appState.user.badge;
  },

  applyPreset(presetKey) {
    this.activePresetKey = presetKey;
    const p = appState.presets[presetKey];
    if (!p) return;

    const titleInput = document.getElementById('report-title');
    const categorySelect = document.getElementById('report-category');
    const photoPreview = document.getElementById('photo-preview');
    const locationText = document.getElementById('report-location-text');
    const aiDetected = document.getElementById('ai-detected');
    const aiConf = document.getElementById('ai-conf');
    const aiSev = document.getElementById('ai-sev');

    if (titleInput) titleInput.value = p.title;
    if (categorySelect) categorySelect.value = p.category;
    if (photoPreview) photoPreview.src = p.imageUrl;
    if (locationText) locationText.textContent = `${p.address} (${p.lat}° N, ${p.lng}° E)`;
    if (aiDetected) aiDetected.textContent = p.detected;
    if (aiConf) aiConf.textContent = p.conf;
    if (aiSev) aiSev.textContent = p.sev;

    // Highlight flash
    const aiBox = document.getElementById('ai-scan-result');
    if (aiBox) {
      aiBox.classList.add('ring-2', 'ring-gov-blue');
      setTimeout(() => aiBox.classList.remove('ring-2', 'ring-gov-blue'), 400);
    }
  },

  renderReportsList() {
    this.renderSpecificList(appState.issues);
  },

  renderSpecificList(issueList) {
    const container = document.getElementById('citizen-issues-list');
    if (!container) return;

    container.innerHTML = '';
    issueList.forEach(issue => {
      const isUnderVerification = issue.status === 'Under Verification';
      const isResolved = issue.status === 'Resolved';
      const isInProgress = issue.status === 'In Progress';

      let statusColor = 'bg-slate-100 text-slate-700 border-slate-300';
      if (issue.status === 'Pending') statusColor = 'bg-amber-50 text-amber-800 border-amber-300';
      if (issue.status === 'In Progress') statusColor = 'bg-blue-50 text-gov-blue border-blue-300';
      if (issue.status === 'Under Verification') statusColor = 'bg-purple-50 text-purple-800 border-purple-300';
      if (issue.status === 'Resolved') statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';

      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-3';

      let actionHtml = '';
      if (isUnderVerification) {
        actionHtml = `
          <div class="pt-2 border-t border-slate-100">
            <button onclick="window.app.openVerifyModal('${issue.id}')" class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition">
              <i class="fa-solid fa-camera"></i> Inspect Field Resolution Proof (+45 Tokens)
            </button>
          </div>
        `;
      }

      // Step progress tracker
      let step1 = 'bg-emerald-500 text-white';
      let step2 = issue.status !== 'Pending' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500';
      let step3 = (isUnderVerification || isResolved) ? 'bg-emerald-500 text-white' : (isInProgress ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500');
      let step4 = isResolved ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500';

      card.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-gov-navy font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300">${issue.id}</span>
              <span class="text-[11px] text-slate-500">${new Date(issue.reportedAt).toLocaleDateString()}</span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm mt-1">${issue.title}</h4>
            <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> ${issue.location?.address || 'Geotagged Coordinates'}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded text-xs font-bold border ${statusColor}">
              ${issue.status}
            </span>
          </div>
        </div>

        <!-- 4-Stage Redressal Lifecycle Timeline -->
        <div class="py-1">
          <div class="flex items-center justify-between text-[10px] font-semibold text-slate-600 text-center">
            <div class="flex-1 flex flex-col items-center">
              <span class="w-5 h-5 rounded-full ${step1} flex items-center justify-center text-[10px] mb-1 font-bold">1</span>
              <span>Lodged</span>
            </div>
            <div class="h-0.5 flex-1 bg-slate-200 mx-1"></div>
            <div class="flex-1 flex flex-col items-center">
              <span class="w-5 h-5 rounded-full ${step2} flex items-center justify-center text-[10px] mb-1 font-bold">2</span>
              <span>Assigned</span>
            </div>
            <div class="h-0.5 flex-1 bg-slate-200 mx-1"></div>
            <div class="flex-1 flex flex-col items-center">
              <span class="w-5 h-5 rounded-full ${step3} flex items-center justify-center text-[10px] mb-1 font-bold">3</span>
              <span>Repairing</span>
            </div>
            <div class="h-0.5 flex-1 bg-slate-200 mx-1"></div>
            <div class="flex-1 flex flex-col items-center">
              <span class="w-5 h-5 rounded-full ${step4} flex items-center justify-center text-[10px] mb-1 font-bold">4</span>
              <span>Disposed</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Category: <strong class="text-slate-800">${issue.category}</strong></span>
          <span>Severity: <strong class="text-amber-700">${issue.severity}</strong></span>
        </div>

        ${actionHtml}
      `;

      container.appendChild(card);
    });
  },

  async handleSubmit(event) {
    event.preventDefault();
    const p = appState.presets[this.activePresetKey] || appState.presets.pothole;
    const title = document.getElementById('report-title')?.value || p.title;
    const category = document.getElementById('report-category')?.value || p.category;

    const payload = {
      title,
      description: `Civic grievance registered and geotagged near ${p.address}`,
      category,
      imageUrl: p.imageUrl,
      location: {
        address: p.address,
        lat: p.lat,
        lng: p.lng
      }
    };

    try {
      const response = await apiClient.createIssue(payload);
      if (response.success) {
        window.app.showToast(`🎉 Grievance registered under Docket #${response.data.id}! +15 Civic Tokens awarded.`, 'success');
        appState.user.points += 15;
        await window.app.refreshData();
        window.app.switchSection('track');
      }
    } catch (err) {
      window.app.showToast(err.message, 'error');
    }
  }
};
