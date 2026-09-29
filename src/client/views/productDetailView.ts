import { api } from '../api';
import {
  closeModal,
  escapeHtml,
  formatDurationType,
  formatRemainingTime,
  formatTime,
  openModal,
  renderAccessBadge,
  showToast
} from '../ui';
import { renderProductCardHtml, setupProductCardListeners } from './dashboardView';

export async function renderProductDetail(container: HTMLElement, idOrSlug: string) {
  container.innerHTML = `
    <div class="py-20 text-center text-[#8992A7]">
      <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      Loading product details...
    </div>
  `;

  try {
    const res = await api.getProduct(idOrSlug);
    const { product, lessons = [], media = [], reviews = [], related = [] } = res;

    const access = product.user_access || { has_access: false, is_expired: false, is_lifetime: false, remaining_seconds: 0, expires_at: null };
    const hasActiveAccess = access.has_access;
    const isExpired = access.is_expired;

    container.innerHTML = `
      <div class="space-y-10 animate-fade-in">
        <!-- Breadcrumb & Back -->
        <div class="flex items-center justify-between text-xs text-[#8992A7]">
          <a href="#/marketplace" class="flex items-center gap-1.5 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Back to Marketplace
          </a>
          <span class="font-semibold text-white/80">${escapeHtml(product.category)} / ${escapeHtml(product.title)}</span>
        </div>

        <!-- Main Product Header & Demo Area -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left: Demo Showcase Player / Media (7 cols) -->
          <div class="lg:col-span-7 space-y-4">
            <!-- Free Demo Card Container (Section 9) -->
            <div class="card-panel overflow-hidden border border-[#252B3B] bg-[#07090F] shadow-2xl">
              <div class="px-4 py-2.5 bg-[#10131C] border-b border-[#252B3B] flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#FFB347] animate-pulse"></span>
                  <span class="text-xs font-bold text-[#FFB347] uppercase tracking-wider">Free Demo Preview</span>
                </div>
                <span class="text-[11px] text-[#8992A7] font-medium">Public • No Purchase Required</span>
              </div>

              <!-- Demo Presentation based on demo_type (Section 9-13) -->
              <div id="demo-media-container" class="relative aspect-video bg-black flex items-center justify-center">
                ${renderDemoMedia(product, media)}
              </div>

              <!-- Demo Description (Section 14) -->
              <div class="p-4 bg-[#10131C] border-t border-[#252B3B]">
                <p class="text-xs text-[#8992A7] leading-relaxed">
                  <span class="text-white font-semibold">Demo Note:</span> ${escapeHtml(product.demo_description || 'Watch the preview above to explore the core syllabus and production workflows before unlocking full premium access.')}
                </p>
              </div>
            </div>

            <!-- Lessons / Syllabus Breakdown (Section 24) -->
            <div class="card-panel p-6 space-y-4">
              <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
                <div>
                  <h3 class="font-bold text-white text-base">Course Curriculum & Chapters</h3>
                  <div class="text-xs text-[#8992A7]">${lessons.length} lessons • ${formatDurationType(product.access_duration_type)}</div>
                </div>
                <span class="text-xs text-[#35D49A] font-semibold">${lessons.filter((l: any) => l.is_free_preview).length} Free Previews</span>
              </div>

              <div class="space-y-2">
                ${
                  lessons.length === 0
                    ? `<div class="py-4 text-center text-xs text-[#8992A7]">Curriculum syllabus will be posted soon.</div>`
                    : lessons.map((l: any, idx: number) => `
                    <div class="p-3.5 rounded-xl border border-[#252B3B] bg-[#0D101A] hover:bg-[#151925] transition-colors flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-lg ${l.is_free_preview ? 'bg-[#FFB347]/15 text-[#FFB347]' : hasActiveAccess ? 'bg-[#35D49A]/15 text-[#35D49A]' : 'bg-[#151925] text-[#8992A7]'} flex items-center justify-center text-xs font-bold shrink-0">
                          ${idx + 1}
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs md:text-sm font-semibold text-white truncate flex items-center gap-2">
                            ${escapeHtml(l.title)}
                            ${l.is_free_preview ? `<span class="text-[9px] bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/40 px-1.5 py-0.5 rounded font-bold uppercase">Free</span>` : ''}
                          </div>
                          ${l.description ? `<div class="text-[11px] text-[#8992A7] truncate">${escapeHtml(l.description)}</div>` : ''}
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <span class="text-xs text-[#8992A7] font-mono">${formatTime(l.duration_seconds)}</span>
                        ${
                          hasActiveAccess
                            ? `<a href="#/player/${product.id}?lesson=${l.id}" class="p-1.5 rounded-lg bg-[#7C5CFF]/20 text-[#9B83FF] hover:bg-[#7C5CFF] hover:text-white transition-colors" title="Watch Lesson">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </a>`
                            : l.is_free_preview
                            ? `<button class="btn-play-free-lesson p-1.5 rounded-lg bg-[#FFB347]/20 text-[#FFB347] hover:bg-[#FFB347] hover:text-black transition-colors" data-video-url="${escapeHtml(l.video_url)}" data-lesson-title="${escapeHtml(l.title)}" title="Play Free Preview">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </button>`
                            : `<div class="p-1.5 rounded-lg bg-[#151925] text-[#8992A7]" title="Locked - Purchase Required">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                              </div>`
                        }
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          </div>

          <!-- Right: Product Overview & Purchase Card (5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            <div class="card-panel p-6 md:p-8 space-y-6">
              <!-- Category and Rating -->
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider">${escapeHtml(product.category)}</span>
                <div class="flex items-center gap-1.5 text-[#FFB347]">
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span class="text-sm font-bold text-white">${product.rating || '5.0'}</span>
                  <span class="text-xs text-[#8992A7]">(${product.rating_count || 1} reviews)</span>
                </div>
              </div>

              <!-- Title -->
              <h1 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                ${escapeHtml(product.title)}
              </h1>

              <!-- Description -->
              <p class="text-xs md:text-sm text-[#8992A7] leading-relaxed">
                ${escapeHtml(product.description)}
              </p>

              <!-- Tags -->
              ${
                product.tags
                  ? `<div class="flex flex-wrap gap-1.5">
                      ${product.tags.split(',').map((t: string) => `
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#151925] border border-[#252B3B] text-[#8992A7]">
                          #${t.trim()}
                        </span>
                      `).join('')}
                    </div>`
                  : ''
              }

              <!-- Pricing & Access Section (Section 15-20) -->
              <div class="p-5 rounded-2xl bg-[#0D101A] border border-[#252B3B] space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-[10px] uppercase font-bold text-[#8992A7]">Access Cost</div>
                    <div class="text-2xl font-black text-[#35D49A] flex items-baseline gap-1">
                      ${product.price}
                      <span class="text-xs font-bold text-[#8992A7]">Wallet Credits</span>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="text-[10px] uppercase font-bold text-[#8992A7]">Entitlement</div>
                    <div class="text-sm font-bold text-[#9B83FF]">
                      ${formatDurationType(product.access_duration_type)}
                    </div>
                  </div>
                </div>

                <!-- Access Status Banner -->
                ${
                  hasActiveAccess
                    ? `
                  <div class="p-4 rounded-xl bg-[#35D49A]/10 border border-[#35D49A]/30 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-[#35D49A] flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        ACTIVE ACCESS UNLOCKED
                      </span>
                      <span id="product-page-countdown" class="text-xs font-bold text-[#35D49A]">
                        ${formatRemainingTime(access.expires_at)}
                      </span>
                    </div>
                    <p class="text-[11px] text-[#8992A7]">
                      ${access.expires_at ? `Expires: ${new Date(access.expires_at).toLocaleDateString()} at ${new Date(access.expires_at).toLocaleTimeString()}` : 'Lifetime Access. No expiration.'}
                    </p>
                    <a href="#/player/${product.id}" class="btn-primary w-full py-2.5 text-sm font-bold mt-2">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Watch Premium Content
                    </a>
                  </div>
                `
                    : isExpired
                    ? `
                  <div class="p-4 rounded-xl bg-[#FF5C75]/10 border border-[#FF5C75]/30 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-[#FF5C75] flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        ACCESS EXPIRED
                      </span>
                      <span class="text-xs font-bold text-[#FF5C75]">Expired</span>
                    </div>
                    <p class="text-[11px] text-[#8992A7]">Your previous access has ended. Click below to renew and reactivate full streaming access.</p>
                    <button id="btn-open-purchase" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C75] to-[#E03B57] text-white font-bold text-sm shadow-lg shadow-[#FF5C75]/30 hover:opacity-95 transition-all">
                      Renew Access (${product.price} Credits)
                    </button>
                  </div>
                `
                    : `
                  <button id="btn-open-purchase" class="btn-primary w-full py-3 text-sm font-bold">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Unlock Premium Access (${product.price} Credits)
                  </button>
                `
                }
              </div>

              <!-- Metadata List (Section 8) -->
              <div class="border-t border-[#252B3B] pt-4 space-y-2 text-xs">
                <div class="flex items-center justify-between text-[#8992A7]">
                  <span>Content Type</span>
                  <span class="text-white font-semibold">${product.premium_type}</span>
                </div>
                <div class="flex items-center justify-between text-[#8992A7]">
                  <span>Total Lessons</span>
                  <span class="text-white font-semibold">${lessons.length}</span>
                </div>
                <div class="flex items-center justify-between text-[#8992A7]">
                  <span>Access Duration</span>
                  <span class="text-white font-semibold">${formatDurationType(product.access_duration_type)}</span>
                </div>
                <div class="flex items-center justify-between text-[#8992A7]">
                  <span>Updated</span>
                  <span class="text-white font-semibold">${new Date(product.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Verified Reviews Section (Section 28) -->
        <section class="card-panel p-6 md:p-8 space-y-6">
          <div class="flex items-center justify-between border-b border-[#252B3B] pb-4">
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight">Verified Purchaser Reviews</h2>
              <p class="text-xs text-[#8992A7]">Real feedback from verified purchasers of this content.</p>
            </div>
            ${
              hasActiveAccess
                ? `<button id="btn-open-review" class="btn-secondary py-1.5 px-3 text-xs font-bold">
                    ★ Write a Review
                  </button>`
                : ''
            }
          </div>

          <!-- Reviews List -->
          <div class="space-y-4">
            ${
              reviews.length === 0
                ? `<div class="py-8 text-center text-xs text-[#8992A7]">No reviews yet. Verified purchasers can write the first review!</div>`
                : reviews.map((r: any) => `
                <div class="p-4 rounded-xl border border-[#252B3B] bg-[#0D101A] space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <img src="${r.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + r.username}" alt="${escapeHtml(r.username)}" class="w-7 h-7 rounded-full bg-[#151925]" />
                      <span class="text-xs font-bold text-white">@${escapeHtml(r.username)}</span>
                      <span class="text-[10px] bg-[#35D49A]/15 text-[#35D49A] border border-[#35D49A]/30 px-1.5 py-0.2 rounded font-bold">Verified Purchaser</span>
                    </div>
                    <div class="flex items-center gap-1 text-[#FFB347]">
                      ${Array(r.rating).fill('★').join('')}
                    </div>
                  </div>
                  <p class="text-xs text-[#8992A7] leading-relaxed">${escapeHtml(r.review_text)}</p>
                  <div class="text-[10px] text-[#8992A7]">${new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              `).join('')
            }
          </div>
        </section>

        <!-- Related Content (Section 29) -->
        ${
          related.length > 0
            ? `
          <section class="space-y-4">
            <h2 class="text-xl font-bold text-white tracking-tight">You May Also Like</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              ${related.map((p: any) => renderProductCardHtml(p)).join('')}
            </div>
          </section>
        `
            : ''
        }
      </div>
    `;

    setupProductCardListeners(container);

    // Free Preview Lesson click handler
    container.querySelectorAll('.btn-play-free-lesson').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vidUrl = (btn as HTMLElement).dataset.videoUrl;
        const title = (btn as HTMLElement).dataset.lessonTitle;
        const mediaContainer = document.getElementById('demo-media-container');
        if (mediaContainer && vidUrl) {
          mediaContainer.innerHTML = `
            <video id="demo-player" controls autoplay class="w-full h-full object-cover">
              <source src="${vidUrl}" type="video/mp4">
              Your browser does not support HTML5 video.
            </video>
          `;
          showToast(`Now playing free preview: "${title}"`, 'info');
        }
      });
    });

    // Purchase / Renew Modal Handler
    document.getElementById('btn-open-purchase')?.addEventListener('click', async () => {
      openPurchaseModal(product);
    });

    // Write Review Modal Handler
    document.getElementById('btn-open-review')?.addEventListener('click', () => {
      openReviewModal(product.id);
    });
  } catch (err: any) {
    console.error('[Product Detail] Error:', err);
    container.innerHTML = `<div class="p-8 text-center text-[#FF5C75]">Product not found or unavailable.</div>`;
  }
}

// Section 9-13: Render Demo Media Container
function renderDemoMedia(product: any, media: any[]): string {
  switch (product.demo_type) {
    case 'VIDEO':
      return `
        <video id="demo-player" controls preload="metadata" class="w-full h-full object-cover">
          <source src="${escapeHtml(product.demo_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
      `;

    case 'PHOTOS':
      const photos = media.filter((m: any) => m.media_type === 'DEMO_PHOTO');
      const displayPhotos = photos.length > 0 ? photos : [{ url: product.demo_url || product.thumbnail, caption: 'Preview 1' }];
      return `
        <div class="w-full h-full overflow-hidden p-2 grid grid-cols-2 gap-2 bg-[#07090F]">
          ${displayPhotos.map((photo: any) => `
            <div class="relative overflow-hidden rounded-lg group cursor-pointer" onclick="window.open('${escapeHtml(photo.url)}', '_blank')">
              <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || 'Demo Photo')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                🔍 Enlarge
              </div>
            </div>
          `).join('')}
        </div>
      `;

    case 'EMBED':
      // Authorized embed iframe with sandbox security
      const embedUrl = product.demo_url || 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
      return `
        <iframe src="${escapeHtml(embedUrl)}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      `;

    case 'LINK':
    default:
      return `
        <div class="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0D101A]">
          <div class="w-12 h-12 rounded-2xl bg-[#7C5CFF]/15 text-[#9B83FF] flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </div>
          <div class="text-sm font-bold text-white">External Public Demo Resource</div>
          <p class="text-xs text-[#8992A7] max-w-sm">Authorized external preview link provided by the publisher.</p>
          <a href="${escapeHtml(product.demo_url || '#')}" target="_blank" rel="noopener noreferrer" class="btn-primary text-xs font-bold py-2 px-4">
            Open Authorized Demo ↗
          </a>
        </div>
      `;
  }
}

// Section 16 & 75: Interactive Purchase Confirmation & Receipt Modal
async function openPurchaseModal(product: any) {
  let userWallet = { balance: 0 };
  try {
    const me = await api.getMe();
    if (!me.user) {
      showToast('Please sign in or select a demo account to purchase.', 'info');
      window.location.hash = '#/settings';
      return;
    }
    userWallet = me.wallet || { balance: 0 };
  } catch (err) {
    showToast('Please sign in to purchase.', 'error');
    return;
  }

  let discount = 0;
  let appliedCoupon: any = null;

  function renderPurchaseModalContent() {
    const finalPrice = Math.max(0, product.price - discount);
    const hasEnough = userWallet.balance >= finalPrice;

    openModal(`
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-[#252B3B] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#7C5CFF]/20 text-[#9B83FF] flex items-center justify-center font-bold">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Confirm Content Purchase</h3>
              <div class="text-xs text-[#8992A7]">Instant Wallet Checkout</div>
            </div>
          </div>
          <button id="modal-close-btn" class="p-1 rounded-lg text-[#8992A7] hover:text-white hover:bg-[#151925]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Product Summary -->
        <div class="p-4 rounded-xl bg-[#0D101A] border border-[#252B3B] flex items-center gap-4">
          <img src="${escapeHtml(product.thumbnail)}" class="w-16 h-12 object-cover rounded-lg shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-xs text-[#7C5CFF] font-bold">${escapeHtml(product.category)}</div>
            <div class="text-sm font-bold text-white truncate">${escapeHtml(product.title)}</div>
            <div class="text-xs text-[#8992A7]">${formatDurationType(product.access_duration_type)}</div>
          </div>
        </div>

        <!-- Pricing & Wallet Summary -->
        <div class="space-y-3 text-xs">
          <div class="flex items-center justify-between text-[#8992A7]">
            <span>Original Price:</span>
            <span class="text-white font-bold">${product.price} Credits</span>
          </div>

          ${
            discount > 0
              ? `
            <div class="flex items-center justify-between text-[#35D49A]">
              <span>Coupon Discount (${appliedCoupon?.code}):</span>
              <span class="font-bold">-${discount} Credits</span>
            </div>
          `
              : ''
          }

          <div class="flex items-center justify-between text-sm font-extrabold text-white pt-2 border-t border-[#252B3B]">
            <span>Total Payable:</span>
            <span class="text-[#35D49A] text-lg">${finalPrice} Credits</span>
          </div>

          <div class="flex items-center justify-between text-[#8992A7]">
            <span>Your Current Balance:</span>
            <span class="font-bold ${hasEnough ? 'text-white' : 'text-[#FF5C75]'}">${userWallet.balance} Credits</span>
          </div>

          ${
            !hasEnough
              ? `
            <div class="p-3 rounded-lg bg-[#FF5C75]/15 border border-[#FF5C75]/30 text-[#FF5C75] text-xs flex items-center justify-between">
              <span>You need ${finalPrice - userWallet.balance} more credits to complete this purchase.</span>
              <a href="#/wallet" onclick="closeModal()" class="font-bold underline text-white ml-2">Top Up Now →</a>
            </div>
          `
              : ''
          }
        </div>

        <!-- Coupon Code Input -->
        <div class="flex gap-2">
          <input id="coupon-code-input" type="text" placeholder="Promo code (e.g. WELCOME10)" value="${appliedCoupon ? appliedCoupon.code : ''}" class="input-field text-xs uppercase" />
          <button id="btn-apply-coupon" class="btn-secondary text-xs px-4 whitespace-nowrap">Apply</button>
        </div>

        <!-- Actions -->
        <div class="pt-4 border-t border-[#252B3B] flex items-center justify-end gap-3">
          <button id="btn-cancel-purchase" class="btn-secondary text-xs font-semibold py-2 px-4">Cancel</button>
          <button id="btn-confirm-purchase" class="btn-primary text-xs font-bold py-2.5 px-6" ${!hasEnough ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ${hasEnough ? `Confirm & Unlock (${finalPrice} Credits)` : 'Insufficient Credits'}
          </button>
        </div>
      </div>
    `);

    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-purchase')?.addEventListener('click', closeModal);

    // Apply Coupon
    document.getElementById('btn-apply-coupon')?.addEventListener('click', async () => {
      const codeInput = (document.getElementById('coupon-code-input') as HTMLInputElement)?.value.trim();
      if (!codeInput) return;
      try {
        const valRes = await api.validateCoupon(codeInput, product.price);
        if (valRes.success) {
          appliedCoupon = valRes.coupon;
          discount = valRes.coupon.discount_credits;
          showToast(`Coupon applied! ${discount} Credits saved.`, 'success');
          renderPurchaseModalContent();
        }
      } catch (err: any) {
        showToast(err.message || 'Invalid coupon code', 'error');
      }
    });

    // Confirm Purchase
    document.getElementById('btn-confirm-purchase')?.addEventListener('click', async () => {
      const confirmBtn = document.getElementById('btn-confirm-purchase') as HTMLButtonElement;
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerText = 'Processing Entitlement...';
      }

      try {
        const purchaseRes = await api.purchaseProduct(product.id, appliedCoupon?.code);
        closeModal();

        // Render Section 75 Purchase Receipt Modal
        renderPurchaseReceiptModal(purchaseRes.receipt, product.id);

        // Update header wallet credits
        const creditsCountEl = document.getElementById('header-credits-count');
        if (creditsCountEl && purchaseRes.receipt) {
          creditsCountEl.innerText = String(purchaseRes.receipt.balance_remaining);
        }
      } catch (err: any) {
        showToast(err.message || 'Purchase failed', 'error');
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerText = 'Confirm & Unlock';
        }
      }
    });
  }

  renderPurchaseModalContent();
}

// Section 75: Purchase Receipt Component
function renderPurchaseReceiptModal(receipt: any, productId: number) {
  openModal(`
    <div class="space-y-6 text-center">
      <div class="w-16 h-16 rounded-full bg-[#35D49A]/20 text-[#35D49A] flex items-center justify-center mx-auto shadow-lg shadow-[#35D49A]/30">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      </div>

      <div class="space-y-1">
        <h3 class="text-2xl font-black text-white">Purchase Successful!</h3>
        <p class="text-xs text-[#8992A7]">Your protected entitlement has been authorized and unlocked in your library.</p>
      </div>

      <div class="p-5 rounded-2xl bg-[#0D101A] border border-[#252B3B] text-xs space-y-2 text-left">
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Product:</span>
          <span class="text-white font-bold">${escapeHtml(receipt.product_title)}</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Price Paid:</span>
          <span class="text-[#35D49A] font-bold">${receipt.price_paid} Credits</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Remaining Balance:</span>
          <span class="text-white font-bold">${receipt.balance_remaining} Credits</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Access Type:</span>
          <span class="text-[#9B83FF] font-bold">${formatDurationType(receipt.access_duration_type)}</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Starts:</span>
          <span class="text-white">${new Date(receipt.starts_at).toLocaleDateString()}</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Expires:</span>
          <span class="text-white">${receipt.expires_at ? new Date(receipt.expires_at).toLocaleDateString() : 'Lifetime (No expiration)'}</span>
        </div>
        <div class="flex items-center justify-between text-[#8992A7] pt-2 border-t border-[#252B3B]">
          <span>Reference ID:</span>
          <span class="font-mono text-white/80">${receipt.reference}</span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-3">
        <button onclick="closeModal()" class="btn-secondary text-xs px-5 py-2.5">
          Close
        </button>
        <a href="#/player/${productId}" onclick="closeModal()" class="btn-primary text-xs px-6 py-2.5">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          Watch Now
        </a>
      </div>
    </div>
  `);
}

// Write Review Modal
function openReviewModal(productId: number) {
  let selectedRating = 5;

  openModal(`
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <h3 class="text-lg font-bold text-white">Write a Verified Review</h3>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[#8992A7] mb-2">Rating</label>
          <div id="star-picker" class="flex items-center gap-2 text-2xl text-[#FFB347] cursor-pointer">
            <span data-star="1">★</span>
            <span data-star="2">★</span>
            <span data-star="3">★</span>
            <span data-star="4">★</span>
            <span data-star="5">★</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#8992A7] mb-1">Your Review</label>
          <textarea id="review-text-input" rows="4" placeholder="Share your experience with the curriculum, workflows, and key takeaways..." class="input-field text-xs"></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button onclick="closeModal()" class="btn-secondary text-xs px-4 py-2">Cancel</button>
          <button id="btn-submit-review" class="btn-primary text-xs px-6 py-2">Submit Review</button>
        </div>
      </div>
    </div>
  `);

  const starPicker = document.getElementById('star-picker');
  starPicker?.querySelectorAll('span').forEach((el) => {
    el.addEventListener('click', () => {
      selectedRating = Number(el.dataset.star);
      updateStarPicker();
    });
  });

  function updateStarPicker() {
    starPicker?.querySelectorAll('span').forEach((el) => {
      const val = Number(el.dataset.star);
      el.style.opacity = val <= selectedRating ? '1' : '0.25';
    });
  }

  document.getElementById('btn-submit-review')?.addEventListener('click', async () => {
    const text = (document.getElementById('review-text-input') as HTMLTextAreaElement)?.value.trim();
    try {
      await api.submitReview(productId, selectedRating, text);
      closeModal();
      showToast('Review submitted successfully!', 'success');
      renderProductDetail(document.getElementById('app-content')!, String(productId));
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    }
  });
}
