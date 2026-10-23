'use strict';
const config = window.PW7A_CONFIG;
function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
document.querySelectorAll('[data-link]').forEach(a => { const url = safeUrl(config[a.dataset.link]); if (url) a.href = url; else a.hidden = true; });
document.querySelectorAll('[data-release]').forEach(el => { el.hidden = !config.showRelease; });
for (const key of ['developer', 'translator']) {
  if (config[key]) document.querySelectorAll(`[data-${key}]`).forEach(el => { el.textContent = config[key]; });
}
// お知らせ本文はXの読み込みに依存せず、常にサイト内に残します。
const announcements = document.querySelector('[data-announcements]');
let xWidgetPromise;
function loadXWidget() {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr);
  if (!xWidgetPromise) xWidgetPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    const timeout = setTimeout(() => { script.remove(); reject(new Error('X timeout')); }, 15000);
    script.onload = () => { clearTimeout(timeout); if (window.twttr?.widgets) resolve(window.twttr); else reject(new Error('X unavailable')); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('X unavailable')); };
    document.head.append(script);
  }).catch(error => { xWidgetPromise = undefined; throw error; });
  return xWidgetPromise;
}
(config.announcements || []).forEach(item => {
  if (!announcements) return;
  const copy = item;
  const article = document.createElement('article'); article.className = 'announcement'; article.lang = 'ja';
  if (item.date) { const time = document.createElement('time'); time.dateTime = item.date; time.textContent = item.date.split('-').map(Number).join('.'); article.append(time); }
  const title = document.createElement('h3'); title.textContent = copy.title;
  article.append(title);
  const headlineUrl = safeUrl(item.url || item.tweetUrl);
  if (copy.body) {
    const body = document.createElement('p');
    if (headlineUrl) {
      const link = document.createElement('a'); link.href = headlineUrl; link.textContent = copy.body;
      body.append(link);
    } else body.textContent = copy.body;
    article.append(body);
  }
  if (!copy.body && safeUrl(item.url)) {
    const link = document.createElement('a'); link.href = safeUrl(item.url); link.className = 'text-link';
    link.textContent = '関連ページを見る ↗'; article.append(link);
  }
  const match = /^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)(?:[/?#].*)?$/.exec(item.tweetUrl || '');
  if (match) {
    const link = document.createElement('a'); link.href = item.tweetUrl; link.className = 'text-link';
    link.textContent = 'Xで元の投稿を見る ↗';
    const target = document.createElement('div'); target.className = 'tweet-embed';
    const button = document.createElement('button'); button.className = 'button';
    const label = 'Xの投稿を表示'; button.textContent = label;
    const status = document.createElement('p'); status.className = 'embed-status'; status.setAttribute('role', 'status');
    button.addEventListener('click', async () => {
      button.disabled = true; status.textContent = 'Xから読み込み中…';
      try {
        const x = await loadXWidget();
        const result = await Promise.race([
          x.widgets.createTweet(match[1], target, { theme: 'dark', lang: 'ja', dnt: true, conversation: 'none', align: 'left' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Embed timeout')), 15000))
        ]);
        if (!result) throw new Error('Post unavailable');
        button.remove(); status.textContent = '';
      } catch {
        target.replaceChildren(); button.disabled = false; button.textContent = label;
        status.textContent = '投稿を読み込めませんでした。元の投稿へのリンクをご利用ください。';
      }
    });
    if (!copy.body) article.append(link);
    article.append(target, button, status);
  }
  announcements.append(article);
});
