import { api } from '../api';
import { escapeHtml, formatDurationType, formatRemainingTime, renderAccessBadge } from '../ui';

export async function renderDashboard(container: HTMLElement) {
  container.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      <!-- Loading Skeleton -->
      <div class="h-64 bg-[#10131C] rounded-2xl animate-pulse border border-[#252B3B]"></div>
    </div>
  `;

  try {
    const [productsRes, libraryRes, meRes] = await Promise.all([
      api.getProducts({ sort: 'popular' }),
      api.getLibrary().catch(() => ({ success: false, library: null })),
      api.getMe().catch(() => ({ success: false, user: null }))
    ]);

    const products = productsRes.products || [];
    const library = libraryRes.library || { continue_watching: [], purchased: [], favorites: [] };
    const user = meRes.user;
    const wallet = meRes.wallet || { balance: 0 };

    const continueWatching = library.continue_watching || [];
    const featured = products.slice(0, 4);
    const newReleases = [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

    container.innerHTML = `
      <div class="space-y-10 animate-fade-in">
        <!-- Hero Section (Section 6) -->
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10131C] via-[#151925] to-[#10131C] border border-[#252B3B] p-6 md:p-12 shadow-2xl">
          <div class="absolute -right-20 -top-20 w-96 h-96 bg-[#7C5CFF]/15 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-[#35D49A]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="relative z-10 max-w-2xl space-y-5">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-xs font-bold text-[#9B83FF]">
              <span class="w-2 h-2 rounded-full bg-[#7C5CFF] animate-ping"></span>
              Next-Gen Digital Content & Video Marketplace
            </div>
            
            <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Watch. Learn. <br/><span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7C5CFF] via-[#9B83FF] to-[#35D49A]">Unlock Premium.</span>
            </h1>
            
            <p class="text-sm md:text-base text-[#8992A7] leading-relaxed">
              Discover premium videos, video courses, AI resources, design kits and exclusive digital assets. Preview free lessons before unlocking protected masterclasses with instant credit wallet.
            </p>
            
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <a href="#/marketplace" class="btn-primary text-sm font-bold px-6 py-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                Explore Marketplace
              </a>
              ${
                continueWatching.length > 0
                  ? `<a href="#/player/${continueWatching[0].product_id}" class="btn-secondary text-sm font-bold px-6 py-3">
                      <svg class="w-4 h-4 text-[#35D49A]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Resume Watching
                    </a>`
                  : `<a href="#/library" class="btn-secondary text-sm font-bold px-6 py-3">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      My Library
                    </a>`
              }
            </div>
          </div>
        </section>

        <!-- Quick Stats Grid (Section 6) -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card-panel p-5 flex items-center justify-between">
            <div>
              <div class="text-xs text-[#8992A7] font-semibold mb-1">Wallet Balance</div>
              <div class="text-2xl font-extrabold text-[#35D49A]">${wallet.balance} <span class="text-xs text-[#8992A7]">Credits</span></div>
            </div>
            <a href="#/wallet" class="w-10 h-10 rounded-xl bg-[#35D49A]/15 text-[#35D49A] flex items-center justify-center hover:scale-105 transition-transform" title="Top Up">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </a>
          </div>

          <div class="card-panel p-5 flex items-center justify-between">
            <div>
              <div class="text-xs text-[#8992A7] font-semibold mb-1">Active Access</div>
              <div class="text-2xl font-extrabold text-white">${library.purchased?.length || 0} <span class="text-xs text-[#8992A7]">Items</span></div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-[#7C5CFF]/15 text-[#9B83FF] flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
          </div>

          <div class="card-panel p-5 flex items-center justify-between">
            <div>
              <div class="text-xs text-[#8992A7] font-semibold mb-1">Total Purchases</div>
              <div class="text-2xl font-extrabold text-white">${(library.purchased?.length || 0) + (library.expired?.length || 0)} <span class="text-xs text-[#8992A7]">Orders</span></div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-[#151925] border border-[#252B3B] text-[#8992A7] flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
          </div>

          <div class="card-panel p-5 flex items-center justify-between">
            <div>
              <div class="text-xs text-[#8992A7] font-semibold mb-1">Saved Content</div>
              <div class="text-2xl font-extrabold text-[#FF5C75]">${library.favorites?.length || 0} <span class="text-xs text-[#8992A7]">Items</span></div>
            </div>
            <a href="#/library" class="w-10 h-10 rounded-xl bg-[#FF5C75]/15 text-[#FF5C75] flex items-center justify-center">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </a>
          </div>
        </section>

        <!-- Continue Watching Section (Section 23) -->
        ${
          continueWatching.length > 0
            ? `
          <section class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-[#35D49A] animate-pulse"></span>
                <h2 class="text-xl font-bold text-white tracking-tight">Continue Watching</h2>
              </div>
              <a href="#/library" class="text-xs font-semibold text-[#7C5CFF] hover:underline">View All in Library →</a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${continueWatching.map((item: any) => `
                <div class="card-panel overflow-hidden group flex flex-col justify-between">
                  <div class="relative aspect-video overflow-hidden bg-black">
                    <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div class="absolute inset-0 bg-gradient-to-t from-[#07090F] via-transparent to-transparent"></div>
                    <a href="#/player/${item.product_id}" class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div class="w-12 h-12 rounded-full bg-[#7C5CFF] text-white flex items-center justify-center shadow-lg shadow-[#7C5CFF]/50 scale-90 group-hover:scale-100 transition-transform">
                        <svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </a>
                    <div class="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
                      <span>${escapeHtml(item.progress?.lesson_title || 'Resume Playback')}</span>
                      <span class="font-bold text-[#35D49A]">${item.progress?.completion_percent || 0}%</span>
                    </div>
                    <!-- Progress Bar -->
                    <div class="absolute bottom-0 left-0 right-0 h-1 bg-[#252B3B]">
                      <div class="h-full bg-gradient-to-r from-[#7C5CFF] to-[#35D49A]" style="width: ${item.progress?.completion_percent || 0}%"></div>
                    </div>
                  </div>

                  <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="text-[#8992A7] font-semibold">${escapeHtml(item.category)}</span>
                        ${renderAccessBadge(item.access)}
                      </div>
                      <h3 class="font-bold text-white text-sm line-clamp-1 group-hover:text-[#9B83FF] transition-colors">
                        ${escapeHtml(item.title)}
                      </h3>
                    </div>

                    <a href="#/player/${item.product_id}" class="btn-primary w-full py-2 text-xs font-bold">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Resume Lesson
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `
            : ''
        }

        <!-- Featured Content Section (Section 6) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white tracking-tight">Featured Masterclasses</h2>
            <a href="#/marketplace" class="text-xs font-semibold text-[#7C5CFF] hover:underline">Explore Marketplace →</a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            ${featured.map((p: any) => renderProductCardHtml(p)).join('')}
          </div>
        </section>

        <!-- New Releases Section -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white tracking-tight">New Releases & AI Resources</h2>
            <a href="#/marketplace?sort=newest" class="text-xs font-semibold text-[#7C5CFF] hover:underline">View All New →</a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            ${newReleases.map((p: any) => renderProductCardHtml(p)).join('')}
          </div>
        </section>
      </div>
    `;

    setupProductCardListeners(container);
  } catch (err: any) {
    console.error('[Dashboard Render] Error:', err);
    container.innerHTML = `<div class="p-8 text-center text-[#FF5C75] bg-[#10131C] rounded-2xl border border-[#252B3B]">Error loading dashboard. Please refresh.</div>`;
  }
}

// Section 7 Reusable Product Card Component
export function renderProductCardHtml(product: any): string {
  const isPurchased = product.user_access?.has_access;
  const isExpired = product.user_access?.is_expired;
  const isFavorite = product.is_favorite;

  return `
    <div class="card-panel overflow-hidden group flex flex-col justify-between" data-product-id="${product.id}">
      <!-- Thumbnail Header -->
      <div class="relative aspect-video overflow-hidden bg-[#07090F]">
        <img src="${escapeHtml(product.thumbnail)}" alt="${escapeHtml(product.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#10131C] via-transparent to-black/20"></div>

        <!-- Top Badges -->
        <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span class="badge-demo">
            ${product.demo_type === 'VIDEO' ? '▶ Free Video Demo' : product.demo_type === 'PHOTOS' ? '🖼 Photo Gallery' : '🔗 Free Preview'}
          </span>
          <button class="btn-favorite p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all ${isFavorite ? 'text-[#FF5C75]' : 'text-white/80'}" data-favorite-id="${product.id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            <svg class="w-4 h-4" fill="${isFavorite ? '#FF5C75' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </button>
        </div>

        <!-- Bottom Duration Pill -->
        <div class="absolute bottom-2 left-2.5">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#9B83FF] border border-[#7C5CFF]/30 backdrop-blur-sm">
            ${formatDurationType(product.access_duration_type)}
          </span>
        </div>
      </div>

      <!-- Card Body -->
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between text-xs text-[#8992A7] mb-1">
            <span class="font-semibold">${escapeHtml(product.category)}</span>
            <div class="flex items-center gap-1 text-[#FFB347]">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span class="font-bold text-xs text-white">${product.rating || '5.0'}</span>
              <span class="text-[10px] text-[#8992A7]">(${product.rating_count || 1})</span>
            </div>
          </div>

          <h3 class="font-bold text-white text-sm line-clamp-1 group-hover:text-[#9B83FF] transition-colors">
            ${escapeHtml(product.title)}
          </h3>

          <p class="text-xs text-[#8992A7] line-clamp-2 mt-1 leading-relaxed">
            ${escapeHtml(product.description)}
          </p>
        </div>

        <!-- Footer Price & CTA -->
        <div class="pt-2 border-t border-[#252B3B] flex items-center justify-between gap-2">
          <div>
            <div class="text-[10px] text-[#8992A7] uppercase font-bold">Price</div>
            <div class="text-sm font-extrabold text-[#35D49A]">
              ${product.price} <span class="text-[10px] font-bold text-[#8992A7]">Credits</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            ${
              isPurchased
                ? `<a href="#/player/${product.id}" class="btn-success py-1.5 px-3 text-xs font-bold" title="Watch Premium Content">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Watch
                  </a>`
                : isExpired
                ? `<a href="#/products/${product.id}" class="py-1.5 px-3 rounded-lg bg-[#FF5C75]/20 text-[#FF5C75] border border-[#FF5C75]/40 text-xs font-bold hover:bg-[#FF5C75]/30 transition-all">
                    Renew
                  </a>`
                : `<a href="#/products/${product.id}" class="btn-secondary py-1.5 px-3 text-xs font-bold">
                    View Demo
                  </a>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupProductCardListeners(container: HTMLElement) {
  // Favorite toggle listener
  container.querySelectorAll('.btn-favorite').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const prodId = Number((btn as HTMLElement).dataset.favoriteId);
      try {
        const res = await api.toggleFavorite(prodId);
        const icon = btn.querySelector('svg');
        if (res.is_favorite) {
          btn.classList.add('text-[#FF5C75]');
          btn.classList.remove('text-white/80');
          icon?.setAttribute('fill', '#FF5C75');
        } else {
          btn.classList.remove('text-[#FF5C75]');
          btn.classList.add('text-white/80');
          icon?.setAttribute('fill', 'none');
        }
      } catch (err: any) {
        window.location.hash = '#/settings';
      }
    });
  });
}
