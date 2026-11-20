// المصحف الشريف — تطبيق صفحة واحدة
// النص: api.alquran.cloud (رسم عثماني) — الصوت: cdn.mp3quran.net
const API = 'https://api.alquran.cloud/v1';
const CDN = 'https://cdn.mp3quran.net/audio/';

const RECITERS = [
  { id: 'yasser-dosari/r1',        name: 'ياسر الدوسري' },
  { id: 'maher-muaiqly/r1',        name: 'ماهر المعيقلي' },
  { id: 'mishary-alafasy/r1',      name: 'مشاري راشد العفاسي' },
  { id: 'muhammad-minshawi/r1',    name: 'محمد صديق المنشاوي' },
  { id: 'abdulbasit-abdulsamad/r3', name: 'عبد الباسط عبد الصمد' },
  { id: 'mahmoud-husary/r1',       name: 'محمود خليل الحصري' },
  { id: 'abdulrahman-sudais/r1',   name: 'عبد الرحمن السديس' },
  { id: 'saud-shuraim/r1',         name: 'سعود الشريم' },
];

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('quran.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('quran.' + k, JSON.stringify(v)); } catch {} },
};

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
// إزالة التشكيل والحروف الخاصة لتسهيل البحث
const normalize = (s) => s
  .replace(/[ً-ٰٟۖ-ۭـ﻿]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/^سوره\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase();

let surahs = [];
let current = 0;          // رقم السورة المعروضة
let playingSurah = 0;     // رقم السورة التي يتم تشغيلها
const cache = new Map();

const audio = $('audio');

/* ---------- الثيم وحجم الخط ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  store.set('theme', t);
}
function applyFont(px) {
  px = Math.max(20, Math.min(52, px));
  document.documentElement.style.setProperty('--quran-size', px + 'px');
  store.set('font', px);
}
applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyFont(store.get('font', 30));
$('themeBtn').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('fontUp').onclick = () => applyFont(store.get('font', 30) + 2);
$('fontDown').onclick = () => applyFont(store.get('font', 30) - 2);

/* ---------- القائمة الجانبية ---------- */
function toggleSidebar(open) {
  $('sidebar').classList.toggle('open', open);
  $('backdrop').classList.toggle('show', open);
}
$('menuBtn').onclick = () => toggleSidebar(true);
$('backdrop').onclick = () => toggleSidebar(false);

function renderList(filter = '') {
  const q = normalize(filter);
  const list = surahs.filter((s) =>
    !q || String(s.number) === q.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) ||
    normalize(s.name).includes(q) || s.englishName.toLowerCase().includes(q));
  $('surahList').innerHTML = list.length ? list.map((s) => `
    <li class="item${s.number === current ? ' active' : ''}" data-n="${s.number}">
      <div class="num"><span>${toArabicDigits(s.number)}</span></div>
      <div class="s-text">
        <div class="s-name">${s.name.replace(/^سُورَةُ\s*/, '')}</div>
        <div class="s-info">${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${toArabicDigits(s.numberOfAyahs)} آية</div>
      </div>
    </li>`).join('') : '<li class="muted center">لا توجد نتائج</li>';
}
$('surahList').onclick = (e) => {
  const li = e.target.closest('li.item');
  if (!li) return;
  openSurah(+li.dataset.n);
  toggleSidebar(false);
};
$('searchBox').oninput = (e) => renderList(e.target.value);
$('searchBox').onkeydown = (e) => {
  if (e.key === 'Enter') { const first = $('surahList').querySelector('li.item'); if (first) first.click(); }
};

/* ---------- عرض السورة ---------- */
async function fetchSurah(n) {
  if (cache.has(n)) return cache.get(n);
  const res = await fetch(`${API}/surah/${n}/quran-uthmani`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = (await res.json()).data;
  cache.set(n, data);
  return data;
}

async function openSurah(n, ayah = 0) {
  n = Math.max(1, Math.min(114, n));
  current = n;
  store.set('surah', n);
  if (!ayah) store.set('ayah', 0);
  renderList($('searchBox').value);
  $('surahList').querySelector('li.active')?.scrollIntoView({ block: 'nearest' });
  $('mushaf').innerHTML = '<p class="muted center">جاري التحميل…</p>';
  try {
    const s = await fetchSurah(n);
    if (current !== n) return;
    const showBasmala = n !== 1 && n !== 9;
    $('basmala').hidden = !showBasmala;
    $('surahHeader').hidden = false;
    $('surahTitle').textContent = s.name;
    $('surahMeta').textContent =
      `${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · عدد آياتها ${toArabicDigits(s.numberOfAyahs)} · الجزء ${toArabicDigits(s.ayahs[0].juz)} · صفحة ${toArabicDigits(s.ayahs[0].page)}`;
    $('jumpInput').max = s.numberOfAyahs;
    $('jumpInput').value = '';
    $('mushaf').innerHTML = s.ayahs.map((a) => {
      let text = a.text.replace(/^﻿/, '');
      // البسملة مدمجة في أول آية لكل سورة (عدا الفاتحة والتوبة) — نعرضها منفصلة
      if (showBasmala && a.numberInSurah === 1) text = text.split(' ').slice(4).join(' ');
      return `<span class="ayah" id="a${a.numberInSurah}" data-a="${a.numberInSurah}">${text}</span> <span class="marker">${toArabicDigits(a.numberInSurah)}</span> `;
    }).join('');
    $('prevSurahBtn').disabled = n === 1;
    $('nextSurahBtn').disabled = n === 114;
    document.title = `${s.name} — المصحف الشريف`;
    if (ayah) goToAyah(ayah); else $('reader').scrollTop = 0;
  } catch (err) {
    $('mushaf').innerHTML = `<p class="center">تعذّر تحميل السورة. تأكد من الاتصال بالإنترنت.<br><button onclick="openSurah(${n})">إعادة المحاولة</button></p>`;
  }
}

function goToAyah(a) {
  const el = $('a' + a);
  if (!el) return;
  document.querySelectorAll('.ayah.hl').forEach((x) => x.classList.remove('hl'));
  el.classList.add('hl');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  store.set('ayah', a);
}
$('jumpForm').onsubmit = (e) => { e.preventDefault(); goToAyah(+$('jumpInput').value); };
$('mushaf').onclick = (e) => { const a = e.target.closest('.ayah'); if (a) goToAyah(+a.dataset.a); };
$('prevSurahBtn').onclick = () => openSurah(current - 1);
$('nextSurahBtn').onclick = () => openSurah(current + 1);

/* ---------- المشغل ---------- */
$('reciterSelect').innerHTML = RECITERS.map((r) => `<option value="${r.id}">${r.name}</option>`).join('');
$('reciterSelect').value = store.get('reciter', RECITERS[0].id);
if (!$('reciterSelect').value) $('reciterSelect').value = RECITERS[0].id;
$('autoNext').checked = store.get('autoNext', true);
$('autoNext').onchange = (e) => store.set('autoNext', e.target.checked);

const pad3 = (n) => String(n).padStart(3, '0');
const fmt = (t) => {
  if (!isFinite(t)) return '0:00';
  t = Math.floor(t);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
};
const reciterName = () => RECITERS.find((r) => r.id === $('reciterSelect').value).name;
const surahName = (n) => (surahs[n - 1]?.name || 'سورة ' + n).replace(/^سُورَةُ\s*/, 'سورة ');

function playSurah(n) {
  n = Math.max(1, Math.min(114, n));
  playingSurah = n;
  audio.src = `${CDN}${$('reciterSelect').value}/${pad3(n)}.mp3`;
  $('nowPlaying').textContent = `جاري التحميل: ${surahName(n)} — ${reciterName()}`;
  audio.play().catch(() => {});
  if (n !== current) openSurah(n);
}

$('playBtn').onclick = () => {
  if (!audio.src || playingSurah !== current && audio.paused) return playSurah(current);
  audio.paused ? audio.play() : audio.pause();
};
$('nextBtn').onclick = () => playSurah((playingSurah || current) + 1);
$('prevBtn').onclick = () => playSurah((playingSurah || current) - 1);
$('reciterSelect').onchange = (e) => {
  store.set('reciter', e.target.value);
  if (audio.src) {
    const wasPlaying = !audio.paused;
    playSurah(playingSurah || current);
    if (!wasPlaying) audio.pause();
  }
};

audio.onplay = () => { $('playBtn').textContent = '⏸'; $('playBtn').setAttribute('aria-label', 'إيقاف مؤقت'); };
audio.onpause = () => { $('playBtn').textContent = '▶'; $('playBtn').setAttribute('aria-label', 'تشغيل'); };
audio.onplaying = () => { $('nowPlaying').textContent = `${surahName(playingSurah)} — ${reciterName()}`; };
audio.onwaiting = () => { $('nowPlaying').textContent = `جاري التحميل… ${surahName(playingSurah)}`; };
audio.onerror = () => { if (audio.src) $('nowPlaying').textContent = 'تعذّر تشغيل الصوت — تحقق من الاتصال'; };
audio.onloadedmetadata = () => { $('seek').max = Math.floor(audio.duration) || 0; $('durTime').textContent = fmt(audio.duration); };
let seeking = false;
audio.ontimeupdate = () => {
  if (!seeking) $('seek').value = Math.floor(audio.currentTime);
  $('curTime').textContent = fmt(audio.currentTime);
};
$('seek').oninput = () => { seeking = true; $('curTime').textContent = fmt(+$('seek').value); };
$('seek').onchange = () => { audio.currentTime = +$('seek').value; seeking = false; };
audio.onended = () => { if ($('autoNext').checked && playingSurah < 114) playSurah(playingSurah + 1); };

// اختصارات لوحة المفاتيح
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); $('playBtn').click(); }
});

/* ---------- تثبيت كتطبيق ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ---------- البداية ---------- */
(async function init() {
  const startSurah = store.get('surah', 1);
  const startAyah = store.get('ayah', 0);
  openSurah(startSurah, startAyah);
  try {
    const res = await fetch(`${API}/surah`);
    surahs = (await res.json()).data;
    renderList();
  } catch {
    $('surahList').innerHTML = '<li class="muted center">تعذّر تحميل قائمة السور</li>';
  }
})();
