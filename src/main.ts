import './index.css';
import { api, User } from './client/api';
import { formatRemainingTime, showToast } from './client/ui';
import { renderDashboard } from './client/views/dashboardView';
import { renderMarketplace } from './client/views/marketplaceView';
import { renderProductDetail } from './client/views/productDetailView';
import { renderPlayer } from './client/views/playerView';
import { renderLibrary } from './client/views/libraryView';
import { renderWallet, openTopupModal } from './client/views/walletView';
import { renderAdmin } from './client/views/adminView';
import { renderSettings } from './client/views/settingsView';
import { openLoginModal, openRegisterModal } from './client/views/authModals';

let currentUser: User | null = null;

// Application Initialization
async function initApp() {
  const contentEl = document.getElementById('app-content');
  if (!contentEl) return;

  // 1. Fetch current authenticated user
  try {
    const meRes = await api.getMe();
    currentUser = meRes.user;
    updateHeaderUserUI(meRes.user, meRes.wallet, meRes.stats);
  } catch (err) {
    updateHeaderUserUI(null, null, null);
  }

  // 2. Setup Global Listeners
  setupHeaderListeners();

  // 3. Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  // 4. Setup Route Listener
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // 5. Global Real-time Live Countdown Interval (every 1 second)
  setInterval(updateLiveCountdowns, 1000);
}

// Global live countdown updater
function updateLiveCountdowns() {
  document.querySelectorAll('[data-countdown-date]').forEach((el) => {
    const expDate = (el as HTMLElement).dataset.countdownDate;
    if (expDate) {
      el.textContent = `✓ ACTIVE • ${formatRemainingTime(expDate)}`;
    }
  });

  const productCountdown = document.getElementById('product-page-countdown');
  const playerCountdown = document.getElementById('player-countdown');
  // Both formatted automatically
}

// Header & User UI Updater
function updateHeaderUserUI(user: User | null, wallet: any | null, stats: any | null) {
  const authContainer = document.getElementById('header-auth-container');
  const sidebarAdminSection = document.getElementById('sidebar-admin-section');
  const creditsPill = document.getElementById('header-credits-count');
  const sidebarCredits = document.getElementById('sidebar-wallet-balance');
  const notifBadge = document.getElementById('notification-badge');

  // Update credits display
  if (wallet) {
    if (creditsPill) creditsPill.innerText = String(wallet.balance);
    if (sidebarCredits) sidebarCredits.innerText = `${wallet.balance} Credits`;
  } else {
    if (creditsPill) creditsPill.innerText = '0';
    if (sidebarCredits) sidebarCredits.innerText = '0 Credits';
  }

  // Update admin sidebar section
  if (user && user.role === 'ADMIN') {
    sidebarAdminSection?.classList.remove('hidden');
  } else {
    sidebarAdminSection?.classList.add('hidden');
  }

  // Update notification badge
  if (stats && stats.unreadNotifications > 0 && notifBadge) {
    notifBadge.innerText = String(stats.unreadNotifications);
    notifBadge.classList.remove('hidden');
  } else if (notifBadge) {
    notifBadge.classList.add('hidden');
  }

  // Highlight Demo switchers
  const btnAlex = document.getElementById('btn-switch-alex');
  const btnAdmin = document.getElementById('btn-switch-admin');

  if (user?.role === 'ADMIN') {
    btnAdmin?.classList.add('bg-[#FF5C75]/20', 'text-[#FF5C75]', 'border', 'border-[#FF5C75]/40');
    btnAlex?.classList.remove('bg-[#7C5CFF]/20', 'text-[#9B83FF]', 'border', 'border-[#7C5CFF]/40');
  } else if (user?.email?.includes('alex')) {
    btnAlex?.classList.add('bg-[#7C5CFF]/20', 'text-[#9B83FF]', 'border', 'border-[#7C5CFF]/40');
    btnAdmin?.classList.remove('bg-[#FF5C75]/20', 'text-[#FF5C75]', 'border', 'border-[#FF5C75]/40');
  }

  // Render Auth buttons / Avatar dropdown in header
  if (authContainer) {
    if (user) {
      authContainer.innerHTML = `
        <div class="relative group">
          <button class="flex items-center gap-2 p-1 rounded-xl hover:bg-[#151925] transition-colors">
            <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + user.username}" alt="${user.username}" class="w-8 h-8 rounded-lg bg-[#151925] border border-[#252B3B]" />
            <span class="text-xs font-bold text-white hidden md:inline">@${user.username}</span>
          </button>

          <!-- Dropdown -->
          <div class="hidden group-hover:block absolute right-0 mt-1 w-48 bg-[#10131C] border border-[#252B3B] rounded-xl shadow-2xl p-2 z-50 animate-fade-in">
            <div class="px-3 py-2 border-b border-[#252B3B] text-xs">
              <div class="font-bold text-white">@${user.username}</div>
              <div class="text-[10px] text-[#8992A7] truncate">${user.email}</div>
            </div>
            <a href="#/wallet" class="flex items-center gap-2 px-3 py-2 text-xs text-[#8992A7] hover:text-white hover:bg-[#151925] rounded-lg">
              Wallet (${wallet?.balance || 0} Credits)
            </a>
            <a href="#/library" class="flex items-center gap-2 px-3 py-2 text-xs text-[#8992A7] hover:text-white hover:bg-[#151925] rounded-lg">
              My Library
            </a>
            <a href="#/settings" class="flex items-center gap-2 px-3 py-2 text-xs text-[#8992A7] hover:text-white hover:bg-[#151925] rounded-lg">
              Settings
            </a>
            ${
              user.role === 'ADMIN'
                ? `<a href="#/admin" class="flex items-center gap-2 px-3 py-2 text-xs text-[#FF5C75] font-bold hover:bg-[#FF5C75]/10 rounded-lg">
                    Admin Panel
                  </a>`
                : ''
            }
            <button id="header-btn-logout" class="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-[#FF5C75] hover:bg-[#151925] rounded-lg">
              Log Out
            </button>
          </div>
        </div>
      `;

      document.getElementById('header-btn-logout')?.addEventListener('click', async () => {
        await api.logout();
        showToast('Signed out.', 'info');
        window.location.reload();
      });
    } else {
      authContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btn-header-login" class="text-xs font-bold text-[#8992A7] hover:text-white px-2.5 py-1.5">
            Sign In
          </button>
          <button id="btn-header-register" class="btn-primary text-xs font-bold py-1.5 px-3">
            Register
          </button>
        </div>
      `;

      document.getElementById('btn-header-login')?.addEventListener('click', () => openLoginModal());
      document.getElementById('btn-header-register')?.addEventListener('click', () => openRegisterModal());
    }
  }
}

// Setup Header & Notifications Event Handlers
function setupHeaderListeners() {
  // Quick Switcher: Alex (User)
  document.getElementById('btn-switch-alex')?.addEventListener('click', async () => {
    try {
      await api.switchDemo('alex');
      showToast('Switched to customer profile (Alex Rivera).', 'success');
      window.location.reload();
    } catch (e) {
      showToast('Switch failed', 'error');
    }
  });

  // Quick Switcher: Admin
  document.getElementById('btn-switch-admin')?.addEventListener('click', async () => {
    try {
      await api.switchDemo('admin');
      showToast('Switched to Administrator profile.', 'success');
      window.location.reload();
    } catch (e) {
      showToast('Switch failed', 'error');
    }
  });

  // Wallet Topup trigger
  document.getElementById('header-wallet-pill')?.addEventListener('click', () => openTopupModal());
  document.getElementById('btn-sidebar-topup')?.addEventListener('click', () => openTopupModal());
  document.getElementById('btn-header-topup')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openTopupModal();
  });

  // Global Header Search
  const headerSearch = document.getElementById('header-search-input') as HTMLInputElement;
  headerSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = encodeURIComponent(headerSearch.value.trim());
      window.location.hash = `#/marketplace?search=${q}`;
    }
  });

  // Notifications Bell Toggle & Dropdown
  const notifBtn = document.getElementById('btn-toggle-notifications');
  const notifDropdown = document.getElementById('notifications-dropdown');
  const notifList = document.getElementById('notifications-list');

  notifBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!notifDropdown) return;
    const isHidden = notifDropdown.classList.contains('hidden');

    if (isHidden) {
      notifDropdown.classList.remove('hidden');
      try {
        const res = await api.getNotifications();
        const notifs = res.notifications || [];
        if (notifs.length === 0) {
          if (notifList) notifList.innerHTML = `<div class="py-6 text-center text-xs text-[#8992A7]">No new notifications</div>`;
        } else {
          if (notifList) {
            notifList.innerHTML = notifs.map((n: any) => `
              <div class="py-3 px-2 hover:bg-[#151925] transition-colors rounded-lg ${n.is_read ? 'opacity-60' : 'bg-[#151925]/30'}">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-white">${n.title}</span>
                  <span class="text-[10px] text-[#8992A7]">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p class="text-xs text-[#8992A7] leading-relaxed">${n.message}</p>
              </div>
            `).join('');
          }
        }
      } catch (err) {}
    } else {
      notifDropdown.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (notifDropdown && !notifDropdown.contains(e.target as Node) && e.target !== notifBtn) {
      notifDropdown.classList.add('hidden');
    }
  });

  document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
    await api.markAllNotificationsRead();
    document.getElementById('notification-badge')?.classList.add('hidden');
    showToast('All notifications marked as read', 'info');
  });
}

// Universal Client-Side Hash Router
function handleRoute() {
  const contentEl = document.getElementById('app-content');
  if (!contentEl) return;

  const rawHash = window.location.hash || '#/dashboard';
  const [routePart, queryPart] = rawHash.split('?');
  const params = new URLSearchParams(queryPart || '');

  // Update navigation highlighting
  const currentNav = routePart.replace('#/', '').split('/')[0] || 'dashboard';
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const navName = (link as HTMLElement).dataset.nav;
    if (navName === currentNav) {
      link.classList.add('bg-[#151925]', 'text-white', 'shadow-sm');
      link.classList.remove('text-[#8992A7]');
    } else {
      link.classList.remove('bg-[#151925]', 'text-white', 'shadow-sm');
      link.classList.add('text-[#8992A7]');
    }
  });

  window.scrollTo(0, 0);

  // Route Dispatcher
  if (routePart === '#/dashboard' || routePart === '' || routePart === '#/') {
    renderDashboard(contentEl);
  } else if (routePart === '#/marketplace') {
    const searchVal = params.get('search') || '';
    renderMarketplace(contentEl, searchVal);
  } else if (routePart.startsWith('#/products/')) {
    const id = routePart.replace('#/products/', '');
    renderProductDetail(contentEl, id);
  } else if (routePart.startsWith('#/player/')) {
    const id = Number(routePart.replace('#/player/', ''));
    const lessonId = params.get('lesson') ? Number(params.get('lesson')) : undefined;
    renderPlayer(contentEl, id, lessonId);
  } else if (routePart === '#/library') {
    renderLibrary(contentEl);
  } else if (routePart === '#/wallet' || routePart === '#/transactions') {
    renderWallet(contentEl);
  } else if (routePart === '#/admin') {
    renderAdmin(contentEl);
  } else if (routePart === '#/settings' || routePart === '#/support') {
    renderSettings(contentEl);
  } else {
    renderDashboard(contentEl);
  }
}

// Start Application on DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
