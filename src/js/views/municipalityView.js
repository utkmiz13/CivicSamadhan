/**
 * Municipality Admin View Component
 */

import { appState } from '../state.js';
import { apiClient } from '../api.js';

let map = null;
let markers = [];

export const municipalityView = {
  activeAssignIssueId: null,

  render() {
    this.renderStats();
    this.renderTable();
    setTimeout(() => this.initOrUpdateMap(), 100);
  },

  renderStats() {
    const s = appState.stats;
    if (!s) return;

    const totalElem = document.getElementById('stat-total');
    const criticalElem = document.getElementById('stat-critical');
    const rateElem = document.getElementById('stat-rate');
    const turnaroundElem = document.getElementById('stat-turnaround');

    if (totalElem) totalElem.textContent = s.totalIssues;
    if (criticalElem) criticalElem.textContent = s.criticalHazards;
    if (rateElem) rateElem.textContent = `${s.resolutionRate}%`;
    if (turnaroundElem) turnaroundElem.textContent = `${s.avgResolutionHours}h`;
  },

  renderTable() {
    const filter = document.getElementById('municipality-filter')?.value || 'all';
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    let filtered = [...appState.issues];
    if (filter !== 'all') {
      filtered = filtered.filter(i => i.status.toLowerCase() === filter.toLowerCase());
    }

    filtered.forEach(issue => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-200';

      let sevColor = 'text-amber-700 font-semibold';
      if (issue.severity === 'Critical') sevColor = 'text-rose-700 font-bold';
      if (issue.severity === 'High') sevColor = 'text-orange-700 font-semibold';

      let actionBtn = `<span class="text-slate-400 text-[11px]">—</span>`;
      if (issue.status === 'Pending') {
        actionBtn = `
          <button onclick="window.app.openAssignModal('${issue.id}')" class="px-2.5 py-1 bg-gov-blue hover:bg-gov-navy text-white rounded text-[11px] font-bold transition shadow-sm">
            Allocate
          </button>
        `;
      } else if (issue.status === 'In Progress') {
        actionBtn = `<span class="text-gov-blue text-[11px] font-mono font-bold">Assigned</span>`;
      } else if (issue.status === 'Under Verification') {
        actionBtn = `<span class="text-purple-700 text-[11px] font-semibold">Under Inspection</span>`;
      } else if (issue.status === 'Resolved') {
        actionBtn = `<span class="text-emerald-700 text-[11px] font-bold"><i class="fa-solid fa-check"></i> Disposed</span>`;
      }

      tr.innerHTML = `
        <td class="p-2.5">
          <div class="font-bold text-slate-900 truncate max-w-[180px]">${issue.title}</div>
          <div class="text-[10px] text-slate-500 font-mono">${issue.id} • ${issue.category}</div>
        </td>
        <td class="p-2.5 ${sevColor}">${issue.severity}</td>
        <td class="p-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            ${issue.status}
          </span>
        </td>
        <td class="p-2.5 text-right">${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  initOrUpdateMap() {
    const container = document.getElementById('gis-map');
    if (!container || typeof L === 'undefined') return;

    if (!map) {
      map = L.map('gis-map', {
        zoomControl: true,
        attributionControl: false
      }).setView([28.6139, 77.2090], 11);

      // Light OpenStreetMap standard tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);
    } else {
      map.invalidateSize();
    }

    // Refresh markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    appState.issues.forEach(issue => {
      if (!issue.location?.lat || !issue.location?.lng) return;

      let markerColor = '#133E70';
      if (issue.severity === 'Critical') markerColor = '#e11d48';
      else if (issue.severity === 'High') markerColor = '#ea580c';
      else if (issue.status === 'Resolved') markerColor = '#16a34a';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="map-pulse-marker" style="background-color: ${markerColor}; color: ${markerColor};">
                 <span>•</span>
               </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([issue.location.lat, issue.location.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div class="text-xs space-y-1 p-1 max-w-[210px]">
          <div class="font-bold text-slate-900">${issue.title}</div>
          <p class="text-slate-600 text-[10px]">${issue.location.address}</p>
          <div class="flex items-center justify-between pt-1 border-t border-slate-100">
            <span class="font-bold" style="color: ${markerColor}">${issue.severity}</span>
            <span class="font-mono text-slate-700 font-semibold">${issue.status}</span>
          </div>
        </div>
      `);
      markers.push(marker);
    });
  },

  openAssignModal(issueId) {
    this.activeAssignIssueId = issueId;
    const issue = appState.issues.find(i => i.id === issueId);
    if (!issue) return;

    const titleElem = document.getElementById('modal-issue-title');
    const select = document.getElementById('modal-contractor-select');
    if (titleElem) titleElem.textContent = `${issue.id} - ${issue.title}`;

    if (select) {
      select.innerHTML = '';
      appState.contractors.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.category}) - ★${c.rating} (${c.activeJobs} jobs active)`;
        select.appendChild(opt);
      });
    }

    document.getElementById('assign-modal')?.classList.remove('hidden');
  },

  closeAssignModal() {
    document.getElementById('assign-modal')?.classList.add('hidden');
    this.activeAssignIssueId = null;
  },

  async confirmAssignment() {
    if (!this.activeAssignIssueId) return;

    const contractorId = document.getElementById('modal-contractor-select')?.value;
    const slaHours = Number(document.getElementById('modal-sla-select')?.value || 24);

    try {
      const response = await apiClient.assignContractor(this.activeAssignIssueId, contractorId, slaHours);
      if (response.success) {
        window.app.showToast('Contractor dispatched! SLA countdown timer initiated.', 'success');
        this.closeAssignModal();
        await window.app.refreshData();
      }
    } catch (err) {
      window.app.showToast(err.message, 'error');
    }
  }
};
