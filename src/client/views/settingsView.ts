import { api } from '../api';
import { escapeHtml, showToast } from '../ui';
import { openLoginModal, openRegisterModal } from './authModals';

export async function renderSettings(container: HTMLElement) {
  let user: any = null;
  let wallet: any = null;

  try {
    const res = await api.getMe();
    user = res.user;
    wallet = res.wallet;
  } catch (err) {
    // Unauthenticated
  }

  container.innerHTML = `
    <div class="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <!-- Title -->
      <div class="border-b border-[#252B3B] pb-6">
        <div class="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider mb-1">Account & Preferences</div>
        <h1 class="text-3xl font-black text-white tracking-tight">Settings & Trust Center</h1>
        <p class="text-xs md:text-sm text-[#8992A7] mt-1">Manage profile credentials, switch demo test accounts, review platform policies, and contact support.</p>
      </div>

      <!-- User Profile Card -->
      <div class="card-panel p-6 md:p-8 space-y-6">
        <h2 class="text-lg font-bold text-white border-b border-[#252B3B] pb-3">Account Profile</h2>

        ${
          user
            ? `
          <div class="flex flex-col sm:flex-row items-center gap-6">
            <img src="${user.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + user.username}" alt="${escapeHtml(user.username)}" class="w-20 h-20 rounded-2xl bg-[#0D101A] border border-[#252B3B] shadow-lg" />
            
            <div class="space-y-1 text-center sm:text-left flex-1">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span class="text-xl font-bold text-white">@${escapeHtml(user.username)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-[#FF5C75]/20 text-[#FF5C75]' : 'bg-[#7C5CFF]/20 text-[#9B83FF]'}">
                  ${user.role}
                </span>
              </div>
              <div class="text-xs text-[#8992A7]">${escapeHtml(user.email)}</div>
              <div class="text-xs text-[#35D49A] font-semibold pt-1">Wallet Balance: ${wallet?.balance || 0} Credits</div>
            </div>

            <div class="flex items-center gap-2">
              <button id="btn-logout-settings" class="btn-secondary text-xs px-4 py-2 text-[#FF5C75] hover:bg-[#FF5C75]/10">
                Log Out
              </button>
            </div>
          </div>
        `
            : `
          <div class="text-center py-6 space-y-3">
            <p class="text-xs text-[#8992A7]">You are currently browsing as a guest.</p>
            <div class="flex items-center justify-center gap-3">
              <button id="btn-login-settings" class="btn-primary text-xs px-5 py-2">Sign In</button>
              <button id="btn-reg-settings" class="btn-secondary text-xs px-5 py-2">Create Account</button>
            </div>
          </div>
        `
        }
      </div>

      <!-- Quick Demo Account Switcher (Section 84 & 100) -->
      <div class="card-panel p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
          <div>
            <h2 class="text-base font-bold text-white">Development Demo Switcher</h2>
            <p class="text-xs text-[#8992A7]">Seamlessly switch between customer and admin personas for testing.</p>
          </div>
          <span class="badge-demo">Demo Mode</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button id="btn-settings-switch-alex" class="p-4 rounded-xl bg-[#0D101A] border border-[#252B3B] hover:border-[#7C5CFF] text-left transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-white group-hover:text-[#9B83FF]">Alex Rivera (Customer)</span>
              <span class="text-xs text-[#35D49A] font-bold">65 Credits</span>
            </div>
            <div class="text-xs text-[#8992A7]">alex@upipay.io • Has 1 active course and 1 expired course in library.</div>
          </button>

          <button id="btn-settings-switch-admin" class="p-4 rounded-xl bg-[#0D101A] border border-[#252B3B] hover:border-[#FF5C75] text-left transition-all group">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-white group-hover:text-[#FF5C75]">Platform Administrator</span>
              <span class="text-xs text-[#FF5C75] font-bold">Admin Panel Access</span>
            </div>
            <div class="text-xs text-[#8992A7]">admin@upipay.io • Can approve manual top-ups, edit products, adjust balances.</div>
          </button>
        </div>
      </div>

      <!-- Legal & Trust Policies (Section 95) -->
      <div class="card-panel p-6 space-y-6">
        <h2 class="text-lg font-bold text-white border-b border-[#252B3B] pb-3">Legal, Trust & Compliance</h2>

        <div class="space-y-4 text-xs text-[#8992A7] leading-relaxed">
          <div>
            <h3 class="font-bold text-white mb-1">1. Content Rights & Distribution</h3>
            <p>UPI-Pay is an authorized digital marketplace. Only content that the platform owner owns or is legally authorized to distribute is listed. Unauthorized redistribution or scraping of protected streams is strictly prohibited.</p>
          </div>

          <div>
            <h3 class="font-bold text-white mb-1">2. Authoritative Access Expiration</h3>
            <p>Access entitlements (24 Hours, 7 Days, 30 Days, 90 Days, Lifetime) are authoritatively calculated and enforced by the server backend. Renewal options are available immediately upon access expiration.</p>
          </div>

          <div>
            <h3 class="font-bold text-white mb-1">3. Refund Policy</h3>
            <p>Digital wallet credits and consumed video masterclasses are subject to review. If technical difficulties prevent authorized streaming, users may submit a refund request to administration.</p>
          </div>

          <div>
            <h3 class="font-bold text-white mb-1">4. Payment Methods & Security</h3>
            <p>We support manual review and automatic verification for EasyPaisa, JazzCash, and USDT. All transaction records and balances are recorded in immutable server ledgers.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-login-settings')?.addEventListener('click', () => openLoginModal());
  document.getElementById('btn-reg-settings')?.addEventListener('click', () => openRegisterModal());

  document.getElementById('btn-logout-settings')?.addEventListener('click', async () => {
    await api.logout();
    showToast('Logged out successfully.', 'info');
    window.location.reload();
  });

  document.getElementById('btn-settings-switch-alex')?.addEventListener('click', async () => {
    await api.switchDemo('alex');
    showToast('Switched to customer profile (Alex Rivera).', 'success');
    window.location.reload();
  });

  document.getElementById('btn-settings-switch-admin')?.addEventListener('click', async () => {
    await api.switchDemo('admin');
    showToast('Switched to Administrator profile.', 'success');
    window.location.reload();
  });
}
