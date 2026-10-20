'use strict';

const dialog = document.querySelector('#join-dialog');
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const toast = document.querySelector('.toast');
let serverAddress = '';
let toastTimer;
let dialogOpener;

function notify(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 4500);
}

function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Mở menu');
  navigation.classList.remove('is-open');
}

menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  navigation.classList.toggle('is-open', open);
});

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-link.active')?.classList.remove('active');
    link.classList.add('active');
    closeMenu();
  });
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.header')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});

document.querySelectorAll('[data-join]').forEach((button) => {
  button.addEventListener('click', () => {
    dialogOpener = button;
    closeMenu();
    dialog.showModal();
  });
});
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => dialogOpener?.focus());

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
  document.querySelectorAll('[data-java-connection]').forEach((element) => {
    element.hidden = tab.id !== 'java-tab';
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) { event.preventDefault(); activateTab(next); next.focus(); }
  });
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    if (!serverAddress) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(serverAddress);
      notify('Đã sao chép địa chỉ máy chủ. Hẹn gặp bạn trong game!');
    } catch {
      notify('Không thể sao chép tự động. Bạn có thể chọn địa chỉ và sao chép thủ công.');
    }
  });
});

function setText(selector, value) {
  if (value) document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
}

async function loadSiteConfig() {
  try {
    const response = await fetch('./site.config.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Config unavailable');
    const config = await response.json();
    serverAddress = typeof config.serverAddress === 'string' ? config.serverAddress.trim() : '';
    const edition = typeof config.edition === 'string' ? config.edition.trim() : '';
    const version = typeof config.gameVersion === 'string' ? config.gameVersion.trim() : '';
    setText('[data-server-address]', serverAddress);
    setText('[data-edition]', edition);
    setText('[data-version]', version);
    if (serverAddress) {
      document.querySelectorAll('[data-copy]').forEach((button) => {
        button.disabled = false;
        button.title = 'Sao chép địa chỉ máy chủ';
      });
      setText('[data-connection-notice]', `Địa chỉ: ${serverAddress}. Nền tảng: ${edition || 'đang cập nhật'}. Phiên bản: ${version || 'đang cập nhật'}. Hãy chọn hướng dẫn phù hợp với nền tảng máy chủ hỗ trợ.`);
    }
    if (edition && version) setText('[data-version-answer]', `Máy chủ sử dụng ${edition}, phiên bản ${version}. Hãy chọn phiên bản tương thích trước khi kết nối. Bedrock/PE đang bảo trì, tạm thời chưa thể kết nối.`);
    if (config.discordUrl) {
      const url = new URL(config.discordUrl);
      if (url.protocol === 'https:' && !url.username && !url.password && ['discord.gg', 'discord.com', 'www.discord.com'].includes(url.hostname)) {
        document.querySelectorAll('[data-discord]').forEach((link) => {
          link.href = url.href;
          link.hidden = false;
        });
      }
    }
  } catch {
    // Static content remains usable when public configuration is unavailable.
  }
}

setText('[data-year]', String(new Date().getFullYear()));
loadSiteConfig();


const statusCard = document.querySelector('[data-server-status]');
const statusRefresh = document.querySelector('[data-status-refresh]');
let statusRequestPending = false;

function displayServerState(state, label, note) {
  statusCard.dataset.state = state;
  setText('[data-status-state]', label);
  setText('[data-status-note]', note);
}

async function refreshServerStatus() {
  if (!statusCard || statusRequestPending) return;
  statusRequestPending = true;
  statusRefresh.disabled = true;
  statusCard.setAttribute('aria-busy', 'true');
  displayServerState('checking', 'Đang kiểm tra…', 'Đang kiểm tra kết nối máy chủ.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const address = serverAddress || document.querySelector('[data-status-address]').textContent.trim();
    const response = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}?query=false&timeout=5`, {
      signal: controller.signal, cache: 'no-store', credentials: 'omit'
    });
    if (!response.ok) throw new Error('Status unavailable');
    const data = await response.json();
    if (typeof data.online !== 'boolean') throw new Error('Invalid status response');
    const checkedAt = Number(data.retrieved_at);
    if (!Number.isFinite(checkedAt) || checkedAt <= 0 || Date.now() - checkedAt > 120000 || checkedAt - Date.now() > 60000) throw new Error('Status is out of date');
    if (data.online) {
      const online = data.players?.online;
      const maximum = data.players?.max;
      const validCount = (value) => Number.isInteger(value) && value >= 0;
      const players = validCount(online) ? (validCount(maximum) ? `${online} / ${maximum}` : String(online)) : '—';
      setText('[data-status-players]', players);
      setText('[data-status-version]', typeof data.version?.name_clean === 'string' ? data.version.name_clean : 'Đang cập nhật');
      displayServerState('online', 'Online', 'Máy chủ đang phản hồi. Bạn có thể mở Minecraft Java để tham gia.');
    } else {
      setText('[data-status-players]', '—');
      setText('[data-status-version]', '—');
      displayServerState('offline', 'Offline', 'Máy chủ hiện chưa phản hồi. Bạn có thể kiểm tra lại sau.');
    }
    const updated = new Date(checkedAt);
    const time = document.querySelector('[data-status-checked]');
    time.dateTime = updated.toISOString();
    time.textContent = `Kết quả lúc ${updated.toLocaleTimeString('vi-VN')}.`;
    setText('[data-status-address]', address);
  } catch {
    setText('[data-status-players]', '—');
    setText('[data-status-version]', '—');
    displayServerState('unknown', 'Chưa xác định', 'Chưa kiểm tra được kết nối. Hãy bấm “Kiểm tra lại” sau ít phút.');
    const time = document.querySelector('[data-status-checked]');
    time.removeAttribute('datetime');
    time.textContent = 'Chưa nhận được kết quả mới.';
  } finally {
    window.clearTimeout(timeout);
    statusRequestPending = false;
    statusRefresh.disabled = false;
    statusCard.setAttribute('aria-busy', 'false');
  }
}

if (statusCard) {
  statusRefresh.addEventListener('click', refreshServerStatus);
  refreshServerStatus();
  window.setInterval(() => {
    if (!document.hidden) refreshServerStatus();
  }, 60000);
}
