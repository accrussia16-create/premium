import { api } from '../api';
import {
  escapeHtml,
  formatDurationType,
  formatRemainingTime,
  formatTime,
  showToast
} from '../ui';

export async function renderPlayer(container: HTMLElement, productId: number, initialLessonId?: number) {
  container.innerHTML = `
    <div class="py-20 text-center text-[#8992A7]">
      <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      Verifying protected access entitlement...
    </div>
  `;

  let authData: any = null;

  try {
    authData = await api.getAuthorizedContent(productId);
  } catch (err: any) {
    // Access denied / expired
    const statusData = err.data || {};
    const isExpired = statusData.error === 'ACCESS_EXPIRED';

    container.innerHTML = `
      <div class="max-w-2xl mx-auto py-16 text-center space-y-6 animate-fade-in">
        <div class="w-20 h-20 rounded-3xl ${isExpired ? 'bg-[#FF5C75]/20 text-[#FF5C75]' : 'bg-[#7C5CFF]/20 text-[#9B83FF]'} flex items-center justify-center mx-auto shadow-2xl">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>

        <div class="space-y-2">
          <h2 class="text-3xl font-black text-white">
            ${isExpired ? 'Access Expired' : 'Protected Premium Content'}
          </h2>
          <p class="text-sm text-[#8992A7] max-w-md mx-auto">
            ${isExpired ? 'Your access period for this masterclass has ended. Renew access to resume streaming and unlock all protected video lessons.' : 'This masterclass is locked. You must purchase an access entitlement with your wallet credits to stream.'}
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-[#10131C] border border-[#252B3B] max-w-md mx-auto flex items-center justify-between">
          <div class="text-left">
            <div class="text-xs text-[#8992A7]">Required Entitlement</div>
            <div class="text-base font-bold text-white">${statusData.product_title || 'Masterclass Access'}</div>
          </div>
          <div class="text-xl font-black text-[#35D49A]">
            ${statusData.price || 20} <span class="text-xs text-[#8992A7]">Credits</span>
          </div>
        </div>

        <div class="flex items-center justify-center gap-3">
          <a href="#/products/${productId}" class="btn-secondary text-xs px-5 py-2.5">
            View Free Demo & Details
          </a>
          <a href="#/products/${productId}" class="btn-primary text-xs px-6 py-2.5 font-bold">
            ${isExpired ? 'Renew Access Now' : 'Unlock Access'}
          </a>
        </div>
      </div>
    `;
    return;
  }

  // Authorization SUCCESS!
  const { product, access, lessons = [], saved_progress, security } = authData;

  // Determine current lesson
  let currentLessonIndex = 0;
  if (initialLessonId) {
    const idx = lessons.findIndex((l: any) => l.id === initialLessonId);
    if (idx !== -1) currentLessonIndex = idx;
  } else if (saved_progress?.lesson_id) {
    const idx = lessons.findIndex((l: any) => l.id === saved_progress.lesson_id);
    if (idx !== -1) currentLessonIndex = idx;
  }

  const currentLesson = lessons[currentLessonIndex] || {
    id: 0,
    title: product.title,
    video_url: product.premium_resource_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration_seconds: 600
  };

  container.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <!-- Player Top Bar (Header with Countdown & Lesson info) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252B3B] pb-4">
        <div>
          <div class="flex items-center gap-2 text-xs text-[#8992A7] mb-1">
            <a href="#/products/${productId}" class="hover:text-white flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              ${escapeHtml(product.title)}
            </a>
            <span>•</span>
            <span class="text-[#9B83FF] font-semibold">Lesson ${currentLessonIndex + 1} of ${lessons.length}</span>
          </div>
          <h1 id="active-lesson-title" class="text-xl md:text-2xl font-black text-white tracking-tight">
            ${escapeHtml(currentLesson.title)}
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-[#10131C] border border-[#252B3B] px-3 py-1.5 rounded-xl text-xs">
            <span class="w-2 h-2 rounded-full bg-[#35D49A] animate-pulse"></span>
            <span id="player-countdown" class="font-bold text-[#35D49A]">
              ${formatRemainingTime(access.expires_at)}
            </span>
          </div>
          <a href="#/products/${productId}" class="btn-secondary py-1.5 px-3 text-xs font-semibold">
            Product Details
          </a>
        </div>
      </div>

      <!-- Main Player Grid (Player on Left 8 cols, Lessons Playlist on Right 4 cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Video Player Column (Section 22) -->
        <div class="lg:col-span-8 space-y-4">
          <!-- Video Frame Container -->
          <div class="relative aspect-video rounded-2xl overflow-hidden bg-black border border-[#252B3B] shadow-2xl group">
            <video id="premium-video" class="w-full h-full object-contain" preload="auto">
              <source id="video-source" src="${escapeHtml(currentLesson.video_url)}" type="video/mp4">
              Your browser does not support HTML5 video streaming.
            </video>

            <!-- Video Watermark Overlay (Section 44) -->
            <div id="video-watermark" class="video-watermark-overlay">
              ${escapeHtml(security?.watermark || 'UPI-Pay Protected')}
            </div>

            <!-- Resume Notification Banner -->
            <div id="resume-banner" class="hidden absolute top-4 left-4 right-4 bg-[#10131C]/90 backdrop-blur-md border border-[#7C5CFF]/40 rounded-xl p-3 flex items-center justify-between text-xs z-30 animate-fade-in">
              <div class="flex items-center gap-2 text-white">
                <svg class="w-4 h-4 text-[#35D49A]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                <span>Resumed playback from previous saved position (<span id="resume-time-text">00:00</span>).</span>
              </div>
              <button id="btn-dismiss-resume" class="text-[#8992A7] hover:text-white text-xs">Dismiss</button>
            </div>
          </div>

          <!-- Video Custom Controls Bar (Playback Speed, Fullscreen, Navigation) -->
          <div class="card-panel p-4 flex flex-wrap items-center justify-between gap-3">
            <!-- Navigation -->
            <div class="flex items-center gap-2">
              <button id="btn-prev-lesson" class="btn-secondary py-1.5 px-3 text-xs font-semibold" ${currentLessonIndex === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                ← Previous
              </button>
              <button id="btn-next-lesson" class="btn-secondary py-1.5 px-3 text-xs font-semibold" ${currentLessonIndex >= lessons.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                Next Lesson →
              </button>
            </div>

            <!-- Speeds & Quality -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5 text-xs text-[#8992A7]">
                <span>Speed:</span>
                <select id="select-playback-speed" class="bg-[#0D101A] border border-[#252B3B] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#7C5CFF]">
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1" selected>1.0x (Normal)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 text-xs text-[#8992A7]">
                <span>Quality:</span>
                <select id="select-quality" class="bg-[#0D101A] border border-[#252B3B] rounded-lg px-2 py-1 text-white text-xs focus:outline-none">
                  <option value="1080p">1080p HD</option>
                  <option value="720p">720p</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Lesson Details & Description -->
          <div class="card-panel p-6 space-y-3">
            <h3 class="font-bold text-white text-base">Lesson Notes</h3>
            <p class="text-xs md:text-sm text-[#8992A7] leading-relaxed">
              ${escapeHtml(currentLesson.description || 'Welcome to this masterclass lesson. Track your progress automatically as you watch. Key source codes and repository notes are available below.')}
            </p>
          </div>
        </div>

        <!-- Lessons Playlist Sidebar (Section 24) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="card-panel p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
              <div>
                <h3 class="font-bold text-white text-sm">Course Playlist</h3>
                <div class="text-xs text-[#8992A7]">${lessons.length} Modules</div>
              </div>
              <span id="player-progress-badge" class="text-xs font-bold text-[#35D49A]">
                ${saved_progress?.completion_percent || 0}% Complete
              </span>
            </div>

            <!-- Lessons Scrollable List -->
            <div class="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              ${lessons.map((l: any, idx: number) => {
                const isCurrent = idx === currentLessonIndex;
                return `
                  <div class="lesson-playlist-item cursor-pointer p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-[#7C5CFF]/15 border-[#7C5CFF] text-white shadow-md shadow-[#7C5CFF]/20'
                      : 'bg-[#0D101A] border-[#252B3B] text-[#8992A7] hover:text-white hover:bg-[#151925]'
                  }" data-lesson-index="${idx}">
                    <div class="flex items-center gap-2.5">
                      <div class="w-6 h-6 rounded-md ${isCurrent ? 'bg-[#7C5CFF] text-white' : 'bg-[#151925] text-[#8992A7]'} flex items-center justify-center text-[11px] font-bold shrink-0">
                        ${idx + 1}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-semibold truncate ${isCurrent ? 'text-white' : 'text-[#F5F7FB]'}">
                          ${escapeHtml(l.title)}
                        </div>
                        <div class="text-[10px] text-[#8992A7] font-mono mt-0.5">
                          ${formatTime(l.duration_seconds)}
                        </div>
                      </div>
                      ${
                        isCurrent
                          ? `<span class="w-2 h-2 rounded-full bg-[#35D49A] animate-pulse"></span>`
                          : ''
                      }
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // VIDEO PLAYER BEHAVIOR & CONTINUOUS PROGRESS SAVING (Section 23)
  const video = document.getElementById('premium-video') as HTMLVideoElement;
  if (!video) return;

  // Restore saved position if matching current lesson
  if (saved_progress && (saved_progress.lesson_id === currentLesson.id || !saved_progress.lesson_id)) {
    const savedPos = saved_progress.position_seconds || 0;
    if (savedPos > 5) {
      video.currentTime = savedPos;
      const resumeBanner = document.getElementById('resume-banner');
      const resumeTimeText = document.getElementById('resume-time-text');
      if (resumeBanner && resumeTimeText) {
        resumeTimeText.innerText = formatTime(savedPos);
        resumeBanner.classList.remove('hidden');
        setTimeout(() => resumeBanner.classList.add('hidden'), 6000);
      }
    }
  }

  document.getElementById('btn-dismiss-resume')?.addEventListener('click', () => {
    document.getElementById('resume-banner')?.classList.add('hidden');
  });

  // Track & Save Progress every 5 seconds
  let lastSavedTime = 0;
  async function syncProgress() {
    if (!video.duration || isNaN(video.duration)) return;
    const curTime = Math.floor(video.currentTime);
    if (Math.abs(curTime - lastSavedTime) < 4) return; // Debounce save
    lastSavedTime = curTime;

    try {
      const res = await api.saveProgress({
        product_id: productId,
        lesson_id: currentLesson.id,
        position_seconds: curTime,
        duration_seconds: Math.floor(video.duration)
      });
      const badge = document.getElementById('player-progress-badge');
      if (badge && res.completion_percent !== undefined) {
        badge.innerText = `${res.completion_percent}% Complete`;
      }
    } catch (err) {
      // Background save error
    }
  }

  video.addEventListener('timeupdate', syncProgress);
  video.addEventListener('pause', syncProgress);
  video.addEventListener('ended', async () => {
    await syncProgress();
    // Auto proceed to next lesson if available
    if (currentLessonIndex < lessons.length - 1) {
      showToast('Lesson completed! Loading next module...', 'success');
      setTimeout(() => {
        renderPlayer(container, productId, lessons[currentLessonIndex + 1].id);
      }, 1500);
    }
  });

  // Speeds selector
  document.getElementById('select-playback-speed')?.addEventListener('change', (e) => {
    video.playbackRate = parseFloat((e.target as HTMLSelectElement).value);
  });

  // Navigation handlers
  document.getElementById('btn-prev-lesson')?.addEventListener('click', () => {
    if (currentLessonIndex > 0) {
      renderPlayer(container, productId, lessons[currentLessonIndex - 1].id);
    }
  });

  document.getElementById('btn-next-lesson')?.addEventListener('click', () => {
    if (currentLessonIndex < lessons.length - 1) {
      renderPlayer(container, productId, lessons[currentLessonIndex + 1].id);
    }
  });

  // Playlist items click handler
  container.querySelectorAll('.lesson-playlist-item').forEach((item) => {
    item.addEventListener('click', () => {
      const idx = Number((item as HTMLElement).dataset.lessonIndex);
      if (lessons[idx]) {
        renderPlayer(container, productId, lessons[idx].id);
      }
    });
  });
}
