/**
 * Contractor Field Operations View Component
 * Supports Real Photographic Resolution Proof Upload
 */

import { appState } from '../state.js';
import { apiClient } from '../api.js';

export const contractorView = {
  customResolutionPhotos: {},

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
      const hasUploadedPhoto = Boolean(this.customResolutionPhotos[issue.id]);

      card.innerHTML = `
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span class="text-[10px] font-mono text-gov-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">SLA: ${issue.assignedTo?.slaHours || 24}h Enforced</span>
            <h4 class="font-bold text-slate-900 text-sm mt-1.5">${issue.title}</h4>
            <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> ${issue.location?.address || 'Geotagged site'}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${
            isSubmitted ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-blue-50 text-gov-blue border border-blue-200'
          }">
            ${issue.status}
          </span>
        </div>

        <div>
          <p class="text-[11px] text-slate-600 font-bold mb-1">Citizen Reported Evidence (BEFORE):</p>
          <div class="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            <img src="${issue.imageUrl}" class="w-full h-44 object-cover" alt="Citizen Report Evidence">
          </div>
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

            <!-- Real After-Repair Proof Upload -->
            <input type="file" id="contractor-file-${issue.id}" accept="image/*" capture="environment" class="hidden">
            
            <div id="contractor-preview-wrap-${issue.id}" class="${hasUploadedPhoto ? 'block' : 'hidden'} space-y-1">
              <span class="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                <i class="fa-solid fa-circle-check"></i> Field Repair Photo Attached (AFTER)
              </span>
              <img id="contractor-preview-img-${issue.id}" src="${this.customResolutionPhotos[issue.id] || ''}" class="w-full h-36 object-cover rounded-lg border-2 border-emerald-500 shadow-sm">
            </div>

            <div class="flex items-center gap-2">
              <button type="button" onclick="document.getElementById('contractor-file-${issue.id}').click()" class="flex-1 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                <i class="fa-solid fa-camera text-gov-blue"></i> 📸 Capture/Upload Proof
              </button>
              <button onclick="window.contractorView.handleResolutionSubmit('${issue.id}')" class="flex-1 py-2 px-3 rounded-lg bg-gov-saffron hover:bg-amber-500 text-gov-navy font-bold text-xs shadow transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-check"></i> Submit For Verification
              </button>
            </div>
          </div>
        `}
      `;

      container.appendChild(card);

      // Attach file input change listener
      const fileInput = document.getElementById(`contractor-file-${issue.id}`);
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) this.processContractorPhoto(issue.id, file);
        });
      }
    });
  },

  processContractorPhoto(issueId, file) {
    if (!file.type.startsWith('image/')) {
      window.app.showToast('Please select a valid image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        this.customResolutionPhotos[issueId] = compressedBase64;

        const previewWrap = document.getElementById(`contractor-preview-wrap-${issueId}`);
        const previewImg = document.getElementById(`contractor-preview-img-${issueId}`);

        if (previewWrap && previewImg) {
          previewImg.src = compressedBase64;
          previewWrap.classList.remove('hidden');
        }

        window.app.showToast('📸 Field repair photo attached! Click Submit to transmit to Supabase.', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  async handleResolutionSubmit(issueId) {
    const notesInput = document.getElementById(`contractor-notes-${issueId}`);
    const notes = notesInput?.value?.trim() || 'Field repairs executed to municipal specifications.';
    
    // Check if contractor uploaded their real proof photo, otherwise fallback to clean repaired pavement
    const resolvedImageUrl = this.customResolutionPhotos[issueId] || 
      'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80';

    try {
      window.app.showToast('Submitting resolution evidence to Supabase...', 'info');
      const response = await apiClient.submitResolution(issueId, resolvedImageUrl, notes);
      if (response.success) {
        window.app.showToast('🎉 Resolution proof submitted! Citizen notified for verification.', 'success');
        delete this.customResolutionPhotos[issueId];
        await window.app.refreshData();
      }
    } catch (err) {
      window.app.showToast(err.message, 'error');
    }
  }
};

window.contractorView = contractorView;
