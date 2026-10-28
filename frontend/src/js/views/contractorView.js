/**
 * Contractor Field Operations View Component
 */

import { appState } from '../state.js';
import { apiClient } from '../api.js';

export const contractorView = {
  render() {
    const container = document.getElementById('contractor-orders-grid');
    if (!container) return;

    container.innerHTML = '';
    const activeTasks = appState.issues.filter(i => i.status === 'In Progress' || i.status === 'Under Verification');
    
    const countElem = document.getElementById('contractor-active-count');
    if (countElem) countElem.textContent = activeTasks.length;

    if (activeTasks.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 p-8 text-center text-slate-500 bg-white rounded-xl border border-gov-border">
          <i class="fa-solid fa-circle-check text-3xl mb-2 text-emerald-600"></i>
          <p class="text-sm font-bold text-slate-700">No pending work orders.</p>
          <p class="text-xs text-slate-400 mt-0.5">All assigned civic infrastructure repair dockets are clear!</p>
        </div>
      `;
      return;
    }

    activeTasks.forEach(issue => {
      const card = document.createElement('div');
      card.className = 'p-5 rounded-xl bg-white border border-gov-border shadow-sm space-y-4';
      const isSubmitted = issue.status === 'Under Verification';

      card.innerHTML = `
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span class="text-[10px] font-mono text-gov-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">SLA: ${issue.assignedTo?.slaHours || 24}h Enforced</span>
            <h4 class="font-bold text-slate-900 text-sm mt-1.5">${issue.title}</h4>
            <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> ${issue.location?.address}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 border border-slate-300 text-slate-700">
            ${issue.status}
          </span>
        </div>

        <div>
          <p class="text-[11px] text-slate-600 font-bold mb-1">Citizen Reported Evidence:</p>
          <img src="${issue.imageUrl}" class="w-full h-44 object-cover rounded-lg border border-slate-200">
        </div>

        ${isSubmitted ? `
          <div class="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800 flex items-center gap-2">
            <i class="fa-solid fa-hourglass-half text-purple-600 text-sm"></i>
            <span>Resolution proof submitted. Awaiting citizen confirmation before milestone payment clearance.</span>
          </div>
        ` : `
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label class="block text-[11px] text-slate-600 font-bold mb-1">Field Technician Execution Notes</label>
              <input type="text" id="contractor-notes-${issue.id}" placeholder="e.g. Bitumen asphalt leveling completed, drainage slope verified." class="w-full px-3 py-2 bg-gov-ash border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-gov-blue">
            </div>

            <button onclick="window.app.submitContractorWork('${issue.id}')" class="w-full py-2.5 px-4 rounded-lg bg-gov-saffron hover:bg-amber-500 text-gov-navy font-bold text-xs shadow transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-camera"></i> Upload After-Photo & Submit For Verification
            </button>
          </div>
        `}
      `;

      container.appendChild(card);
    });
  },

  async handleResolutionSubmit(issueId) {
    const notesInput = document.getElementById(`contractor-notes-${issueId}`);
    const notes = notesInput?.value || 'Field repairs executed to municipal specifications.';
    const resolvedImageUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80';

    try {
      const response = await apiClient.submitResolution(issueId, resolvedImageUrl, notes);
      if (response.success) {
        window.app.showToast('Resolution proof submitted! Citizen notified for verification.', 'success');
        await window.app.refreshData();
      }
    } catch (err) {
      window.app.showToast(err.message, 'error');
    }
  }
};
