// ========== TRACKS ==========
const TRACKS = [
  { title: "Neon Horizon", artist: "Aurora Wave", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Liquid Dreams", artist: "Pulse Theory", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Crystal Echo", artist: "Nova Flux", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { title: "Midnight Bloom", artist: "Lunar Tide", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { title: "Solar Drift", artist: "Astral Kin", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
];

// ========== DOM ==========
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const bar = document.getElementById('bar');
const barFill = document.getElementById('barFill');
const curTime = document.getElementById('cur');
const durTime = document.getElementById('dur');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const playlistEl = document.getElementById('playlist');
const sheetSub = document.getElementById('sheetSub');
const viz = document.getElementById('viz');
const vol = document.getElementById('vol');
const volVal = document.getElementById('volVal');
const volBtn = document.getElementById('volBtn');
const artFrame = document.getElementById('artFrame');
const listBtn = document.getElementById('listBtn');
const closeSheet = document.getElementById('closeSheet');
const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('backdrop');
const toast = document.getElementById('toast');

// ========== STATE ==========
let index = 0;
let playing = false;
let shuffle = false;
let repeat = 'none'; // none | all | one
let audioCtx, analyser, source, dataArray;

// ========== INIT ==========
function init() {
  renderPlaylist();
  loadTrack(0);
  buildVisualizer();
  bindEvents();
  updateVolumeUI();
}

// ========== LOAD TRACK ==========
function loadTrack(i) {
  index = (i + TRACKS.length) % TRACKS.length;
  const t = TRACKS[index];
  audio.src = t.src;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;
  updatePlaylistUI();
  updateMediaSession(t);
}

// ========== PLAY / PAUSE ==========
function togglePlay() {
  if (!audioCtx) initAudio();
  if (playing) {
    audio.pause();
  } else {
    audio.play().catch(() => {});
  }
}

audio.addEventListener('play', () => {
  playing = true;
  playBtn.classList.add('playing');
  artFrame.classList.add('playing');
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
});
audio.addEventListener('pause', () => {
  playing = false;
  playBtn.classList.remove('playing');
  artFrame.classList.remove('playing');
});

// ========== NEXT / PREV ==========
function nextTrack() {
  if (shuffle) {
    let r;
    do { r = Math.floor(Math.random() * TRACKS.length); } while (r === index && TRACKS.length > 1);
    loadTrack(r);
  } else {
    loadTrack(index + 1);
  }
  if (playing) audio.play();
}
function prevTrack() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (shuffle) {
    let r;
    do { r = Math.floor(Math.random() * TRACKS.length); } while (r === index && TRACKS.length > 1);
    loadTrack(r);
  } else {
    loadTrack(index - 1);
  }
  if (playing) audio.play();
}

// ========== REPEAT & SHUFFLE ==========
function toggleShuffle() {
  shuffle = !shuffle;
  shuffleBtn.setAttribute('aria-pressed', shuffle);
  showToast(shuffle ? 'Shuffle on' : 'Shuffle off');
}
function toggleRepeat() {
  if (repeat === 'none') { repeat = 'all'; repeatBtn.setAttribute('aria-pressed', 'true'); repeatBtn.classList.remove('repeat-one'); showToast('Repeat all'); }
  else if (repeat === 'all') { repeat = 'one'; repeatBtn.classList.add('repeat-one'); showToast('Repeat one'); }
  else { repeat = 'none'; repeatBtn.setAttribute('aria-pressed', 'false'); repeatBtn.classList.remove('repeat-one'); showToast('Repeat off'); }
}

// ========== AUDIO EVENTS ==========
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  barFill.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', Math.round(pct));
  curTime.textContent = fmt(audio.currentTime);
});
audio.addEventListener('loadedmetadata', () => {
  durTime.textContent = fmt(audio.duration);
});
audio.addEventListener('ended', () => {
  if (repeat === 'one') { audio.currentTime = 0; audio.play(); }
  else if (repeat === 'all') nextTrack();
  else if (index < TRACKS.length - 1) nextTrack();
  else { playing = false; playBtn.classList.remove('playing'); artFrame.classList.remove('playing'); }
});

// ========== SEEK ==========
function seek(e) {
  const rect = bar.getBoundingClientRect();
  let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  x = Math.max(0, Math.min(x, rect.width));
  const pct = x / rect.width;
  if (audio.duration) audio.currentTime = pct * audio.duration;
}
bar.addEventListener('click', seek);
bar.addEventListener('touchstart', (e) => { seek(e); }, { passive: true });
bar.addEventListener('touchmove', (e) => { seek(e); }, { passive: true });

// ========== VOLUME ==========
vol.addEventListener('input', () => {
  audio.volume = vol.value / 100;
  volVal.textContent = vol.value;
  updateVolumeUI();
});
volBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  updateVolumeUI();
});
function updateVolumeUI() {
  const muted = audio.muted || audio.volume === 0;
  volBtn.classList.toggle('muted', muted);
  volBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
}

// ========== PLAYLIST ==========
function renderPlaylist() {
  playlistEl.innerHTML = TRACKS.map((t, i) => `
    <li class="track" data-index="${i}">
      <span class="track-num">${i + 1}</span>
      <div class="track-info">
        <div class="track-name">${t.title}</div>
        <div class="track-artist">${t.artist}</div>
      </div>
      <div class="track-eq"><span></span><span></span><span></span></div>
    </li>
  `).join('');
  sheetSub.textContent = TRACKS.length + ' tracks';
  playlistEl.querySelectorAll('.track').forEach(el => {
    el.addEventListener('click', () => {
      const i = +el.dataset.index;
      loadTrack(i);
      audio.play();
      closeSheetFn();
    });
  });
}
function updatePlaylistUI() {
  playlistEl.querySelectorAll('.track').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

// ========== VISUALIZER ==========
function buildVisualizer() {
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    viz.appendChild(b);
  }
}
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  animateViz();
}
function animateViz() {
  requestAnimationFrame(animateViz);
  if (!analyser || !playing) return;
  analyser.getByteFrequencyData(dataArray);
  const bars = viz.querySelectorAll('.bar');
  bars.forEach((b, i) => {
    const v = dataArray[i % dataArray.length] / 255;
    b.style.height = Math.max(4, v * 48) + 'px';
  });
}

// ========== SHEET ==========
function openSheetFn() {
  sheet.classList.add('open');
  backdrop.classList.add('show');
}
function closeSheetFn() {
  sheet.classList.remove('open');
  backdrop.classList.remove('show');
}
listBtn.addEventListener('click', openSheetFn);
closeSheet.addEventListener('click', closeSheetFn);
backdrop.addEventListener('click', closeSheetFn);

// ========== TOAST ==========
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

// ========== MEDIA SESSION ==========
function updateMediaSession(t) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: 'Liquid Beats'
    });
    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  }
}

// ========== UTILS ==========
function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return m + ':' + sec;
}

// ========== BIND ==========
function bindEvents() {
  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', nextTrack);
  prevBtn.addEventListener('click', prevTrack);
  shuffleBtn.addEventListener('click', toggleShuffle);
  repeatBtn.addEventListener('click', toggleRepeat);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); break;
      case 'ArrowLeft': if (audio.duration) audio.currentTime = Math.max(0, audio.currentTime - 5); break;
      case 'ArrowUp': e.preventDefault(); vol.value = Math.min(100, +vol.value + 5); vol.dispatchEvent(new Event('input')); break;
      case 'ArrowDown': e.preventDefault(); vol.value = Math.max(0, +vol.value - 5); vol.dispatchEvent(new Event('input')); break;
    }
  });

  audio.volume = vol.value / 100;
}

// ========== START ==========
init();