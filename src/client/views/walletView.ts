import { api } from '../api';
import { closeModal, escapeHtml, openModal, showToast } from '../ui';

export async function renderWallet(container: HTMLElement) {
  container.innerHTML = `
    <div class="py-20 text-center text-[#8992A7]">
      <div class="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      Loading wallet and credits...
    </div>
  `;

  try {
    const [walletRes, txRes] = await Promise.all([
      api.getWallet(),
      api.getTransactions()
    ]);

    const wallet = walletRes.wallet || { balance: 0, currency: 'CREDITS' };
    const stats = walletRes.stats || { total_deposited: 0, total_spent: 0, total_bonus: 0 };
    const transactions = txRes.transactions || [];

    container.innerHTML = `
      <div class="space-y-8 animate-fade-in">
        <!-- Title & Subtitle -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#252B3B] pb-6">
          <div>
            <div class="text-xs font-bold text-[#7C5CFF] uppercase tracking-wider mb-1">Financial Ledger</div>
            <h1 class="text-3xl font-black text-white tracking-tight">Wallet & Credits</h1>
            <p class="text-xs md:text-sm text-[#8992A7] mt-1">Manage digital credits, submit manual top-ups, send gifts, and review transaction ledgers.</p>
          </div>

          <div class="flex items-center gap-3">
            <button id="btn-open-gift" class="btn-secondary text-xs px-4 py-2.5 font-bold">
              <svg class="w-4 h-4 text-[#9B83FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
              Gift Credits
            </button>
            <button id="btn-open-topup" class="btn-primary text-xs px-5 py-2.5 font-bold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Top Up Credits
            </button>
          </div>
        </div>

        <!-- Wallet Balance Card & Analytics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
          <!-- Primary Balance Panel -->
          <div class="card-panel md:col-span-2 p-6 md:p-8 bg-gradient-to-br from-[#10131C] to-[#151925] relative overflow-hidden flex flex-col justify-between">
            <div class="absolute -right-12 -top-12 w-48 h-48 bg-[#7C5CFF]/15 rounded-full blur-2xl pointer-events-none"></div>

            <div class="space-y-1">
              <div class="text-xs font-bold text-[#8992A7] uppercase tracking-wider">Available Balance</div>
              <div class="text-4xl md:text-5xl font-black text-white flex items-baseline gap-2">
                <span id="display-wallet-balance" class="text-[#35D49A]">${wallet.balance}</span>
                <span class="text-sm font-bold text-[#8992A7]">Credits</span>
              </div>
            </div>

            <div class="pt-6 border-t border-[#252B3B] flex items-center justify-between">
              <span class="text-xs text-[#8992A7]">Standard Rate: 1 Credit ≈ 100 PKR / 1 USDT</span>
              <button id="btn-balance-topup-inline" class="text-xs font-bold text-[#9B83FF] hover:underline">
                + Add Funds
              </button>
            </div>
          </div>

          <!-- Total Deposited -->
          <div class="card-panel p-6 flex flex-col justify-between">
            <div>
              <div class="text-xs font-bold text-[#8992A7] uppercase mb-1">Total Deposited</div>
              <div class="text-2xl font-black text-white">${stats.total_deposited} <span class="text-xs text-[#8992A7]">Credits</span></div>
            </div>
            <div class="text-[11px] text-[#35D49A] font-semibold flex items-center gap-1 mt-4">
              <span>↑ Top-up deposits</span>
            </div>
          </div>

          <!-- Total Spent -->
          <div class="card-panel p-6 flex flex-col justify-between">
            <div>
              <div class="text-xs font-bold text-[#8992A7] uppercase mb-1">Total Purchases</div>
              <div class="text-2xl font-black text-white">${stats.total_spent} <span class="text-xs text-[#8992A7]">Credits</span></div>
            </div>
            <div class="text-[11px] text-[#9B83FF] font-semibold flex items-center gap-1 mt-4">
              <span>★ Content unlocked</span>
            </div>
          </div>
        </div>

        <!-- Transactions Ledger Table (Section 54) -->
        <div class="card-panel p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-[#252B3B] pb-4">
            <div>
              <h2 class="text-lg font-bold text-white tracking-tight">Transaction History</h2>
              <p class="text-xs text-[#8992A7]">Immutable server-side accounting logs with balance verification.</p>
            </div>
            <span class="text-xs font-mono text-[#8992A7]">${transactions.length} Records</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#0D101A] text-[#8992A7] uppercase text-[10px] font-bold border-y border-[#252B3B]">
                <tr>
                  <th class="py-3 px-4">Type</th>
                  <th class="py-3 px-4">Description / Reference</th>
                  <th class="py-3 px-4">Amount</th>
                  <th class="py-3 px-4">Balance Before</th>
                  <th class="py-3 px-4">Balance After</th>
                  <th class="py-3 px-4">Date</th>
                  <th class="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#252B3B]">
                ${
                  transactions.length === 0
                    ? `<tr><td colspan="7" class="py-8 text-center text-[#8992A7]">No transactions recorded yet.</td></tr>`
                    : transactions.map((t: any) => {
                    const isPositive = t.amount > 0;
                    return `
                      <tr class="hover:bg-[#151925]/60 transition-colors">
                        <td class="py-3 px-4">
                          <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            t.type === 'TOP_UP'
                              ? 'bg-[#35D49A]/15 text-[#35D49A] border border-[#35D49A]/30'
                              : t.type === 'PURCHASE'
                              ? 'bg-[#7C5CFF]/15 text-[#9B83FF] border border-[#7C5CFF]/30'
                              : t.type === 'BONUS'
                              ? 'bg-[#FFB347]/15 text-[#FFB347] border border-[#FFB347]/30'
                              : 'bg-[#151925] text-white border border-[#252B3B]'
                          }">
                            ${t.type}
                          </span>
                        </td>
                        <td class="py-3 px-4">
                          <div class="font-medium text-white truncate max-w-xs">${escapeHtml(t.description || t.type)}</div>
                          <div class="text-[10px] font-mono text-[#8992A7]">${escapeHtml(t.reference || 'N/A')}</div>
                        </td>
                        <td class="py-3 px-4 font-mono font-bold ${isPositive ? 'text-[#35D49A]' : 'text-[#FF5C75]'}">
                          ${isPositive ? '+' : ''}${t.amount} Credits
                        </td>
                        <td class="py-3 px-4 font-mono text-[#8992A7]">${t.balance_before}</td>
                        <td class="py-3 px-4 font-mono font-bold text-white">${t.balance_after}</td>
                        <td class="py-3 px-4 text-[#8992A7] whitespace-nowrap">
                          ${new Date(t.created_at).toLocaleDateString()} ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td class="py-3 px-4 text-right">
                          <span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#35D49A]">
                            ✓ ${t.status}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-open-topup')?.addEventListener('click', () => openTopupModal());
    document.getElementById('btn-balance-topup-inline')?.addEventListener('click', () => openTopupModal());
    document.getElementById('btn-open-gift')?.addEventListener('click', () => openGiftModal(wallet.balance));
  } catch (err: any) {
    console.error('[Wallet] Error:', err);
    container.innerHTML = `<div class="p-8 text-center text-[#FF5C75]">Please sign in to view wallet.</div>`;
  }
}

// Section 31-35 & 100: Top-up Modal with EasyPaisa, JazzCash, USDT and DEMO Instant Simulator
export function openTopupModal() {
  let activeTab: 'EASYPAISA' | 'JAZZCASH' | 'USDT' | 'SIMULATOR' = 'SIMULATOR';
  let selectedCredits = 50;

  function renderTopupModalContent() {
    openModal(`
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-[#252B3B] pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#35D49A]/20 text-[#35D49A] flex items-center justify-center font-bold">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Top Up Wallet Credits</h3>
              <div class="text-xs text-[#8992A7]">EasyPaisa • JazzCash • USDT • Demo Simulator</div>
            </div>
          </div>
          <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
        </div>

        <!-- Package Selector (Section 32) -->
        <div>
          <label class="block text-xs font-semibold text-[#8992A7] mb-2">Select Credit Package</label>
          <div class="grid grid-cols-4 gap-2">
            ${[20, 50, 100, 200].map((amt) => `
              <button class="btn-topup-pkg py-3 px-2 rounded-xl border text-center transition-all ${
                selectedCredits === amt
                  ? 'bg-[#7C5CFF]/20 border-[#7C5CFF] text-white shadow-md'
                  : 'bg-[#0D101A] border-[#252B3B] text-[#8992A7] hover:text-white'
              }" data-amount="${amt}">
                <div class="text-base font-black">${amt}</div>
                <div class="text-[10px] text-[#8992A7]">Credits</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Method Tabs -->
        <div>
          <label class="block text-xs font-semibold text-[#8992A7] mb-2">Payment Channel</label>
          <div class="grid grid-cols-4 gap-1.5 p-1 bg-[#0D101A] rounded-xl border border-[#252B3B] text-xs">
            <button class="topup-method-tab py-2 rounded-lg font-bold transition-all ${activeTab === 'SIMULATOR' ? 'bg-[#7C5CFF] text-white' : 'text-[#8992A7] hover:text-white'}" data-method="SIMULATOR">
              ⚡ Demo Instant
            </button>
            <button class="topup-method-tab py-2 rounded-lg font-bold transition-all ${activeTab === 'EASYPAISA' ? 'bg-[#7C5CFF] text-white' : 'text-[#8992A7] hover:text-white'}" data-method="EASYPAISA">
              EasyPaisa
            </button>
            <button class="topup-method-tab py-2 rounded-lg font-bold transition-all ${activeTab === 'JAZZCASH' ? 'bg-[#7C5CFF] text-white' : 'text-[#8992A7] hover:text-white'}" data-method="JAZZCASH">
              JazzCash
            </button>
            <button class="topup-method-tab py-2 rounded-lg font-bold transition-all ${activeTab === 'USDT' ? 'bg-[#7C5CFF] text-white' : 'text-[#8992A7] hover:text-white'}" data-method="USDT">
              USDT (Crypto)
            </button>
          </div>
        </div>

        <!-- Method Detail Panel -->
        <div id="method-body-panel" class="p-4 rounded-xl bg-[#0D101A] border border-[#252B3B] space-y-4">
          ${renderMethodPanel(activeTab, selectedCredits)}
        </div>
      </div>
    `);

    // Amount listener
    document.querySelectorAll('.btn-topup-pkg').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedCredits = Number((btn as HTMLElement).dataset.amount);
        renderTopupModalContent();
      });
    });

    // Method listener
    document.querySelectorAll('.topup-method-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeTab = (tab as HTMLElement).dataset.method as any;
        renderTopupModalContent();
      });
    });

    setupMethodPanelHandlers(activeTab, selectedCredits);
  }

  renderTopupModalContent();
}

function renderMethodPanel(method: string, credits: number): string {
  const pkrAmount = credits * 100;

  switch (method) {
    case 'SIMULATOR':
      return `
        <div class="space-y-4 text-xs">
          <div class="p-3 rounded-lg bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#9B83FF] flex items-center gap-2">
            <span class="font-bold">⚡ DEMO SIMULATOR:</span>
            <span>Simulate instant payment verification for testing purchases without real money.</span>
          </div>

          <div class="flex items-center justify-between text-[#8992A7]">
            <span>Package Selected:</span>
            <span class="text-white font-bold text-sm">${credits} Credits</span>
          </div>

          <div class="space-y-2 pt-2">
            <button id="btn-sim-success" class="btn-success w-full py-2.5 text-xs font-bold justify-center">
              ✓ Simulate Successful Instant Top-Up (+${credits} Credits)
            </button>
            <button id="btn-sim-fail" class="w-full py-2 rounded-lg bg-[#151925] border border-[#252B3B] text-[#FF5C75] text-xs font-semibold hover:bg-[#FF5C75]/10 transition-colors">
              ✕ Simulate Failed / Declined Payment
            </button>
          </div>
        </div>
      `;

    case 'EASYPAISA':
      return `
        <div class="space-y-3 text-xs">
          <div class="p-3 rounded-lg bg-[#151925] border border-[#252B3B] space-y-1">
            <div class="font-bold text-white">EasyPaisa Payment Instructions:</div>
            <div class="text-[#8992A7]">1. Send <strong class="text-[#35D49A]">PKR ${pkrAmount}</strong> via EasyPaisa App or USSD *786#.</div>
            <div class="text-[#8992A7]">Account Number: <strong class="text-white">0301-9876543</strong> (Title: <strong class="text-white">UPI-Pay Digital Merchant</strong>)</div>
            <div class="text-[#8992A7]">2. Copy the Transaction ID (TID) from the SMS / receipt and enter below:</div>
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Transaction ID / Reference (TID) *</label>
            <input id="input-topup-ref" type="text" placeholder="e.g. EP-98342187" class="input-field text-xs uppercase" />
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Sender Mobile / Account Name</label>
            <input id="input-topup-sender" type="text" placeholder="e.g. Alex (0300-1122334)" class="input-field text-xs" />
          </div>

          <button id="btn-submit-manual-topup" class="btn-primary w-full py-2.5 text-xs font-bold justify-center">
            Submit Top-Up for Admin Review
          </button>
        </div>
      `;

    case 'JAZZCASH':
      return `
        <div class="space-y-3 text-xs">
          <div class="p-3 rounded-lg bg-[#151925] border border-[#252B3B] space-y-1">
            <div class="font-bold text-white">JazzCash Payment Instructions:</div>
            <div class="text-[#8992A7]">1. Send <strong class="text-[#35D49A]">PKR ${pkrAmount}</strong> via JazzCash Till or Mobile Account.</div>
            <div class="text-[#8992A7]">Till / Mobile: <strong class="text-white">0300-1234567</strong> (Title: <strong class="text-white">UPI-Pay Enterprise</strong>)</div>
            <div class="text-[#8992A7]">2. Enter the confirmation TID below:</div>
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">JazzCash Reference ID (TID) *</label>
            <input id="input-topup-ref" type="text" placeholder="e.g. JC-87439210" class="input-field text-xs uppercase" />
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Sender Mobile / Name</label>
            <input id="input-topup-sender" type="text" placeholder="e.g. 0300-9876543" class="input-field text-xs" />
          </div>

          <button id="btn-submit-manual-topup" class="btn-primary w-full py-2.5 text-xs font-bold justify-center">
            Submit Top-Up for Admin Review
          </button>
        </div>
      `;

    case 'USDT':
    default:
      return `
        <div class="space-y-3 text-xs">
          <div class="p-3 rounded-lg bg-[#151925] border border-[#252B3B] space-y-1">
            <div class="font-bold text-white">USDT Crypto Transfer Instructions:</div>
            <div class="text-[#8992A7]">Transfer exactly <strong class="text-[#35D49A]">${credits} USDT</strong> to the official deposit address below:</div>
            <div class="p-2 bg-[#07090F] rounded border border-[#252B3B] font-mono text-[11px] text-[#9B83FF] break-all select-all">
              TQn9Y2khEsLJW1ChVWFMSMeSTow5KAnsP5
            </div>
            <div class="text-[10px] text-[#8992A7]">Supported Network: <strong class="text-white">TRC20 (Tron)</strong> or BEP20</div>
          </div>

          <div>
            <label class="block text-[#8992A7] mb-1">Transaction Hash / TxID *</label>
            <input id="input-topup-ref" type="text" placeholder="e.g. 0x9fa81729bca6352...71e" class="input-field text-xs font-mono" />
          </div>

          <button id="btn-submit-manual-topup" class="btn-primary w-full py-2.5 text-xs font-bold justify-center">
            Submit USDT Deposit for Verification
          </button>
        </div>
      `;
  }
}

function setupMethodPanelHandlers(method: string, credits: number) {
  // Simulator handlers
  if (method === 'SIMULATOR') {
    document.getElementById('btn-sim-success')?.addEventListener('click', async () => {
      try {
        const res = await api.simulateAutoTopup({ method: 'EASYPAISA', credits, outcome: 'SUCCESS' });
        closeModal();
        showToast(res.message || `${credits} Credits added!`, 'success');
        renderWallet(document.getElementById('app-content')!);
        const creditsCountEl = document.getElementById('header-credits-count');
        if (creditsCountEl) creditsCountEl.innerText = String(res.balance);
      } catch (err: any) {
        showToast(err.message || 'Simulation error', 'error');
      }
    });

    document.getElementById('btn-sim-fail')?.addEventListener('click', async () => {
      try {
        await api.simulateAutoTopup({ method: 'EASYPAISA', credits, outcome: 'FAIL' });
      } catch (err: any) {
        showToast(err.message || 'Payment simulation failed', 'error');
      }
    });
    return;
  }

  // Manual payment submit handler
  document.getElementById('btn-submit-manual-topup')?.addEventListener('click', async () => {
    const ref = (document.getElementById('input-topup-ref') as HTMLInputElement)?.value.trim();
    const sender = (document.getElementById('input-topup-sender') as HTMLInputElement)?.value.trim();

    if (!ref) {
      showToast('Transaction ID / Reference is required.', 'error');
      return;
    }

    try {
      await api.submitManualTopup({
        method,
        credits,
        reference_id: ref,
        sender_info: sender,
        network: method === 'USDT' ? 'TRC20' : null
      });
      closeModal();
      showToast('Top-up submitted! Admin will verify and credit your wallet.', 'success');
      renderWallet(document.getElementById('app-content')!);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit topup', 'error');
    }
  });
}

// Section 49: Gift Credits Modal
function openGiftModal(userBalance: number) {
  openModal(`
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-[#252B3B] pb-3">
        <h3 class="text-lg font-bold text-white">Gift Credits to a Friend</h3>
        <button onclick="closeModal()" class="text-[#8992A7] hover:text-white">✕</button>
      </div>

      <div class="space-y-4 text-xs">
        <div class="flex items-center justify-between text-[#8992A7]">
          <span>Your Current Balance:</span>
          <span class="text-white font-bold">${userBalance} Credits</span>
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Recipient Username or Email *</label>
          <input id="input-gift-recipient" type="text" placeholder="e.g. alex_streamer or alex@upipay.io" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Amount of Credits *</label>
          <input id="input-gift-amount" type="number" min="1" max="${userBalance}" placeholder="e.g. 15" class="input-field text-xs" />
        </div>

        <div>
          <label class="block text-[#8992A7] mb-1">Optional Friendly Note</label>
          <input id="input-gift-note" type="text" placeholder="e.g. Enjoy the AI Masterclass course!" class="input-field text-xs" />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button onclick="closeModal()" class="btn-secondary text-xs px-4 py-2">Cancel</button>
          <button id="btn-submit-gift" class="btn-primary text-xs px-6 py-2 font-bold">
            Send Gift
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('btn-submit-gift')?.addEventListener('click', async () => {
    const recipient = (document.getElementById('input-gift-recipient') as HTMLInputElement)?.value.trim();
    const amount = Number((document.getElementById('input-gift-amount') as HTMLInputElement)?.value);
    const note = (document.getElementById('input-gift-note') as HTMLInputElement)?.value.trim();

    if (!recipient || !amount || amount <= 0) {
      showToast('Recipient and valid amount required.', 'error');
      return;
    }

    if (amount > userBalance) {
      showToast('Insufficient credits in wallet.', 'error');
      return;
    }

    try {
      const res = await api.giftCredits({ recipient, amount, note });
      closeModal();
      showToast(res.message || 'Gift credits sent!', 'success');
      renderWallet(document.getElementById('app-content')!);
    } catch (err: any) {
      showToast(err.message || 'Gift transfer failed', 'error');
    }
  });
}
