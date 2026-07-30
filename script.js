/**
 * Paste your Google Apps Script Web App URL here after deploying.
 * See google-apps-script.gs for the script to paste in Apps Script.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjwlmW9lVvJI6jYpVUbOrpT6Z2M2ZvoTCiv1ANlZ7cxKPGzqiyftsk-Rx3Mqjic1elmg/exec';

/** This form is Claude-only — tool and submission source are fixed. */
const FIXED_TOOL = 'Claude';
const FORM_SOURCE = 'Claude user form';

const nameInput = document.getElementById('userName');
const costInput = document.getElementById('cost');
const emailInput = document.getElementById('email');
const currSelect = document.getElementById('currency');
const popupOverlay = document.getElementById('successPopup');
const state = { plan: null, usage: null };

document.querySelectorAll('#planChips .chip').forEach((c) => {
  const selectPlan = () => {
    document.querySelectorAll('#planChips .chip').forEach((el) => {
      el.classList.remove('active');
      el.setAttribute('aria-checked', 'false');
    });
    c.classList.add('active');
    c.setAttribute('aria-checked', 'true');
    state.plan = c.dataset.v;
    document.querySelector('.section[data-field="plan"]')?.classList.remove('invalid');
    if (state.plan === 'Free' && !costInput.value.trim()) {
      costInput.value = '0';
    }
    updateProgress();
  };
  c.addEventListener('click', selectPlan);
  c.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPlan();
    }
  });
});

document.querySelectorAll('#usageModes .usage-card').forEach((c) => {
  c.addEventListener('click', () => {
    document.querySelectorAll('#usageModes .usage-card').forEach((el) => {
      el.classList.remove('active');
      el.setAttribute('aria-checked', 'false');
    });
    c.classList.add('active');
    c.setAttribute('aria-checked', 'true');
    state.usage = c.dataset.v;
    document.querySelector('.section[data-field="usage"]')?.classList.remove('invalid');
    updateProgress();
  });
});

document.querySelectorAll('#workChips .chip').forEach((c) => {
  c.addEventListener('click', () => {
    c.classList.toggle('active');
    updateProgress();
  });
});

document.querySelectorAll('#benefitChips .chip').forEach((c) => {
  c.addEventListener('click', () => {
    c.classList.toggle('active');
    updateProgress();
  });
});

currSelect.addEventListener('change', updateProgress);
nameInput.addEventListener('input', updateProgress);
costInput.addEventListener('input', () => {
  sanitizeCostInput();
  updateProgress();
});
costInput.addEventListener('keydown', (e) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
});
costInput.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text') || '';
  const cleaned = sanitizeCostValue(text);
  const start = costInput.selectionStart ?? costInput.value.length;
  const end = costInput.selectionEnd ?? costInput.value.length;
  costInput.value = sanitizeCostValue(
    costInput.value.slice(0, start) + cleaned + costInput.value.slice(end)
  );
  updateProgress();
});
emailInput.addEventListener('input', updateProgress);

function sanitizeCostValue(value) {
  let cleaned = String(value || '').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  const parts = cleaned.split('.');
  if (parts[1] !== undefined) {
    cleaned = parts[0] + '.' + parts[1].slice(0, 2);
  }
  return cleaned;
}

function sanitizeCostInput() {
  const next = sanitizeCostValue(costInput.value);
  if (costInput.value !== next) costInput.value = next;
}

function isValidCost(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value || '').trim()) && parseFloat(value) >= 0;
}

function fieldsCompleted() {
  let n = 0;
  if (nameInput.value.trim().length >= 2) n++;
  if (state.plan) n++;
  if (state.usage) n++;
  if (
    isValidCost(costInput.value) &&
    emailInput.value &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)
  ) {
    n++;
  }
  if (document.querySelectorAll('#workChips .chip.active').length > 0) n++;
  if (document.querySelectorAll('#benefitChips .chip.active').length > 0) n++;
  return n;
}

function updateProgress() {
  const n = fieldsCompleted();
  const total = 6;
  const pct = (n / total) * 100;

  document.getElementById('progressLabel').textContent = String(n);

  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  const hint = document.getElementById('progressHint');
  const rail = document.getElementById('growthRail');

  if (bar) bar.setAttribute('aria-valuenow', String(n));
  if (fill) fill.style.width = `${pct}%`;

  document.querySelectorAll('.growth-step').forEach((step, i) => {
    const stepNum = i + 1;
    step.style.left = `${(stepNum / total) * 100}%`;
    step.classList.toggle('done', stepNum <= n);
    step.classList.toggle('current', stepNum === n + 1 && n < total);
  });

  const hints = [
    'Start with your name — about a minute.',
    'Select your Claude plan next.',
    'How do you use Claude — chat, Claude Code, or both?',
    'Add your monthly cost & purchase email.',
    'Tell us what you use Claude for.',
    'Almost there — pick the benefits you get.',
    'All set — hit submit when you are ready.'
  ];
  if (hint) hint.textContent = hints[n] || hints[0];
  if (rail) rail.classList.toggle('is-complete', n === total);

  const sections = document.querySelectorAll('.section');
  sections[0].classList.toggle('done', nameInput.value.trim().length >= 2);
  sections[1].classList.toggle('done', !!state.plan);
  sections[2].classList.toggle('done', !!state.usage);
  sections[3].classList.toggle(
    'done',
    isValidCost(costInput.value) &&
      emailInput.value &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)
  );
  sections[4].classList.toggle(
    'done',
    document.querySelectorAll('#workChips .chip.active').length > 0
  );
  sections[5].classList.toggle(
    'done',
    document.querySelectorAll('#benefitChips .chip.active').length > 0
  );
}
updateProgress();

(function initStickyProgress() {
  const rail = document.getElementById('growthRail');
  const anchor = document.getElementById('growthAnchor');
  if (!rail || !anchor || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      rail.classList.toggle('is-stuck', !entry.isIntersecting);
    },
    { threshold: 0, rootMargin: '-12px 0px 0px 0px' }
  );
  observer.observe(anchor);
})();

function resetForm() {
  document.getElementById('entryForm').reset();
  document.querySelectorAll('.chip').forEach((c) => {
    c.classList.remove('active');
    if (c.getAttribute('role') === 'radio') c.setAttribute('aria-checked', 'false');
  });
  document.querySelectorAll('#usageModes .usage-card').forEach((c) => {
    c.classList.remove('active');
    c.setAttribute('aria-checked', 'false');
  });
  document.getElementById('nameField').classList.remove('invalid');
  document.getElementById('costField').classList.remove('invalid');
  document.getElementById('emailField').classList.remove('invalid');
  document.querySelector('.section[data-field="plan"]')?.classList.remove('invalid');
  document.querySelector('.section[data-field="usage"]')?.classList.remove('invalid');
  state.plan = null;
  state.usage = null;
  updateProgress();
}

function showSuccessPopup() {
  popupOverlay.classList.add('open');
  popupOverlay.setAttribute('aria-hidden', 'false');
}

function hideSuccessPopup() {
  popupOverlay.classList.remove('open');
  popupOverlay.setAttribute('aria-hidden', 'true');
}

document.getElementById('popupCloseBtn').addEventListener('click', hideSuccessPopup);
popupOverlay.addEventListener('click', (e) => {
  if (e.target === popupOverlay) hideSuccessPopup();
});

function buildPayload(entry) {
  return {
    submissionId: entry.submissionId,
    timestamp: new Date(entry.ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    name: entry.name,
    tool: entry.tool,
    plan: entry.plan,
    usage: entry.usage,
    cost: String(entry.cost),
    currency: entry.currency,
    email: entry.email,
    work: entry.work.join(', '),
    benefit: entry.benefit.join(', '),
    notes: entry.notes || '',
    source: entry.source
  };
}

/** Incognito-friendly: plain GET. Ad blockers / 3P cookie blocks often still allow this. */
function saveViaGet(payload) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      qs.set(key, value == null ? '' : String(value));
    });
    const url = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?') + qs.toString();

    // Prefer fetch GET (works from http/https hosts)
    fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', keepalive: true })
      .then(() => resolve({ method: 'get-fetch' }))
      .catch(() => {
        // Image ping fallback (works even when fetch is restricted)
        const img = new Image();
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          ok ? resolve({ method: 'get-img' }) : reject(new Error('GET save failed'));
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(true); // Apps Script often returns JSON → image "error", but request hit doGet
        img.src = url;
        setTimeout(() => finish(true), 2500);
      });
  });
}

/**
 * Classic form urlencoded POST into a hidden iframe.
 * Ignores the first about:blank load; waits for the real navigation (or timeout).
 */
function saveViaFormPost(payload) {
  return new Promise((resolve) => {
    const frameName = 'gas_frame_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const iframe = document.createElement('iframe');
    iframe.name = frameName;
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = frameName;
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value == null ? '' : String(value);
      form.appendChild(input);
    });
    document.body.appendChild(form);

    let loads = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve({ method: 'form-post' });
      setTimeout(() => {
        form.remove();
        iframe.remove();
      }, 500);
    };

    iframe.addEventListener('load', () => {
      loads += 1;
      // load #1 = about:blank → submit now
      if (loads === 1) {
        try {
          form.submit();
        } catch (err) {
          finish();
        }
        return;
      }
      // load #2+ = Apps Script response (or blocked redirect) — POST already ran
      finish();
    });

    // If iframe never fires load (some Incognito builds), force-submit then resolve
    setTimeout(() => {
      if (loads === 0) {
        try {
          form.submit();
        } catch (_) {}
      }
    }, 300);

    // Incognito often blocks the googleusercontent redirect so load #2 never comes —
    // doPost still ran on the first navigation. Resolve after wait.
    setTimeout(finish, 3500);
  });
}

/** Extra path: JSON text/plain (no preflight). */
function saveViaJsonPost(payload) {
  return fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    keepalive: true,
    cache: 'no-store'
  }).then(() => ({ method: 'json-post' }));
}

async function saveToGoogleSheet(entry) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_GOOGLE')) {
    throw new Error('Google Apps Script URL is not configured in script.js');
  }

  const payload = buildPayload(entry);

  // Fire multiple transports in parallel. Server dedupes via submissionId.
  // GET is the one that most often works in Chrome Incognito.
  const results = await Promise.allSettled([
    saveViaGet(payload),
    saveViaFormPost(payload),
    saveViaJsonPost(payload)
  ]);

  const anyOk = results.some((r) => r.status === 'fulfilled');
  if (!anyOk) {
    throw new Error('Timed out saving to Google Sheet');
  }

  // Let Apps Script finish writing before UI resets
  await new Promise((r) => setTimeout(r, 800));
  return { result: 'success' };
}

document.getElementById('entryForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();

  let valid = true;
  document.getElementById('nameField').classList.remove('invalid');
  document.getElementById('costField').classList.remove('invalid');
  document.getElementById('emailField').classList.remove('invalid');
  document.querySelector('.section[data-field="plan"]')?.classList.remove('invalid');
  document.querySelector('.section[data-field="usage"]')?.classList.remove('invalid');

  const userName = nameInput.value.trim();
  if (userName.length < 2) {
    document.getElementById('nameField').classList.add('invalid');
    valid = false;
  }
  if (!state.plan) {
    document.querySelector('.section[data-field="plan"]')?.classList.add('invalid');
    valid = false;
  }
  if (!state.usage) {
    document.querySelector('.section[data-field="usage"]')?.classList.add('invalid');
    valid = false;
  }
  if (!isValidCost(costInput.value)) {
    document.getElementById('costField').classList.add('invalid');
    valid = false;
  }
  if (!emailInput.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
    document.getElementById('emailField').classList.add('invalid');
    valid = false;
  }

  const work = [...document.querySelectorAll('#workChips .chip.active')].map((c) => c.dataset.v);
  const workOther = document.getElementById('workOther').value.trim();
  const benefit = [...document.querySelectorAll('#benefitChips .chip.active')].map(
    (c) => c.dataset.v
  );
  if (work.length === 0 || benefit.length === 0) {
    valid = false;
    alert('Please select at least one Claude use case and one benefit.');
  }
  if (!valid) return;

  const entry = {
    ts: Date.now(),
    submissionId:
      'claude_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10),
    name: userName,
    tool: FIXED_TOOL,
    plan: state.plan,
    usage: state.usage,
    cost: parseFloat(costInput.value).toFixed(2),
    currency: currSelect.value,
    email: emailInput.value,
    work: workOther ? [...work, `Other: ${workOther}`] : work,
    benefit,
    notes: document.getElementById('notes').value.trim(),
    source: FORM_SOURCE
  };

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  const originalLabel = btn.innerHTML;
  btn.innerHTML = 'Saving…';

  try {
    await saveToGoogleSheet(entry);
    resetForm();
    showSuccessPopup();
  } catch (err) {
    console.error(err);
    alert(
      err.message.includes('not configured')
        ? 'Google Sheet URL set nahi hui hai. script.js me GOOGLE_SCRIPT_URL paste karein.'
        : 'Data save nahi ho paya. Phir se try karein ya network check karein.'
    );
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  }
});
