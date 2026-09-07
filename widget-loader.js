(() => {
  'use strict';

  if (window.__TENALYTICS_SUPPORT_WIDGET_LOADED__) return;
  window.__TENALYTICS_SUPPORT_WIDGET_LOADED__ = true;

  const currentScript = document.currentScript;
  const globalConfig = window.TenAlyticsSupportConfig || {};

  const scriptSrc = currentScript?.src || '';
  const inferredBase = scriptSrc ? new URL('.', scriptSrc).href.replace(/\/$/, '') : '';
  const widgetUrl = globalConfig.widgetUrl || currentScript?.dataset.widgetUrl || `${inferredBase}/index.html`;
  const apiUrl = globalConfig.apiUrl || currentScript?.dataset.apiUrl || '';
  const accent = globalConfig.accentColor || currentScript?.dataset.accentColor || '#DA6727';
  const position = globalConfig.position || currentScript?.dataset.position || 'right';
  const zIndex = Number(globalConfig.zIndex || 2147483000);

  const root = document.createElement('div');
  root.id = 'tenalytics-support-widget-root';

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open 10Alytics Support');
  launcher.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 18.5 4 20l.7-3.2A7.7 7.7 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8-4 8-9 8c-2 0-3.9-.6-5.5-1.5Z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="8" cy="12" r="1" fill="white"/><circle cx="12" cy="12" r="1" fill="white"/><circle cx="16" cy="12" r="1" fill="white"/>
    </svg>`;

  Object.assign(launcher.style, {
    position: 'fixed',
    bottom: '22px',
    [position === 'left' ? 'left' : 'right']: '22px',
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    border: 'none',
    background: accent,
    boxShadow: '0 12px 30px rgba(0,0,0,.24)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    zIndex: String(zIndex),
    padding: '0'
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '92px',
    [position === 'left' ? 'left' : 'right']: '20px',
    width: 'min(380px, calc(100vw - 24px))',
    height: 'min(640px, calc(100dvh - 120px))',
    borderRadius: '18px',
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 22px 60px rgba(18,24,40,.26)',
    zIndex: String(zIndex),
    opacity: '0',
    visibility: 'hidden',
    transform: 'translateY(12px) scale(.985)',
    transformOrigin: position === 'left' ? 'bottom left' : 'bottom right',
    transition: 'opacity .18s ease, transform .18s ease, visibility .18s ease'
  });

  const iframe = document.createElement('iframe');
  const src = new URL(widgetUrl, window.location.href);
  if (apiUrl) src.searchParams.set('api', apiUrl);
  iframe.src = src.href;
  iframe.title = '10Alytics Support';
  iframe.setAttribute('allow', 'clipboard-write');
  Object.assign(iframe.style, { width: '100%', height: '100%', border: '0', display: 'block', background: '#fff' });
  panel.appendChild(iframe);

  let open = false;
  const setOpen = (value) => {
    open = value;
    panel.style.opacity = value ? '1' : '0';
    panel.style.visibility = value ? 'visible' : 'hidden';
    panel.style.transform = value ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.985)';
    launcher.setAttribute('aria-label', value ? 'Close 10Alytics Support' : 'Open 10Alytics Support');
    launcher.innerHTML = value
      ? '<span style="font-size:28px;line-height:1;color:white;transform:translateY(-1px)">×</span>'
      : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 18.5 4 20l.7-3.2A7.7 7.7 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8-4 8-9 8c-2 0-3.9-.6-5.5-1.5Z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="12" r="1" fill="white"/><circle cx="12" cy="12" r="1" fill="white"/><circle cx="16" cy="12" r="1" fill="white"/></svg>`;
  };

  launcher.addEventListener('click', () => setOpen(!open));

  const mobileQuery = window.matchMedia('(max-width: 520px)');
  const applyMobile = () => {
    if (mobileQuery.matches) {
      Object.assign(panel.style, {
        top: '0', right: '0', bottom: '0', left: '0',
        width: '100vw', height: '100dvh', borderRadius: '0'
      });
      launcher.style.bottom = '18px';
      launcher[position === 'left' ? 'left' : 'right'] = '18px';
    } else {
      panel.style.top = 'auto';
      panel.style.left = position === 'left' ? '20px' : 'auto';
      panel.style.right = position === 'left' ? 'auto' : '20px';
      panel.style.bottom = '92px';
      panel.style.width = 'min(380px, calc(100vw - 24px))';
      panel.style.height = 'min(640px, calc(100dvh - 120px))';
      panel.style.borderRadius = '18px';
    }
  };
  mobileQuery.addEventListener?.('change', applyMobile);
  applyMobile();

  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);

  window.TenAlyticsSupportWidget = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    newConversation: () => {
      setOpen(true);
      iframe.contentWindow?.postMessage({ type: '10A_WIDGET_NEW_CONVERSATION' }, '*');
    }
  };
})();
