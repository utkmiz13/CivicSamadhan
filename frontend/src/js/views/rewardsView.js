/**
 * Civic Rewards & Web3 Gamification View Component
 */

import { appState } from '../state.js';

export const rewardsView = {
  render() {
    this.renderTokenStats();
    this.renderLeaderboard();
  },

  renderTokenStats() {
    const userPtsElem = document.getElementById('rewards-user-pts');
    if (userPtsElem) userPtsElem.textContent = `${appState.user.points} Tokens`;
  },

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = '';
    appState.leaderboard.forEach(entry => {
      const isCurrentUser = entry.userId === appState.user.id || entry.name.includes('Aarav') || entry.name.includes('You');
      const row = document.createElement('div');
      row.className = `p-3.5 rounded-lg border flex items-center justify-between text-xs transition ${
        isCurrentUser ? 'bg-blue-50/80 border-gov-blue/50 shadow-sm' : 'bg-gov-ash border-slate-200'
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
            <p class="text-[11px] text-slate-500">${entry.badge} • ${entry.issuesResolved} issues resolved</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-gov-navy font-mono">${entry.points} pts</span>
          <p class="text-[10px] text-slate-500 uppercase font-bold">${entry.tier}</p>
        </div>
      `;

      container.appendChild(row);
    });
  },

  claimPerk(perkTitle) {
    window.app.showToast(`🎁 Claimed: ${perkTitle}! Verification voucher dispatched via SMS.`, 'success');
  }
};
