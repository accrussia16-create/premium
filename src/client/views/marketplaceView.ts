import { api } from '../api';
import { renderProductCardHtml, setupProductCardListeners } from './dashboardView';

const CATEGORIES = ['All', 'Courses', 'Videos', 'AI Tools', 'AI Resources', 'Prompts', 'Design', 'Development', 'Community'];

export async function renderMarketplace(container: HTMLElement, initialSearch: string = '') {
  let activeCategory = 'All';
  let activeSort = 'popular';
  let activeDuration = 'All';
  let activeDemoType = 'All';
  let searchQuery = initialSearch;

  async function loadAndRender() {
    const gridContainer = document.getElementById('marketplace-grid');
    const countEl = document.getElementById('marketplace-count');
    if (gridContainer) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-16 text-center text-[#8992A7]">
          <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading marketplace catalog...
        </div>
      `;
    }

    try {
      const res = await api.getProducts({
        category: activeCategory,
        sort: activeSort,
        duration: activeDuration,
        demo_type: activeDemoType,
        search: searchQuery
      });

      const products = res.products || [];
      if (countEl) countEl.innerText = `${products.length} products found`;

      if (!gridContainer) return;

      if (products.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-span-full card-panel p-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-[#151925] border border-[#252B3B] text-[#8992A7] flex items-center justify-center mx-auto">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <h3 class="text-lg font-bold text-white">No products found</h3>
            <p class="text-xs text-[#8992A7] max-w-sm mx-auto">Try clearing your search query or switching categories to discover available digital content.</p>
            <button id="btn-reset-filters" class="btn-secondary text-xs font-bold px-4 py-2 mt-2">Reset Filters</button>
          </div>
        `;
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
          activeCategory = 'All';
          activeDuration = 'All';
          activeDemoType = 'All';
          searchQuery = '';
          const searchInput = document.getElementById('marketplace-search-input') as HTMLInputElement;
          if (searchInput) searchInput.value = '';
          renderCategories();
          loadAndRender();
        });
        return;
      }

      gridContainer.innerHTML = products.map((p: any) => renderProductCardHtml(p)).join('');
      setupProductCardListeners(gridContainer);
    } catch (err: any) {
      if (gridContainer) {
        gridContainer.innerHTML = `<div class="col-span-full p-8 text-center text-[#FF5C75]">Failed to load products.</div>`;
      }
    }
  }

  function renderCategories() {
    const catContainer = document.getElementById('category-pills');
    if (!catContainer) return;

    catContainer.innerHTML = CATEGORIES.map(
      (cat) => `
      <button class="cat-pill shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        activeCategory === cat
          ? 'bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/30'
          : 'bg-[#10131C] border border-[#252B3B] text-[#8992A7] hover:text-white hover:border-[#384259]'
      }" data-cat="${cat}">
        ${cat}
      </button>
    `
    ).join('');

    catContainer.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = (btn as HTMLElement).dataset.cat || 'All';
        renderCategories();
        loadAndRender();
      });
    });
  }

  container.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      <!-- Header & Intro -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#252B3B] pb-6">
        <div>
          <div class="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider mb-1">Digital Marketplace</div>
          <h1 class="text-3xl font-black text-white tracking-tight">Explore Premium Content</h1>
          <p class="text-xs md:text-sm text-[#8992A7] mt-1">Watch free previews, choose access duration, and unlock verified high-impact digital resources.</p>
        </div>
        <div id="marketplace-count" class="text-xs font-semibold text-[#8992A7]">
          Loading products...
        </div>
      </div>

      <!-- Controls & Filters Bar -->
      <div class="space-y-4">
        <!-- Search and Sort row -->
        <div class="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
          <div class="relative flex-1">
            <input id="marketplace-search-input" type="text" value="${searchQuery}" placeholder="Search products, lessons, keywords, tags..." class="w-full bg-[#10131C] border border-[#252B3B] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#8992A7] focus:outline-none focus:border-[#7C5CFF] transition-colors" />
            <svg class="w-4 h-4 text-[#8992A7] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div class="flex items-center gap-2">
            <!-- Access Duration Filter -->
            <select id="select-duration" class="bg-[#10131C] border border-[#252B3B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7C5CFF]">
              <option value="All">All Durations</option>
              <option value="24_HOURS">24 Hours</option>
              <option value="7_DAYS">7 Days</option>
              <option value="30_DAYS">30 Days</option>
              <option value="90_DAYS">90 Days</option>
              <option value="LIFETIME">Lifetime</option>
            </select>

            <!-- Demo Type Filter -->
            <select id="select-demo-type" class="bg-[#10131C] border border-[#252B3B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7C5CFF]">
              <option value="All">All Demo Types</option>
              <option value="VIDEO">Video Demo</option>
              <option value="PHOTOS">Photo Gallery</option>
              <option value="EMBED">Embed Player</option>
              <option value="LINK">External Link</option>
            </select>

            <!-- Sort By -->
            <select id="select-sort" class="bg-[#10131C] border border-[#252B3B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#7C5CFF]">
              <option value="popular">Most Popular</option>
              <option value="newest">Newest Releases</option>
              <option value="rating">Highest Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <!-- Categories Scrollable Pills -->
        <div id="category-pills" class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <!-- Populated by renderCategories -->
        </div>
      </div>

      <!-- Products Grid -->
      <div id="marketplace-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  renderCategories();

  // Search input with debounce
  const searchInput = document.getElementById('marketplace-search-input') as HTMLInputElement;
  let searchTimeout: any;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      loadAndRender();
    }, 300);
  });

  document.getElementById('select-sort')?.addEventListener('change', (e) => {
    activeSort = (e.target as HTMLSelectElement).value;
    loadAndRender();
  });

  document.getElementById('select-duration')?.addEventListener('change', (e) => {
    activeDuration = (e.target as HTMLSelectElement).value;
    loadAndRender();
  });

  document.getElementById('select-demo-type')?.addEventListener('change', (e) => {
    activeDemoType = (e.target as HTMLSelectElement).value;
    loadAndRender();
  });

  loadAndRender();
}
