// UI Helpers, Modals, Toasts, and Formatters

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `animate-fade-in pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs md:text-sm font-semibold border backdrop-blur-md transition-all ${
    type === 'success'
      ? 'bg-[#10131C]/95 text-[#35D49A] border-[#35D49A]/40'
      : type === 'error'
      ? 'bg-[#10131C]/95 text-[#FF5C75] border-[#FF5C75]/40'
      : 'bg-[#10131C]/95 text-[#F5F7FB] border-[#7C5CFF]/40'
  }`;

  const icon =
    type === 'success'
      ? `<svg class="w-5 h-5 shrink-0 text-[#35D49A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : type === 'error'
      ? `<svg class="w-5 h-5 shrink-0 text-[#FF5C75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
      : `<svg class="w-5 h-5 shrink-0 text-[#7C5CFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

export function openModal(htmlContent: string) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div id="modal-backdrop-el" class="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div class="relative w-full max-w-2xl bg-[#10131C] border border-[#252B3B] rounded-2xl shadow-2xl p-6 my-8 animate-fade-in text-white" onclick="event.stopPropagation()">
        ${htmlContent}
      </div>
    </div>
  `;

  const backdrop = document.getElementById('modal-backdrop-el');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  document.body.style.overflow = 'hidden';
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) {
    container.innerHTML = '';
  }
  document.body.style.overflow = '';
}

// Section 19 & 73: Authoritative Expiration Countdown Formatter
export function formatRemainingTime(expiresAt: string | null | undefined): string {
  if (expiresAt === null || expiresAt === undefined) {
    return '♾ Lifetime Access';
  }

  const expireMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  const diffSec = Math.floor((expireMs - nowMs) / 1000);

  if (diffSec <= 0) {
    return '🔒 Access Expired';
  }

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (days >= 2) {
    return `⏱ ${days} days remaining`;
  } else if (days === 1) {
    return `⏱ 1 day ${hours}h remaining`;
  } else if (hours >= 1) {
    return `⏱ ${hours}h ${minutes}m remaining`;
  } else {
    return `⏱ ${minutes}m ${seconds}s remaining`;
  }
}

// Format duration type string
export function formatDurationType(type: string): string {
  switch (type) {
    case '24_HOURS': return '24 Hours Access';
    case '7_DAYS': return '7 Days Access';
    case '30_DAYS': return '30 Days Access';
    case '90_DAYS': return '90 Days Access';
    case 'LIFETIME': return 'Lifetime Access';
    case 'CUSTOM': return 'Custom Duration';
    default: return type.replace('_', ' ');
  }
}

// Format seconds into MM:SS or HH:MM:SS
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderAccessBadge(access: any): string {
  if (!access) return '';

  if (access.is_lifetime) {
    return `<span class="badge-lifetime">♾ Lifetime Access</span>`;
  }

  if (access.has_access) {
    return `<span class="badge-active" data-countdown-date="${access.expires_at}">✓ ACTIVE ACCESS • ${formatRemainingTime(access.expires_at)}</span>`;
  }

  if (access.is_expired) {
    return `<span class="badge-expired">🔒 ACCESS EXPIRED</span>`;
  }

  return '';
}
