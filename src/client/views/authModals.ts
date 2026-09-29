import { api } from '../api';
import { closeModal, openModal, showToast } from '../ui';

export function openLoginModal(onSuccess?: () => void) {
  openModal(`
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#9B83FF] flex items-center justify-center font-bold text-sm text-white">UP</div>
          <h3 class="text-lg font-bold text-white">Sign In to UPI-Pay</h3>
        </div>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <!-- Quick Demo Account Presets -->
      <div class="p-3 rounded-xl bg-[#0D101A] border border-[#252B3B] space-y-2">
        <div class="text-[11px] font-bold text-[#8992A7] uppercase tracking-wider">Instant Demo Account Presets</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <button id="btn-preset-alex" class="p-2 rounded-lg bg-[#151925] hover:bg-[#1E2333] border border-[#252B3B] text-left transition-colors">
            <div class="font-bold text-white">Alex Rivera (Customer)</div>
            <div class="text-[10px] text-[#35D49A]">65 Credits • Active Course</div>
          </button>
          <button id="btn-preset-admin" class="p-2 rounded-lg bg-[#151925] hover:bg-[#1E2333] border border-[#252B3B] text-left transition-colors">
            <div class="font-bold text-[#FF5C75]">Administrator</div>
            <div class="text-[10px] text-[#8992A7]">Full Control & Approvals</div>
          </button>
        </div>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-[#8992A7] mb-1 font-semibold">Email Address *</label>
          <input id="login-email-input" type="email" placeholder="name@example.com" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1 font-semibold">Password *</label>
          <input id="login-password-input" type="password" placeholder="••••••••" class="input-field text-xs" />
        </div>

        <button id="btn-do-login" class="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-2">
          Sign In
        </button>

        <div class="text-center pt-2 text-[#8992A7]">
          Don't have an account yet? 
          <button id="btn-go-to-register" class="text-[#7C5CFF] font-bold hover:underline ml-1">Create one</button>
        </div>
      </div>
    </div>
  `);

  const emailEl = document.getElementById('login-email-input') as HTMLInputElement;
  const passEl = document.getElementById('login-password-input') as HTMLInputElement;

  document.getElementById('btn-preset-alex')?.addEventListener('click', () => {
    if (emailEl) emailEl.value = 'alex@upipay.io';
    if (passEl) passEl.value = 'User@123';
  });

  document.getElementById('btn-preset-admin')?.addEventListener('click', () => {
    if (emailEl) emailEl.value = 'admin@upipay.io';
    if (passEl) passEl.value = 'Admin@123';
  });

  document.getElementById('btn-go-to-register')?.addEventListener('click', () => {
    closeModal();
    openRegisterModal(onSuccess);
  });

  document.getElementById('btn-do-login')?.addEventListener('click', async () => {
    const email = emailEl?.value.trim();
    const password = passEl?.value;

    if (!email || !password) {
      showToast('Email and password required', 'error');
      return;
    }

    try {
      const res = await api.login({ email, password });
      closeModal();
      showToast(`Welcome back, @${res.user.username}!`, 'success');
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    }
  });
}

export function openRegisterModal(onSuccess?: () => void) {
  openModal(`
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#9B83FF] flex items-center justify-center font-bold text-sm text-white">UP</div>
          <h3 class="text-lg font-bold text-white">Join UPI-Pay</h3>
        </div>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <div class="p-3 rounded-xl bg-[#35D49A]/10 border border-[#35D49A]/30 text-xs text-[#35D49A] flex items-center gap-2 font-semibold">
        <span>🎁 20 Welcome Credits added to your wallet automatically upon registration!</span>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-[#8992A7] mb-1 font-semibold">Username *</label>
          <input id="reg-username-input" type="text" placeholder="e.g. digital_creator" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1 font-semibold">Email Address *</label>
          <input id="reg-email-input" type="email" placeholder="name@example.com" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1 font-semibold">Password (min 6 characters) *</label>
          <input id="reg-password-input" type="password" placeholder="••••••••" class="input-field text-xs" />
        </div>

        <button id="btn-do-register" class="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-2">
          Create Account & Claim 20 Credits
        </button>

        <div class="text-center pt-2 text-[#8992A7]">
          Already have an account? 
          <button id="btn-go-to-login" class="text-[#7C5CFF] font-bold hover:underline ml-1">Sign in</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('btn-go-to-login')?.addEventListener('click', () => {
    closeModal();
    openLoginModal(onSuccess);
  });

  document.getElementById('btn-do-register')?.addEventListener('click', async () => {
    const username = (document.getElementById('reg-username-input') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('reg-email-input') as HTMLInputElement)?.value.trim();
    const password = (document.getElementById('reg-password-input') as HTMLInputElement)?.value;

    if (!username || !email || !password) {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      const res = await api.register({ email, username, password });
      closeModal();
      showToast('Account created! 20 Welcome Credits added to your wallet.', 'success');
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    }
  });
}
