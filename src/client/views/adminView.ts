import { api } from '../api';
import { closeModal, escapeHtml, formatDurationType, openModal, showToast } from '../ui';

export async function renderAdmin(container: HTMLElement) {
  container.innerHTML = `
    <div class="py-20 text-center text-[#8992A7]">
      <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      Loading admin management dashboard...
    </div>
  `;

  let activeTab: string = 'stats';

  try {
    const [statsRes, topupsRes, productsRes, usersRes, auditRes] = await Promise.all([
      api.getAdminStats(),
      api.getAdminTopups(),
      api.getAdminProducts(),
      api.getAdminUsers(),
      api.getAdminAuditLogs()
    ]);

    const stats = statsRes.stats || {};
    const topups = topupsRes.topups || [];
    const products = productsRes.products || [];
    const users = usersRes.users || [];
    const logs = auditRes.logs || [];

    function renderTabContent() {
      const outlet = document.getElementById('admin-tab-outlet');
      if (!outlet) return;

      switch (activeTab) {
        case 'stats':
          outlet.innerHTML = renderAdminStatsView(stats, topups, products);
          break;
        case 'topups':
          outlet.innerHTML = renderAdminTopupsView(topups);
          setupTopupsHandlers();
          break;
        case 'products':
          outlet.innerHTML = renderAdminProductsView(products);
          setupProductsHandlers();
          break;
        case 'users':
          outlet.innerHTML = renderAdminUsersView(users);
          setupUsersHandlers();
          break;
        case 'audit':
          outlet.innerHTML = renderAdminAuditView(logs);
          break;
      }
    }

    container.innerHTML = `
      <div class="space-y-8 animate-fade-in">
        <!-- Admin Header -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#252B3B] pb-6">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-[#FF5C75] uppercase tracking-wider">Super Administrator</span>
              <span class="w-2 h-2 rounded-full bg-[#FF5C75]"></span>
            </div>
            <h1 class="text-3xl font-black text-white tracking-tight">Admin Management Panel</h1>
            <p class="text-xs md:text-sm text-[#8992A7] mt-1">Supervise pending top-up verification, manage curriculum products, inspect audit ledgers, and adjust user balances.</p>
          </div>

          <button id="btn-admin-add-product" class="btn-primary text-xs px-5 py-2.5 font-bold">
            + Create New Product
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-[#252B3B] overflow-x-auto pb-px">
          <button class="adm-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'stats' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'}" data-tab="stats">
            Overview & Metrics
          </button>
          <button class="adm-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'topups' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'}" data-tab="topups">
            Pending Top-Ups
            ${stats.pending_topups > 0 ? `<span class="px-2 py-0.2 rounded-full text-[10px] bg-[#FF5C75] text-white font-bold animate-pulse">${stats.pending_topups}</span>` : ''}
          </button>
          <button class="adm-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'products' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'}" data-tab="products">
            Products (${products.length})
          </button>
          <button class="adm-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'users' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'}" data-tab="users">
            Users & Wallets (${users.length})
          </button>
          <button class="adm-tab px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all ${activeTab === 'audit' ? 'border-[#7C5CFF] text-white' : 'border-transparent text-[#8992A7] hover:text-white'}" data-tab="audit">
            Audit Trail
          </button>
        </div>

        <!-- Outlet -->
        <div id="admin-tab-outlet"></div>
      </div>
    `;

    // Listeners for tabs
    container.querySelectorAll('.adm-tab').forEach((b) => {
      b.addEventListener('click', () => {
        container.querySelectorAll('.adm-tab').forEach((el) => {
          el.classList.remove('border-[#7C5CFF]', 'text-white');
          el.classList.add('border-transparent', 'text-[#8992A7]');
        });
        b.classList.remove('border-transparent', 'text-[#8992A7]');
        b.classList.add('border-[#7C5CFF]', 'text-white');
        activeTab = (b as HTMLElement).dataset.tab as any;
        renderTabContent();
      });
    });

    document.getElementById('btn-admin-add-product')?.addEventListener('click', () => {
      openProductEditorModal(null, () => renderAdmin(container));
    });

    renderTabContent();
  } catch (err: any) {
    console.error('[Admin] Error:', err);
    container.innerHTML = `
      <div class="card-panel p-12 text-center space-y-4 max-w-md mx-auto">
        <div class="w-12 h-12 rounded-full bg-[#FF5C75]/20 text-[#FF5C75] flex items-center justify-center mx-auto font-bold text-xl">!</div>
        <h3 class="text-lg font-bold text-white">Administrator Access Required</h3>
        <p class="text-xs text-[#8992A7]">This management module requires an authenticated ADMIN role. Use the Demo Switcher in the top bar to switch to the Admin profile.</p>
        <button id="btn-admin-switch-here" class="btn-primary text-xs px-5 py-2.5">
          Switch to Admin Profile Now
        </button>
      </div>
    `;
    document.getElementById('btn-admin-switch-here')?.addEventListener('click', async () => {
      await api.switchDemo('admin');
      window.location.reload();
    });
  }
}

// 1. Stats Overview Panel (Section 56 & 59)
function renderAdminStatsView(stats: any, topups: any[], products: any[]): string {
  const pending = topups.filter((t) => t.status === 'PENDING');

  return `
    <div class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card-panel p-5">
          <div class="text-xs font-semibold text-[#8992A7] mb-1">Total Platform Revenue</div>
          <div class="text-3xl font-black text-[#35D49A]">${stats.total_revenue_credits || 0} <span class="text-xs text-[#8992A7]">Credits</span></div>
          <div class="text-[11px] text-[#8992A7] mt-2">${stats.total_purchases || 0} purchases completed</div>
        </div>

        <div class="card-panel p-5">
          <div class="text-xs font-semibold text-[#8992A7] mb-1">Pending Top-Ups</div>
          <div class="text-3xl font-black ${stats.pending_topups > 0 ? 'text-[#FF5C75]' : 'text-white'}">
            ${stats.pending_topups || 0}
          </div>
          <div class="text-[11px] text-[#8992A7] mt-2">Requires manual verification</div>
        </div>

        <div class="card-panel p-5">
          <div class="text-xs font-semibold text-[#8992A7] mb-1">Registered Users</div>
          <div class="text-3xl font-black text-white">${stats.total_users || 0}</div>
          <div class="text-[11px] text-[#35D49A] mt-2">${stats.active_users || 0} active users</div>
        </div>

        <div class="card-panel p-5">
          <div class="text-xs font-semibold text-[#8992A7] mb-1">Published Content</div>
          <div class="text-3xl font-black text-white">${stats.published_products || 0}</div>
          <div class="text-[11px] text-[#8992A7] mt-2">Out of ${stats.total_products || 0} total catalog</div>
        </div>
      </div>

      <!-- Quick Action Alert if pending topups exist -->
      ${
        pending.length > 0
          ? `
        <div class="p-4 rounded-2xl bg-[#FF5C75]/10 border border-[#FF5C75]/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-[#FF5C75] animate-ping"></span>
            <div>
              <div class="text-sm font-bold text-white">${pending.length} Payment Top-Up(s) Awaiting Review</div>
              <div class="text-xs text-[#8992A7]">EasyPaisa, JazzCash, and USDT deposits submitted by users.</div>
            </div>
          </div>
          <button onclick="document.querySelector('[data-tab=topups]').click()" class="btn-primary text-xs py-2 px-4">
            Review Top-Ups Now →
          </button>
        </div>
      `
          : ''
      }
    </div>
  `;
}

// 2. Pending Top-ups Table (Section 35)
function renderAdminTopupsView(topups: any[]): string {
  return `
    <div class="card-panel p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">Top-Up Requests</h2>
          <p class="text-xs text-[#8992A7]">Verify manual deposits and atomically credit user balances.</p>
        </div>
        <span class="text-xs text-[#8992A7]">${topups.length} Records</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#0D101A] text-[#8992A7] uppercase text-[10px] font-bold border-y border-[#252B3B]">
            <tr>
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Method / Network</th>
              <th class="py-3 px-4">Credits</th>
              <th class="py-3 px-4">Fiat Amount</th>
              <th class="py-3 px-4">Reference / TID</th>
              <th class="py-3 px-4">Submitted</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#252B3B]">
            ${
              topups.length === 0
                ? `<tr><td colspan="8" class="py-8 text-center text-[#8992A7]">No top-up records found.</td></tr>`
                : topups.map((t: any) => `
                <tr class="hover:bg-[#151925]/60 transition-colors">
                  <td class="py-3 px-4">
                    <div class="font-bold text-white">@${escapeHtml(t.username)}</div>
                    <div class="text-[10px] text-[#8992A7]">${escapeHtml(t.email)}</div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded font-bold text-[10px] bg-[#151925] border border-[#252B3B] text-white">
                      ${t.method} ${t.network ? `(${t.network})` : ''}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-bold text-[#35D49A] text-sm">
                    +${t.amount_credits}
                  </td>
                  <td class="py-3 px-4 font-mono text-[#8992A7]">
                    ${t.amount_fiat} ${t.currency}
                  </td>
                  <td class="py-3 px-4 font-mono text-white select-all">
                    ${escapeHtml(t.reference_id || 'N/A')}
                  </td>
                  <td class="py-3 px-4 text-[#8992A7]">
                    ${new Date(t.created_at).toLocaleDateString()} ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'APPROVED'
                        ? 'bg-[#35D49A]/15 text-[#35D49A]'
                        : t.status === 'REJECTED'
                        ? 'bg-[#FF5C75]/15 text-[#FF5C75]'
                        : 'bg-[#FFB347]/15 text-[#FFB347] animate-pulse'
                    }">
                      ${t.status}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    ${
                      t.status === 'PENDING'
                        ? `
                      <div class="flex items-center justify-end gap-1.5">
                        <button class="btn-approve-topup py-1 px-2.5 rounded-lg bg-[#35D49A]/20 text-[#35D49A] hover:bg-[#35D49A] hover:text-black font-bold text-[11px] transition-all" data-topup-id="${t.id}" data-credits="${t.amount_credits}">
                          Approve
                        </button>
                        <button class="btn-reject-topup py-1 px-2.5 rounded-lg bg-[#FF5C75]/20 text-[#FF5C75] hover:bg-[#FF5C75] hover:text-white font-bold text-[11px] transition-all" data-topup-id="${t.id}">
                          Reject
                        </button>
                      </div>
                    `
                        : `<span class="text-[#8992A7] text-[11px]">Processed</span>`
                    }
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setupTopupsHandlers() {
  document.querySelectorAll('.btn-approve-topup').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const topupId = Number((btn as HTMLElement).dataset.topupId);
      const credits = (btn as HTMLElement).dataset.credits;
      if (!confirm(`Are you sure you want to approve Top-Up #${topupId} and credit ${credits} credits to the user?`)) return;

      try {
        const res = await api.approveTopup(topupId);
        showToast(res.message || 'Top-up approved!', 'success');
        renderAdmin(document.getElementById('app-content')!);
      } catch (err: any) {
        showToast(err.message || 'Failed to approve', 'error');
      }
    });
  });

  document.querySelectorAll('.btn-reject-topup').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const topupId = Number((btn as HTMLElement).dataset.topupId);
      const reason = prompt('Please enter the reason for rejection (e.g. Invalid reference ID, Payment not received):');
      if (!reason) return;

      try {
        const res = await api.rejectTopup(topupId, reason);
        showToast(res.message || 'Top-up rejected.', 'info');
        renderAdmin(document.getElementById('app-content')!);
      } catch (err: any) {
        showToast(err.message || 'Failed to reject', 'error');
      }
    });
  });
}

// 3. Product Management Table & Actions (Section 37, 38, 39, 40)
function renderAdminProductsView(products: any[]): string {
  return `
    <div class="card-panel p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">Catalog Products</h2>
          <p class="text-xs text-[#8992A7]">Add, update, or preview digital curriculum masterclasses.</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#0D101A] text-[#8992A7] uppercase text-[10px] font-bold border-y border-[#252B3B]">
            <tr>
              <th class="py-3 px-4">Product</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Price</th>
              <th class="py-3 px-4">Duration</th>
              <th class="py-3 px-4">Demo Type</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#252B3B]">
            ${products.map((p: any) => `
              <tr class="hover:bg-[#151925]/60 transition-colors">
                <td class="py-3 px-4 flex items-center gap-3">
                  <img src="${escapeHtml(p.thumbnail)}" class="w-12 h-8 rounded object-cover shrink-0" />
                  <div class="min-w-0">
                    <div class="font-bold text-white truncate max-w-xs">${escapeHtml(p.title)}</div>
                    <div class="text-[10px] text-[#8992A7] font-mono">ID: ${p.id} • ${p.purchases_count || 0} sales</div>
                  </div>
                </td>
                <td class="py-3 px-4 text-[#8992A7]">${escapeHtml(p.category)}</td>
                <td class="py-3 px-4 font-bold text-[#35D49A]">${p.price} Credits</td>
                <td class="py-3 px-4 text-xs font-semibold text-[#9B83FF]">${formatDurationType(p.access_duration_type)}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#151925] border border-[#252B3B] text-white">
                    ${p.demo_type}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'PUBLISHED' ? 'bg-[#35D49A]/15 text-[#35D49A]' : 'bg-[#FFB347]/15 text-[#FFB347]'}">
                    ${p.status}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <a href="#/products/${p.id}" target="_blank" class="p-1.5 rounded-lg bg-[#151925] text-[#8992A7] hover:text-white" title="Public View">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </a>
                    <button class="btn-edit-product p-1.5 rounded-lg bg-[#151925] text-[#9B83FF] hover:text-white" data-product-id="${p.id}" title="Edit Product">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-delete-product p-1.5 rounded-lg bg-[#FF5C75]/15 text-[#FF5C75] hover:bg-[#FF5C75] hover:text-white transition-colors" data-product-id="${p.id}" title="Delete">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setupProductsHandlers() {
  document.querySelectorAll('.btn-edit-product').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number((btn as HTMLElement).dataset.productId);
      const res = await api.getProduct(id);
      openProductEditorModal(res.product, () => renderAdmin(document.getElementById('app-content')!));
    });
  });

  document.querySelectorAll('.btn-delete-product').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number((btn as HTMLElement).dataset.productId);
      if (!confirm(`Are you sure you want to delete Product #${id}? This will remove associated lessons and media.`)) return;
      try {
        await api.deleteProduct(id);
        showToast('Product deleted.', 'info');
        renderAdmin(document.getElementById('app-content')!);
      } catch (err: any) {
        showToast(err.message || 'Delete failed', 'error');
      }
    });
  });
}

// Section 38, 77, 96: Product Editor Modal with Live Preview and Rights Confirmation
function openProductEditorModal(existing: any | null, onSaved: () => void) {
  const isEdit = !!existing;

  openModal(`
    <div class="space-y-6 max-h-[85vh] overflow-y-auto pr-2">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <h3 class="text-lg font-bold text-white">${isEdit ? 'Edit Curriculum Product' : 'Create New Digital Product'}</h3>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-[#8992A7] mb-1">Product Title *</label>
          <input id="prod-form-title" type="text" value="${escapeHtml(existing?.title || '')}" placeholder="e.g. AI Automation Masterclass 2026" class="input-field text-xs font-semibold" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[#8992A7] mb-1">Category *</label>
            <select id="prod-form-category" class="input-field text-xs">
              ${['Courses', 'Videos', 'AI Tools', 'AI Resources', 'Prompts', 'Design', 'Development', 'Community'].map((cat) => `
                <option value="${cat}" ${existing?.category === cat ? 'selected' : ''}>${cat}</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Price in Credits *</label>
            <input id="prod-form-price" type="number" min="1" value="${existing?.price || 20}" class="input-field text-xs" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[#8992A7] mb-1">Access Duration System (Section 17) *</label>
            <select id="prod-form-duration" class="input-field text-xs">
              <option value="24_HOURS" ${existing?.access_duration_type === '24_HOURS' ? 'selected' : ''}>24 Hours Access</option>
              <option value="7_DAYS" ${existing?.access_duration_type === '7_DAYS' ? 'selected' : ''}>7 Days Access</option>
              <option value="30_DAYS" ${existing?.access_duration_type === '30_DAYS' || !existing ? 'selected' : ''}>30 Days Access</option>
              <option value="90_DAYS" ${existing?.access_duration_type === '90_DAYS' ? 'selected' : ''}>90 Days Access</option>
              <option value="LIFETIME" ${existing?.access_duration_type === 'LIFETIME' ? 'selected' : ''}>Lifetime Access</option>
            </select>
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Free Demo Type (Section 9) *</label>
            <select id="prod-form-demotype" class="input-field text-xs">
              <option value="VIDEO" ${existing?.demo_type === 'VIDEO' ? 'selected' : ''}>Uploaded Video</option>
              <option value="PHOTOS" ${existing?.demo_type === 'PHOTOS' ? 'selected' : ''}>Photo Gallery</option>
              <option value="EMBED" ${existing?.demo_type === 'EMBED' ? 'selected' : ''}>External Player / Embed</option>
              <option value="LINK" ${existing?.demo_type === 'LINK' ? 'selected' : ''}>External Authorized Link</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Thumbnail Cover URL *</label>
          <input id="prod-form-thumbnail" type="text" value="${escapeHtml(existing?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800')}" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Demo Resource URL / Video Link</label>
          <input id="prod-form-demourl" type="text" value="${escapeHtml(existing?.demo_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Free Demo Description (Section 14)</label>
          <input id="prod-form-demodesc" type="text" value="${escapeHtml(existing?.demo_description || 'Watch the first lesson for free before unlocking the full course.')}" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Full Description *</label>
          <textarea id="prod-form-description" rows="3" class="input-field text-xs">${escapeHtml(existing?.description || '')}</textarea>
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Protected Premium Resource Stream URL *</label>
          <input id="prod-form-premurl" type="text" value="${escapeHtml(existing?.premium_resource_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}" class="input-field text-xs font-mono" />
          <div class="text-[10px] text-[#8992A7] mt-0.5">Authoritative backend access gate will protect this URL from unauthorized inspection.</div>
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Tags (comma separated)</label>
          <input id="prod-form-tags" type="text" value="${escapeHtml(existing?.tags || 'AI, Masterclass, Video')}" class="input-field text-xs" />
        </div>

        <!-- Section 96: Mandatory Rights Confirmation Checkbox -->
        <div class="p-3 rounded-xl bg-[#151925] border border-[#252B3B]">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input id="prod-form-rights" type="checkbox" checked class="mt-0.5 rounded border-[#252B3B] text-[#7C5CFF]" />
            <span class="text-xs text-white">
              <strong>Content Rights Confirmation:</strong> I confirm that I own or am authorized to distribute this digital content on UPI-Pay.
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-3 border-t border-[#252B3B]">
          <button onclick="closeModal()" class="btn-secondary text-xs px-4 py-2">Cancel</button>
          <button id="btn-save-product" class="btn-primary text-xs px-6 py-2 font-bold">
            ${isEdit ? 'Update Product' : 'Publish Product'}
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('btn-save-product')?.addEventListener('click', async () => {
    const title = (document.getElementById('prod-form-title') as HTMLInputElement)?.value.trim();
    const category = (document.getElementById('prod-form-category') as HTMLSelectElement)?.value;
    const price = Number((document.getElementById('prod-form-price') as HTMLInputElement)?.value);
    const duration = (document.getElementById('prod-form-duration') as HTMLSelectElement)?.value;
    const demoType = (document.getElementById('prod-form-demotype') as HTMLSelectElement)?.value;
    const thumbnail = (document.getElementById('prod-form-thumbnail') as HTMLInputElement)?.value.trim();
    const demoUrl = (document.getElementById('prod-form-demourl') as HTMLInputElement)?.value.trim();
    const demoDesc = (document.getElementById('prod-form-demodesc') as HTMLInputElement)?.value.trim();
    const description = (document.getElementById('prod-form-description') as HTMLTextAreaElement)?.value.trim();
    const premUrl = (document.getElementById('prod-form-premurl') as HTMLInputElement)?.value.trim();
    const tags = (document.getElementById('prod-form-tags') as HTMLInputElement)?.value.trim();
    const rightsConfirmed = (document.getElementById('prod-form-rights') as HTMLInputElement)?.checked;

    if (!title || !description || isNaN(price)) {
      showToast('Title, description, and valid price are required.', 'error');
      return;
    }

    if (!rightsConfirmed) {
      showToast('You must confirm content distribution authorization.', 'error');
      return;
    }

    const payload = {
      title,
      category,
      price,
      access_duration_type: duration,
      demo_type: demoType,
      thumbnail,
      demo_url: demoUrl,
      demo_description: demoDesc,
      description,
      premium_resource_url: premUrl,
      tags,
      rights_confirmed: true,
      status: 'PUBLISHED'
    };

    try {
      if (isEdit) {
        await api.updateProduct(existing.id, payload);
        showToast('Product updated successfully!', 'success');
      } else {
        await api.createProduct(payload);
        showToast('New product published successfully!', 'success');
      }
      closeModal();
      onSaved();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  });
}

// 4. Users Table & Section 90 Admin Balance Adjustment
function renderAdminUsersView(users: any[]): string {
  return `
    <div class="card-panel p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">Registered User Accounts</h2>
          <p class="text-xs text-[#8992A7]">Inspect customer wallets and execute audited balance adjustments.</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#0D101A] text-[#8992A7] uppercase text-[10px] font-bold border-y border-[#252B3B]">
            <tr>
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Wallet Balance</th>
              <th class="py-3 px-4">Purchases</th>
              <th class="py-3 px-4">Registered</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#252B3B]">
            ${users.map((u: any) => `
              <tr class="hover:bg-[#151925]/60 transition-colors">
                <td class="py-3 px-4 flex items-center gap-3">
                  <img src="${u.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + u.username}" class="w-8 h-8 rounded-full bg-[#151925]" />
                  <div>
                    <div class="font-bold text-white">@${escapeHtml(u.username)}</div>
                    <div class="text-[10px] text-[#8992A7]">${escapeHtml(u.email)}</div>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-[#FF5C75]/20 text-[#FF5C75]' : 'bg-[#151925] text-[#8992A7]'}">
                    ${u.role}
                  </span>
                </td>
                <td class="py-3 px-4 font-mono font-bold text-[#35D49A] text-sm">
                  ${u.wallet_balance ?? 0} Credits
                </td>
                <td class="py-3 px-4 text-[#8992A7]">
                  ${u.purchases_count || 0} active
                </td>
                <td class="py-3 px-4 text-[#8992A7]">
                  ${new Date(u.created_at).toLocaleDateString()}
                </td>
                <td class="py-3 px-4 text-right">
                  <button class="btn-adjust-user-balance py-1.5 px-3 rounded-lg bg-[#7C5CFF]/20 text-[#9B83FF] hover:bg-[#7C5CFF] hover:text-white font-bold text-xs transition-colors" data-user-id="${u.id}" data-username="${u.username}" data-balance="${u.wallet_balance ?? 0}">
                    ± Adjust Balance
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setupUsersHandlers() {
  document.querySelectorAll('.btn-adjust-user-balance').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = Number((btn as HTMLElement).dataset.userId);
      const uname = (btn as HTMLElement).dataset.username;
      const curBal = Number((btn as HTMLElement).dataset.balance);
      openBalanceAdjustmentModal(uid, uname || 'user', curBal);
    });
  });
}

// Section 90: Admin Balance Adjustment Modal
function openBalanceAdjustmentModal(userId: number, username: string, currentBalance: number) {
  openModal(`
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <h3 class="text-lg font-bold text-white">Adjust User Balance</h3>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-xl bg-[#0D101A] border border-[#252B3B] flex items-center justify-between">
          <div>
            <div class="font-bold text-white">@${escapeHtml(username)}</div>
            <div class="text-[#8992A7]">User ID #${userId}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-[#8992A7]">Current Balance</div>
            <div class="text-sm font-bold text-[#35D49A]">${currentBalance} Credits</div>
          </div>
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Adjustment Amount (+ to add, - to deduct) *</label>
          <input id="input-adj-amount" type="number" placeholder="e.g. +25 or -10" class="input-field text-xs font-mono font-bold" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Mandatory Explanatory Reason (Recorded in Audit Trail) *</label>
          <input id="input-adj-reason" type="text" placeholder="e.g. Manual compensation for billing adjustment" class="input-field text-xs" />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button onclick="closeModal()" class="btn-secondary text-xs px-4 py-2">Cancel</button>
          <button id="btn-save-adjustment" class="btn-primary text-xs px-6 py-2 font-bold">
            Execute Adjustment
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('btn-save-adjustment')?.addEventListener('click', async () => {
    const amount = Number((document.getElementById('input-adj-amount') as HTMLInputElement)?.value);
    const reason = (document.getElementById('input-adj-reason') as HTMLInputElement)?.value.trim();

    if (!amount || !reason || reason.length < 3) {
      showToast('Valid non-zero amount and reason required.', 'error');
      return;
    }

    try {
      const res = await api.adjustUserBalance(userId, amount, reason);
      closeModal();
      showToast(res.message || 'Balance adjusted successfully.', 'success');
      renderAdmin(document.getElementById('app-content')!);
    } catch (err: any) {
      showToast(err.message || 'Adjustment failed', 'error');
    }
  });
}

// 5. Audit Log Ledger (Section 55)
function renderAdminAuditView(logs: any[]): string {
  return `
    <div class="card-panel p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div>
          <h2 class="text-lg font-bold text-white">System & Admin Audit Trail</h2>
          <p class="text-xs text-[#8992A7]">Chronological log of administrative actions, approvals, and security updates.</p>
        </div>
        <span class="text-xs font-mono text-[#8992A7]">${logs.length} Entries</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#0D101A] text-[#8992A7] uppercase text-[10px] font-bold border-y border-[#252B3B]">
            <tr>
              <th class="py-3 px-4">Actor</th>
              <th class="py-3 px-4">Action</th>
              <th class="py-3 px-4">Target</th>
              <th class="py-3 px-4">Details</th>
              <th class="py-3 px-4">IP Address</th>
              <th class="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#252B3B]">
            ${
              logs.length === 0
                ? `<tr><td colspan="6" class="py-8 text-center text-[#8992A7]">No audit records found.</td></tr>`
                : logs.map((l: any) => `
                <tr class="hover:bg-[#151925]/60 transition-colors">
                  <td class="py-3 px-4 font-bold text-white">
                    @${escapeHtml(l.actor_name)}
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#151925] border border-[#252B3B] text-[#9B83FF]">
                      ${escapeHtml(l.action)}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-[#8992A7]">
                    ${l.target_type} #${l.target_id || ''}
                  </td>
                  <td class="py-3 px-4 text-white max-w-sm truncate">
                    ${escapeHtml(l.details || '')}
                  </td>
                  <td class="py-3 px-4 font-mono text-[10px] text-[#8992A7]">
                    ${l.ip_address}
                  </td>
                  <td class="py-3 px-4 text-[#8992A7] whitespace-nowrap">
                    ${new Date(l.created_at).toLocaleDateString()} ${new Date(l.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}
