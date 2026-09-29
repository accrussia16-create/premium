import { api } from '../api';
import {
  escapeHtml,
  formatDurationType,
  formatRemainingTime,
  renderAccessBadge
} from '../ui';
import { renderProductCardHtml, setupProductCardListeners } from './dashboardView';

export async function renderLibrary(container: HTMLElement) {
  container.innerHTML = `
    <div class="py-20 text-center text-[#8992A7]">
      <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      Loading your library...
    </div>
  `;

  let activeTab: string = 'purchased';

  try {
    const res = await api.getLibrary();
    const library = res.library || { continue_watching: [], purchased: [], completed: [], expired: [], favorites: [] };
    const counts = res.counts || { active: 0, continue_watching: 0, completed: 0, expired: 0, favorites: 0 };

    function renderContent() {
      const tabContentContainer = document.getElementById('library-tab-content');
      if (!tabContentContainer) return;

      const items = library[activeTab] || [];

      if (items.length === 0) {
        tabContentContainer.innerHTML = `
          <div class="card-panel p-12 text-center space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-[#151925] border border-[#252B3B] text-[#8992A7] flex items-center justify-center mx-auto">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <h3 class="text-lg font-bold text-white">No items found in this section</h3>
            <p class="text-xs text-[#8992A7] max-w-sm mx-auto">
              ${activeTab === 'expired' ? 'No expired items found. All your active purchases are ready to stream!' : 'Browse the marketplace to discover video courses, AI masterclasses, and digital kits.'}
            </p>
            <a href="#/marketplace" class="btn-primary inline-flex text-xs px-5 py-2.5">
              Explore Marketplace
            </a>
          </div>
        `;
        return;
      }

      // If favorites, render using standard product card
      if (activeTab === 'favorites') {
        tabContentContainer.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            ${items.map((p: any) => renderProductCardHtml(p)).join('')}
          </div>
        `;
        setupProductCardListeners(tabContentContainer);
        return;
      }

      // Otherwise render library cards with progress and remaining time
      tabContentContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${items.map((item: any) => {
            const hasAccess = item.access?.has_access;
            const isExpired = item.access?.is_expired;

            return `
              <div class="card-panel overflow-hidden group flex flex-col justify-between">
                <!-- Thumbnail -->
                <div class="relative aspect-video bg-black overflow-hidden">
                  <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div class="absolute inset-0 bg-gradient-to-t from-[#10131C] via-transparent to-black/30"></div>

                  <!-- Status Badge -->
                  <div class="absolute top-3 left-3">
                    ${renderAccessBadge(item.access)}
                  </div>

                  <!-- Progress Bar overlay -->
                  <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-[#252B3B]">
                    <div class="h-full bg-gradient-to-r from-[#7C5CFF] to-[#35D49A]" style="width: ${item.progress?.completion_percent || 0}%"></div>
                  </div>
                </div>

                <!-- Info -->
                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div class="flex items-center justify-between text-xs text-[#8992A7] mb-1">
                      <span>${escapeHtml(item.category)}</span>
                      <span class="font-bold text-[#35D49A]">${item.progress?.completion_percent || 0}% Complete</span>
                    </div>

                    <h3 class="font-bold text-white text-base line-clamp-1 group-hover:text-[#9B83FF] transition-colors">
                      ${escapeHtml(item.title)}
                    </h3>

                    <!-- Expiration Countdown Indicator (Section 19) -->
                    <div class="mt-2 text-xs font-semibold ${isExpired ? 'text-[#FF5C75]' : 'text-[#8992A7]'} flex items-center gap-1.5">
                      <span>${formatRemainingTime(item.access?.expires_at)}</span>
                    </div>
                  </div>

                  <!-- CTA Button (Section 20 & 26) -->
                  <div class="pt-2 border-t border-[#252B3B]">
                    ${
                      hasAccess
                        ? `
                      <a href="#/player/${item.product_id}" class="btn-primary w-full py-2.5 text-xs font-bold">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Watch Premium Content
                      </a>
                    `
                        : `
                      <a href="#/products/${item.product_id}" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C75] to-[#E03B57] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF5C75]/25 hover:opacity-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Renew Access
                      </a>
                    `
                    }
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-8 animate-fade-in">
        <!-- Title & Subtitle -->
        <div class="border-b border-[#252B3B] pb-6">
          <div class="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider mb-1">Entitlements</div>
          <h1 class="text-3xl font-black text-white tracking-tight">My Library</h1>
          <p class="text-xs md:text-sm text-[#8992A7] mt-1">Manage active streaming access, track course progress, and renew expiring content.</p>
        </div>

        <!-- Navigation Tabs (Section 26) -->
        <div class="flex items-center gap-2 border-b border-[#252B3B] overflow-x-auto pb-px">
          <button class="lib-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'purchased' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'
          }" data-tab="purchased">
            Purchased
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#151925] border border-[#252B3B] text-[#9B83FF]">${counts.active}</span>
          </button>

          <button class="lib-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'continue_watching' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'
          }" data-tab="continue_watching">
            Continue Watching
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#151925] border border-[#252B3B] text-[#35D49A]">${counts.continue_watching}</span>
          </button>

          <button class="lib-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'completed' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'
          }" data-tab="completed">
            Completed
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#151925] border border-[#252B3B] text-white">${counts.completed}</span>
          </button>

          <button class="lib-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'expired' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'
          }" data-tab="expired">
            Expired Access
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#FF5C75]/15 border border-[#FF5C75]/30 text-[#FF5C75]">${counts.expired}</span>
          </button>

          <button class="lib-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'favorites' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'
          }" data-tab="favorites">
            Favorites
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-[#151925] border border-[#252B3B] text-[#FF5C75]">${counts.favorites}</span>
          </button>
        </div>

        <!-- Tab Content Grid -->
        <div id="library-tab-content">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    // Tab Listeners
    container.querySelectorAll('.lib-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        container.querySelectorAll('.lib-tab').forEach((b) => {
          b.classList.remove('border-[#7C5CFF]', 'text-white');
          b.classList.add('border-transparent', 'text-[#8992A7]');
        });
        tabBtn.classList.remove('border-transparent', 'text-[#8992A7]');
        tabBtn.classList.add('border-[#7C5CFF]', 'text-white');

        activeTab = (tabBtn as HTMLElement).dataset.tab as any;
        renderContent();
      });
    });

    renderContent();
  } catch (err: any) {
    console.error('[Library] Error:', err);
    container.innerHTML = `<div class="p-8 text-center text-[#FF5C75]">Please sign in to view your library.</div>`;
  }
}
