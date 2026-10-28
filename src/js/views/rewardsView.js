/**
 * Civic Rewards & Redemption Store Component
 */

import { appState } from '../state.js';
import { apiClient } from '../api.js';

export const rewardsView = {
  render() {
    this.renderTokenStats();
    this.renderRedemptionStore();
    this.renderClaimedVouchers();
    this.renderLeaderboard();
  },

  renderTokenStats() {
    const userPts = appState.currentUser?.points || 0;
    const userPtsElem = document.getElementById('rewards-user-pts');
    const userPtsWallet = document.getElementById('wallet-user-pts');
    if (userPtsElem) userPtsElem.textContent = `${userPts} Pts`;
    if (userPtsWallet) userPtsWallet.textContent = `${userPts}`;
  },

  renderRedemptionStore() {
    const container = document.getElementById('perks-store-grid');
    if (!container) return;

    const userPts = appState.currentUser?.points || 0;

    const perks = [
      {
        id: 'metro-100',
        title: 'Delhi Metro Smart Card ₹100 Recharge',
        cost: 200,
        icon: '🚇',
        desc: 'Direct top-up code for DMRC / Metro Smart Card recharge.'
      },
      {
        id: 'parking-10',
        title: 'Smart City Parking 10-Hour Pass',
        cost: 150,
        icon: '🅿️',
        desc: 'Valid at all municipal smart parking lots across city wards.'
      },
      {
        id: 'tax-5',
        title: '5% Municipal Property Tax Discount',
        cost: 400,
        icon: '🏠',
        desc: 'Redeemable on municipal citizen tax self-assessment portal.'
      },
      {
        id: 'tree-ward',
        title: 'Plant a Native Ward Tree in Your Name',
        cost: 100,
        icon: '🌳',
        desc: 'Municipal horticulture unit plants a sapling with GPS certificate.'
      },
      {
        id: 'cafe-150',
        title: 'Community Cafe Voucher (₹150)',
        cost: 250,
        icon: '☕',
        desc: 'Redeemable at participating local cafes and community hubs.'
      }
    ];

    container.innerHTML = '';
    perks.forEach(perk => {
      const canAfford = userPts >= perk.cost;
      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3';

      card.innerHTML = `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-2xl">${perk.icon}</span>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${canAfford ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-500'}">
              ${perk.cost} Pts
            </span>
          </div>
          <h4 class="font-bold text-slate-900 text-xs">${perk.title}</h4>
          <p class="text-[11px] text-slate-500 leading-snug">${perk.desc}</p>
        </div>

        <button onclick="window.app.redeemPerkAction('${perk.title}', ${perk.cost})" class="w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
          canAfford 
            ? 'bg-gov-blue hover:bg-gov-navy text-white shadow-sm' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }">
          <i class="fa-solid fa-gift"></i> ${canAfford ? 'Redeem Voucher' : `Need ${perk.cost - userPts} more pts`}
        </button>
      `;

      container.appendChild(card);
    });
  },

  renderClaimedVouchers() {
    const container = document.getElementById('claimed-vouchers-list');
    if (!container) return;

    if (appState.claimedVouchers.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic">No vouchers claimed yet. Report defects to earn points!</p>`;
      return;
    }

    container.innerHTML = '';
    appState.claimedVouchers.forEach(v => {
      const item = document.createElement('div');
      item.className = 'p-3 rounded-lg bg-gov-ash border border-slate-200 flex items-center justify-between text-xs';
      item.innerHTML = `
        <div>
          <h5 class="font-bold text-slate-800">${v.title}</h5>
          <p class="text-[10px] text-slate-500">Claimed: ${v.date} • ${v.points} Pts</p>
        </div>
        <div class="text-right">
          <span class="font-mono font-bold text-gov-blue bg-white px-2 py-1 rounded border border-slate-300 select-all cursor-pointer" title="Click to copy code">
            ${v.code}
          </span>
        </div>
      `;
      container.appendChild(item);
    });
  },

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = '';
    appState.leaderboard.forEach(entry => {
      const isCurrentUser = entry.userId === appState.currentUser?.id || entry.name.includes(appState.currentUser?.name || 'Aarav');
      const row = document.createElement('div');
      row.className = `p-3 rounded-lg border flex items-center justify-between text-xs transition ${
        isCurrentUser ? 'bg-blue-50/90 border-gov-blue/50 shadow-sm' : 'bg-gov-ash border-slate-200'
      }`;

      let rankDisplay = `<span class="font-bold text-slate-500 font-mono w-6">#${entry.rank}</span>`;
      if (entry.rank === 1) rankDisplay = `<span class="text-base">🥇</span>`;
      if (entry.rank === 2) rankDisplay = `<span class="text-base">🥈</span>`;
      if (entry.rank === 3) rankDisplay = `<span class="text-base">🥉</span>`;

      row.innerHTML = `
        <div class="flex items-center gap-3">
          ${rankDisplay}
          <span class="text-xl">${entry.avatar || '👤'}</span>
          <div>
            <h5 class="font-bold text-slate-900 flex items-center gap-1.5">
              ${entry.name}
              ${isCurrentUser ? '<span class="text-[10px] bg-gov-blue text-white px-1.5 py-0.2 rounded font-bold">YOU</span>' : ''}
            </h5>
            <p class="text-[11px] text-slate-500">${entry.badge} • ${entry.issuesResolved} complaints resolved</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-gov-navy font-mono">${entry.points} pts</span>
          <p class="text-[10px] text-slate-500 uppercase font-bold">${entry.tier}</p>
        </div>
      `;

      container.appendChild(row);
    });
  }
};
