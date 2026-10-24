// Focus Shield: locks distracting apps and pays out unlock time for finished work.
// Prototype only. A web app cannot lock other apps, so the permission prompt, the app list,
// screen time and the lock screen are simulated here to show the intended experience.
// A native build would use Screen Time (FamilyControls) on iOS and UsageStats on Android.

const EARN_TASK = 10, EARN_STEP = 2;
const APPS = [
  // [id, name, category, colour, minutes used today, locked by default]
  ['tiktok', 'TikTok', 'Social', '#111827', 48, true],
  ['instagram', 'Instagram', 'Social', '#d62976', 32, true],
  ['youtube', 'YouTube', 'Video', '#e11d24', 25, true],
  ['facebook', 'Facebook', 'Social', '#1877f2', 14, true],
  ['x', 'X', 'Social', '#334155', 9, true],
  ['mlbb', 'Mobile Legends', 'Game', '#7c3aed', 36, true],
  ['roblox', 'Roblox', 'Game', '#475569', 0, false],
  ['spotify', 'Spotify', 'Music', '#1db954', 21, false],
];
const OTHER_MINUTES = 72; // Messages, maps, browser and everything else today.
const PAST_WEEK = [312, 338, 296, 301, 287, 274]; // Screen time on the six days before today, in minutes.

export function createShield({ state, save, render, toast, celebrate, filoSvg, setMood, esc, icon, openModal, closeModal, go, $ }) {
  const fresh = () => ({ setup: false, on: true, credits: 0, earnedToday: 0, unlock: null, apps: APPS.map(([id, name, category, color, used, locked]) => ({ id, name, category, color, used, locked })) });
  state.shield ??= fresh();
  const shield = state.shield;
  const layer = $('#shield-layer'), picker = $('#shield-picker');
  let ticker = null;

  const appById = id => shield.apps.find(item => item.id === id);
  const lockedApps = () => shield.apps.filter(item => item.locked);
  const tile = (item, size = '') => `<span class="app-tile ${size}" style="--app:${item.color}" aria-hidden="true">${esc(item.name[0])}</span>`;
  const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  const hm = minutes => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, '0')}m` : `${Math.round(minutes)}m`);
  const liveUsed = item => item.used + (shield.unlock?.appId === item.id ? (Date.now() - shield.unlock.startedAt) / 60000 : 0);
  const distracting = () => shield.apps.filter(item => item.locked).reduce((sum, item) => sum + liveUsed(item), 0);
  const screenToday = () => shield.apps.reduce((sum, item) => sum + liveUsed(item), 0) + OTHER_MINUTES;
  const isOpen = id => shield.unlock?.appId === id && shield.unlock.endsAt > Date.now();

  /* ---------- Earning and spending ---------- */
  function earn(minutes) {
    if (!shield.setup || !shield.on) return '';
    shield.credits += minutes;
    shield.earnedToday += minutes;
    save();
    return ` · +${minutes} min unlock time`;
  }
  function unlock(item, minutes) {
    relock(false);
    shield.credits -= minutes;
    shield.unlock = { appId: item.id, startedAt: Date.now(), endsAt: Date.now() + minutes * 60000 };
    save();
    startTicker();
  }
  // Locking early refunds the whole minutes that were not used.
  function relock(announce = true, early = false) {
    const open = shield.unlock;
    if (!open) return;
    const item = appById(open.appId), now = Math.min(Date.now(), open.endsAt);
    item.used += (now - open.startedAt) / 60000;
    if (early) shield.credits += Math.floor((open.endsAt - Date.now()) / 60000);
    shield.unlock = null;
    save();
    if (announce) toast(early ? `${item.name} locked. Unused minutes went back to your credit.` : `${item.name} is locked again. Ready for one more thing?`);
  }
  function startTicker() {
    clearInterval(ticker);
    ticker = setInterval(() => {
      if (!shield.unlock) return clearInterval(ticker);
      if (shield.unlock.endsAt <= Date.now()) {
        relock(true);
        clearInterval(ticker);
        return render();
      }
      for (const element of document.querySelectorAll('[data-unlock-left]')) element.textContent = mmss(shield.unlock.endsAt - Date.now());
    }, 1000);
  }
  if (shield.unlock) startTicker();

  /* ---------- Header chip and the card on Now ---------- */
  const chip = () => (shield.setup && shield.on
    ? `<button type="button" class="shield-chip" data-view-go="shield" aria-label="Focus Shield: ${shield.credits} minutes of unlock time">${icon('lock')}<span>${shield.credits}m</span></button>`
    : '');
  function nowCard() {
    if (!shield.setup) return `
      <button type="button" class="shield-row" data-view-go="shield">${icon('lock')}<span><strong>Lock distracting apps</strong><small>Earn time back by finishing tasks</small></span>${icon('arrow')}</button>`;
    if (!shield.on) return '';
    const open = shield.unlock && appById(shield.unlock.appId);
    return `
      <button type="button" class="shield-row ${open ? 'is-open' : ''}" data-view-go="shield">${icon(open ? 'unlock' : 'lock')}
        <span>${open ? `<strong>${esc(open.name)} unlocked · <b data-unlock-left>${mmss(shield.unlock.endsAt - Date.now())}</b></strong><small>Enjoy it, guilt-free</small>`
          : `<strong>${lockedApps().length} apps locked · ${shield.credits} min credit</strong><small>Finish this one to earn +${EARN_TASK} min</small>`}</span>${icon('arrow')}</button>`;
  }

  /* ---------- The Shield page ---------- */
  function renderView(sheet) {
    if (!shield.setup) {
      sheet.innerHTML = `
        <section class="shield-intro">
          <div class="shield-intro-filo">${filoSvg('Filo guarding your focus')}</div>
          <h1>Focus Shield</h1>
          <p>Lock the apps that pull you away. Finish a task and Filo gives you time back to use them, guilt-free.</p>
          <ul class="shield-how">
            <li>${icon('lock')}<span><strong>Lock</strong> social media and games</span></li>
            <li>${icon('check')}<span><strong>Earn</strong> +${EARN_TASK} min for each task, +${EARN_STEP} for each step</span></li>
            <li>${icon('unlock')}<span><strong>Unlock</strong> an app for a few minutes when you want a break</span></li>
          </ul>
          <button type="button" class="primary" data-shield="setup">${icon('lock')} Set up Focus Shield</button>
          <p class="hint">Calls, messages, maps and emergency apps are never locked.</p>
        </section>`;
      return setMood(sheet, 'idle');
    }
    const today = screenToday(), average = PAST_WEEK.reduce((a, b) => a + b, 0) / PAST_WEEK.length, diff = Math.round(today - average);
    const week = [...PAST_WEEK, today], peak = Math.max(...week);
    const days = Array.from({ length: 7 }, (_, index) => new Date(Date.now() - (6 - index) * 864e5).toLocaleDateString([], { weekday: 'narrow' }));
    const open = shield.unlock && appById(shield.unlock.appId);
    const rows = [...shield.apps].sort((a, b) => b.locked - a.locked || liveUsed(b) - liveUsed(a));
    sheet.innerHTML = `
      <p class="greeting">Focus Shield. <span>Locks that work for you.</span></p>
      <section class="credit-card">
        <div class="credit-main"><p class="credit-label">${icon('bolt')} Unlock time</p><p class="credit-value"><strong>${shield.credits}</strong> min</p>
          <p class="credit-note">+${EARN_TASK} min per task · +${EARN_STEP} per step${shield.earnedToday ? ` · earned ${shield.earnedToday} today` : ''}</p></div>
        <div class="credit-filo">${filoSvg('Filo')}</div>
      </section>
      ${open ? `
        <section class="unlocked-banner" role="status">${tile(open)}<div><p><strong>${esc(open.name)} is unlocked</strong></p><p><b data-unlock-left>${mmss(shield.unlock.endsAt - Date.now())}</b> left</p></div>
          <button type="button" class="soft-button" data-shield="relock">${icon('lock')} Lock now</button></section>` : ''}
      <section class="card screen-time">
        <div class="screen-head"><div><p class="screen-label">Screen time today</p><p class="screen-value">${hm(today)}</p></div>
          <p class="screen-diff ${diff <= 0 ? 'is-down' : ''}">${diff <= 0 ? `${hm(-diff)} less` : `${hm(diff)} more`} than your daily average</p></div>
        <div class="week-bars" aria-label="Screen time for the last 7 days">${week.map((minutes, index) => `<span class="${index === 6 ? 'is-today' : ''}"><i style="height:${Math.round((minutes / peak) * 100)}%"></i><small>${days[index]}</small></span>`).join('')}</div>
        <div class="screen-split"><span><i class="dot is-locked"></i>Locked apps ${hm(distracting())}</span><span><i class="dot"></i>Everything else ${hm(today - distracting())}</span></div>
      </section>
      <h2 class="section-title">${icon('lock')} Apps <span>Tap one to try opening it</span></h2>
      <ul class="app-list">${rows.map(item => {
        const used = liveUsed(item);
        return `
        <li><button type="button" class="app-row" data-app="${item.id}">${tile(item)}
          <span class="app-info"><strong>${esc(item.name)}</strong><small>${esc(item.category)} · ${hm(used)} today</small><span class="app-bar"><i style="width:${Math.min(100, (used / 60) * 100)}%"></i></span></span>
          <span class="app-state ${isOpen(item.id) ? 'is-open' : item.locked ? 'is-locked' : ''}">${isOpen(item.id) ? `${icon('unlock')} Open` : item.locked ? `${icon('lock')} Locked` : 'Allowed'}</span>
        </button></li>`;
      }).join('')}</ul>
      <section class="card settings">
        <label class="setting"><span>Focus Shield<small>Locks the apps above until you’ve earned time</small></span><input type="checkbox" data-shield-toggle ${shield.on ? 'checked' : ''} /></label>
        <button type="button" class="setting setting-button" data-shield="edit"><span>Choose apps to lock<small>${lockedApps().length} locked</small></span>${icon('arrow')}</button>
      </section>
      <p class="footnote">Calls, messages, maps and emergency apps are never locked.<br /><button type="button" class="text-button" data-shield="reset">Reset Focus Shield demo</button></p>`;
    setMood(sheet, open ? 'happy' : 'idle');
  }

  /* ---------- Full-screen layers: permission prompt and the lock screen ---------- */
  function showLayer(html, kind) {
    $('#toast').hidden = true;
    layer.innerHTML = html;
    layer.className = `shield-layer is-${kind}`;
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('is-open'));
    setMood(layer, kind === 'blocked' ? 'idle' : 'happy');
  }
  function hideLayer() {
    layer.classList.remove('is-open');
    setTimeout(() => { layer.hidden = true; layer.innerHTML = ''; }, 220);
  }
  function askPermission() {
    showLayer(`
      <div class="ios-alert" role="alertdialog" aria-labelledby="permission-title">
        <div class="ios-alert-body">
          <p class="ios-alert-icon">${icon('lock')}</p>
          <h2 id="permission-title">“Scaffold” would like to access Screen Time</h2>
          <p>This lets Scaffold see how long you use apps and lock the ones you choose. Your activity stays on this phone.</p>
        </div>
        <div class="ios-alert-actions"><button type="button" data-shield="deny">Don’t Allow</button><button type="button" data-shield="allow"><strong>Continue</strong></button></div>
      </div>`, 'permission');
  }
  function blockScreen(item) {
    const credits = shield.credits;
    showLayer(`
      <div class="blocked">
        <p class="blocked-kicker">${icon('lock')} Focus Shield</p>
        <div class="blocked-tile">${tile(item, 'is-big')}<span class="blocked-lock">${icon('lock')}</span></div>
        <h2>${esc(item.name)} is resting</h2>
        <p class="blocked-used">You’ve used it ${hm(liveUsed(item))} today.</p>
        <div class="blocked-filo"><div class="blocked-filo-art">${filoSvg('Filo')}</div><p class="bubble">${credits >= 5 ? `You’ve earned ${credits} minutes. Take a break, guilt-free.` : `Let’s do one small thing first. It unlocks ${EARN_TASK} minutes.`}</p></div>
        <div class="blocked-actions">
          ${credits >= 5
            ? `${[5, 10, 15].filter(minutes => minutes <= credits).map((minutes, index) => `<button type="button" class="${index === 0 ? 'primary' : 'blocked-pill'}" data-spend="${minutes}" data-app="${item.id}">${icon('unlock')} Unlock ${minutes} min</button>`).join('')}`
            : `<button type="button" class="primary" data-shield="earn">${icon('play')} Show me my one thing</button>
               <p class="blocked-credit">${credits ? `${credits} min saved · 5 min needed` : 'No unlock time yet'}</p>`}
          <button type="button" class="blocked-quiet" data-shield="close">Back to Scaffold</button>
        </div>
      </div>`, 'blocked');
  }

  /* ---------- App picker ---------- */
  function openPicker() {
    picker.querySelector('.picker-list').innerHTML = shield.apps.map(item => `
      <li><label class="picker-row">${tile(item)}<span><strong>${esc(item.name)}</strong><small>${esc(item.category)} · ${hm(item.used)} today</small></span><input type="checkbox" data-pick="${item.id}" ${item.locked ? 'checked' : ''} /></label></li>`).join('');
    countPicked();
    openModal(picker);
  }
  function countPicked() {
    const count = picker.querySelectorAll('[data-pick]:checked').length;
    picker.querySelector('.picker-save').textContent = count ? `Lock ${count} app${count === 1 ? '' : 's'}` : 'Lock nothing for now';
  }
  picker.addEventListener('change', countPicked);
  picker.querySelector('.picker-save').addEventListener('click', () => {
    const first = !shield.setup;
    for (const box of picker.querySelectorAll('[data-pick]')) appById(box.dataset.pick).locked = box.checked;
    shield.setup = true;
    shield.on = true;
    save();
    closeModal(picker);
    go('shield');
    if (first) {
      celebrate(true);
      toast(`Shield is up. ${lockedApps().length} apps locked. Finish a task to earn ${EARN_TASK} min.`);
    } else toast('Locked apps updated');
  });

  /* ---------- Clicks ---------- */
  function handle(event) {
    const spend = event.target.closest('[data-spend]');
    if (spend) {
      const item = appById(spend.dataset.app), minutes = Number(spend.dataset.spend);
      unlock(item, minutes);
      hideLayer();
      render();
      celebrate(false);
      return toast(`${item.name} unlocked for ${minutes} min. Enjoy, guilt-free.`), true;
    }
    const row = event.target.closest('[data-app]');
    if (row && !event.target.closest('.shield-layer')) {
      const item = appById(row.dataset.app);
      if (!shield.on || !item.locked) return toast(`${item.name} isn’t locked. Opening it is up to you.`), true;
      if (isOpen(item.id)) return toast(`${item.name} is open · ${mmss(shield.unlock.endsAt - Date.now())} left`), true;
      blockScreen(item);
      return true;
    }
    const control = event.target.closest('[data-shield]');
    if (!control) return false;
    switch (control.dataset.shield) {
      case 'setup': askPermission(); break;
      case 'deny': hideLayer(); toast('No problem. You can turn it on any time.'); break;
      case 'allow': hideLayer(); setTimeout(openPicker, 240); break;
      case 'edit': openPicker(); break;
      case 'relock': relock(true, true); render(); break;
      case 'close': hideLayer(); break;
      case 'earn': hideLayer(); go('now'); toast(`Finish this one and Filo unlocks ${EARN_TASK} min.`); break;
      case 'reset':
        relock(false);
        state.shield = Object.assign(shield, fresh());
        save();
        render();
        toast('Focus Shield reset for the demo');
        break;
    }
    return true;
  }
  function toggle(event) {
    if (!event.target.matches('[data-shield-toggle]')) return false;
    shield.on = event.target.checked;
    if (!shield.on) relock(false);
    save();
    render();
    toast(shield.on ? 'Focus Shield is on' : 'Focus Shield is off. Everything is unlocked.');
    return true;
  }

  return { chip, nowCard, renderView, handle, toggle, earn, EARN_TASK, EARN_STEP };
}
