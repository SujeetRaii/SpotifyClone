
let currentSong = new Audio();
let currFolder = "";
let songs = [];
let currentIndex = -1; // index of the currently playing song

// -------- Helpers --------
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getCurrentTrackName() {
  return decodeURIComponent(currentSong.src.split("/").pop() || "");
}

function setMainPlayIcon(isPlaying) {
  const btn = document.getElementById("play") || window.play; // support id or global var
  if (!btn) return;
  btn.src = isPlaying ? "img/pause.svg" : "img/play.svg";
}

function setSongInfoText(name) {
  const el = document.querySelector(".songinfo");
  if (el) el.textContent = decodeURIComponent(name || "");
}

function updateSongTimeUI() {
  const el = document.querySelector(".songtime");
  if (!el) return;
  el.textContent = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
}

function updateSeekCircle() {
  const circle = document.querySelector(".circle");
  if (!circle || !currentSong.duration) return;
  circle.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
}

// Toggle which list item is active and set its small icon
function updateListActiveState() {
  const list = document.querySelector(".songList ul");
  if (!list) return;

  const items = Array.from(list.querySelectorAll("li"));
  items.forEach((li, i) => {
    li.classList.toggle("active", i === currentIndex);
    const icon = li.querySelector(".playnow img");
    if (icon) icon.src = (i === currentIndex) ? "img/pause.svg" : "img/play.svg";
  });
}

// -------- Core controls --------
function playMusic(track, index = null) {
  // Resolve index if not provided
  if (index === null) {
    index = songs.indexOf(track);
  }
  currentIndex = index;

  // Use encodeURI to handle spaces/characters in filenames
  currentSong.src = `${currFolder}/${encodeURI(track)}`;
  currentSong.play().catch(() => { /* ignore autoplay rejections */ });

  // UI updates
  setMainPlayIcon(true);
  setSongInfoText(track);
  // If duration is not ready yet, loadedmetadata will refresh the time line
  updateSongTimeUI();
  updateListActiveState();
}

async function getSongs(folder) {
  try {
    currFolder = folder;
    const response = await fetch(`${folder}/info.json`);
    if (!response.ok) throw new Error("info.json missing");

    const data = await response.json();
    songs = data.tracks || [];
    renderSongList();
    // Reset state
    currentIndex = -1;
    setSongInfoText("");
    const st = document.querySelector(".songtime");
    if (st) st.textContent = "00:00 / 00:00";
    setMainPlayIcon(false);
    updateListActiveState();
  } catch (error) {
    console.error(`Error fetching songs for ${folder}:`, error);
    songs = [];
    renderSongList(true);
    currentIndex = -1;
    setMainPlayIcon(false);
    setSongInfoText("");
  }
}

// -------- Rendering --------
function renderSongList(empty = false) {
  const songUL = document.querySelector(".songList ul");
  if (!songUL) return;

  songUL.innerHTML = "";

  if (empty || songs.length === 0) {
    songUL.innerHTML = `<li>No songs available</li>`;
    return;
  }

  songs.forEach((song, i) => {
    songUL.innerHTML += `
      <li data-index="${i}">
        <img class="invert" src="img/music.svg" alt="">
        <div class="info">
          <div>${song}</div>
          <div>Sujeet</div>
        </div>
        <div class="playnow">
          <span>Play Now</span>
          <img class="invert" src="img/play.svg" alt="">
        </div>
      </li>`;
  });

  Array.from(songUL.getElementsByTagName("li")).forEach(li => {
    li.addEventListener("click", () => {
      const idx = Number(li.dataset.index);
      const trackName = songs[idx];
      playMusic(trackName, idx);
    });
  });
}

async function displayAlbums() {
  try {
    const response = await fetch("songs/albums.json");
    if (!response.ok) throw new Error("albums.json missing");

    const albums = await response.json();
    const cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) return;

    cardContainer.innerHTML = "";
    albums.forEach(album => {
      cardContainer.innerHTML += `
        <div data-folder="${album.folder}" class="card p-2">
          <img src="${album.cover}" class="w-full rounded-xl" alt="">
          <h2 class="text-lg">${album.title}</h2>
          <p class="text-sm">${album.description}</p>
        </div>`;
    });

    Array.from(cardContainer.getElementsByClassName("card")).forEach(card => {
      card.addEventListener("click", () => {
        const folder = card.dataset.folder;
        getSongs(`songs/${folder}`);
      });
    });
  } catch (err) {
    console.error("Error loading albums:", err);
  }
}

// -------- Init --------
document.addEventListener("DOMContentLoaded", () => {
  displayAlbums();
});

// -------- Player button handlers --------
const playBtn = document.getElementById("play") || window.play;
if (playBtn) {
  playBtn.addEventListener("click", () => {
    if (!currentSong.src && songs.length && currentIndex === -1) {
      // If nothing has played yet, start from first song
      playMusic(songs[0], 0);
      return;
    }

    if (currentSong.paused) {
      currentSong.play();
      setMainPlayIcon(true);
    } else {
      currentSong.pause();
      setMainPlayIcon(false);
    }
    updateListActiveState();
  });
}

// Previous
const prevBtn = document.getElementById("previous") || window.previous;
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    // If index unknown, derive from src
    if (currentIndex === -1) {
      const name = getCurrentTrackName();
      currentIndex = songs.indexOf(name);
    }
    if (currentIndex > 0) {
      playMusic(songs[currentIndex - 1], currentIndex - 1);
    }
  });
}

// Next
const nextBtn = document.getElementById("next") || window.next;
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (currentIndex === -1) {
      const name = getCurrentTrackName();
      currentIndex = songs.indexOf(name);
    }
    if (currentIndex < songs.length - 1) {
      playMusic(songs[currentIndex + 1], currentIndex + 1);
    }
  });
}

// -------- Audio events --------
// Update time and seek circle while playing
currentSong.addEventListener("timeupdate", () => {
  updateSongTimeUI();
  updateSeekCircle();
});

// Duration ready
currentSong.addEventListener("loadedmetadata", () => {
  const el = document.querySelector(".songtime");
  if (el) el.textContent = `00:00 / ${secondsToMinutesSeconds(currentSong.duration)}`;
});

// Sync icons when playback state changes from outside code
currentSong.addEventListener("play", () => {
  setMainPlayIcon(true);
  updateListActiveState();
});

currentSong.addEventListener("pause", () => {
  setMainPlayIcon(false);
  // Keep list icon paused only if user pressed pause;
  // We won't change active class so user still sees which song is selected.
});

// Auto-play next on end
currentSong.addEventListener("ended", () => {
  if (currentIndex < songs.length - 1) {
    playMusic(songs[currentIndex + 1], currentIndex + 1);
  } else {
    // Reached end: reset play icon
    setMainPlayIcon(false);
  }
});

// -------- Seekbar --------
const seekbar = document.querySelector(".seekbar");
if (seekbar) {
  seekbar.addEventListener("click", e => {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const circle = document.querySelector(".circle");
    if (circle) circle.style.left = (percent * 100) + "%";
    if (currentSong.duration) {
      currentSong.currentTime = currentSong.duration * percent;
    }
  });
}

// -------- Sidebar (hamburger) --------
const hamburger = document.querySelector(".hamburger");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    const left = document.querySelector(".left");
    if (left) left.style.left = "0";
  });
}

const closeBtn = document.querySelector(".close");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    const left = document.querySelector(".left");
    if (left) left.style.left = "-120%";
  });
}

// -------- Volume --------
const rangeInput = document.querySelector(".range input");
if (rangeInput) {
  rangeInput.addEventListener("change", (e) => {
    currentSong.volume = parseInt(e.target.value, 10) / 100;
    const volImg = document.querySelector(".volume>img");
    if (volImg && currentSong.volume > 0) {
      volImg.src = volImg.src.replace("img/mute.svg", "img/volume.svg");
    }
  });
}

const volImg = document.querySelector(".volume>img");
if (volImg) {
  volImg.addEventListener("click", e => {
    if (e.target.src.includes("img/volume.svg")) {
      e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg");
      currentSong.volume = 0;
      if (rangeInput) rangeInput.value = 0;
    } else {
      e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg");
      currentSong.volume = 0.10;
      if (rangeInput) rangeInput.value = 10;
    }
  });
}
