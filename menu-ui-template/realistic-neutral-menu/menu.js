const STORAGE_KEY = "realistic-medieval-settings-v1";

const defaults = {
  activeTab: "ton",
  values: {
    master: 70,
    music: 40,
    effects: 80,
    brightness: 60,
    contrast: 50,
    gamma: 45,
    cameraSpeed: 55,
    scrollSpeed: 45,
    resolution: "1920 x 1080",
    fullscreen: true,
    vsync: true,
    shadows: "Hoch",
    textures: "Hoch",
    viewDistance: "Hoch",
    edgePan: true,
    blood: false,
    tutorials: true
  },
  keybinds: {
    select: "LEERTASTE",
    moveAttack: "RMT",
    special: "Q",
    stop: "S",
    hold: "H",
    rally: "M",
    building: "B",
    units: "U",
    allUnits: "STRG + A",
    groups: "1 - 0",
    quickSave: "F5",
    quickLoad: "F9",
    pause: "P"
  }
};

const tabs = [
  { id: "ton", label: "Ton", icon: "ton", tone: "red" },
  { id: "bild", label: "Bild", icon: "bild", tone: "green" },
  { id: "steuerung", label: "Steuerung", icon: "steuerung", tone: "blue" },
  { id: "spiel", label: "Spiel", icon: "spiel", tone: "brown" }
];

const content = {
  ton: {
    left: [
      {
        title: "Ton",
        rows: [
          { type: "slider", key: "master", label: "Gesamtlautstaerke", suffix: "%" },
          { type: "slider", key: "music", label: "Musiklautstaerke", suffix: "%" },
          { type: "slider", key: "effects", label: "Effektlautstaerke", suffix: "%" }
        ]
      }
    ],
    right: [
      {
        title: "Kurzbefehle",
        rows: [
          { type: "key", key: "pause", label: "Pausieren" },
          { type: "key", key: "quickSave", label: "Schnellspeichern" },
          { type: "key", key: "quickLoad", label: "Schnellladen" }
        ]
      }
    ]
  },
  bild: {
    left: [
      {
        title: "Bild",
        rows: [
          { type: "slider", key: "brightness", label: "Helligkeit", suffix: "%" },
          { type: "slider", key: "contrast", label: "Kontrast", suffix: "%" },
          { type: "slider", key: "gamma", label: "Gamma", suffix: "%" },
          { type: "select", key: "resolution", label: "Aufloesung", options: ["1280 x 720", "1600 x 900", "1920 x 1080", "2560 x 1440"] },
          { type: "toggle", key: "fullscreen", label: "Vollbild" },
          { type: "toggle", key: "vsync", label: "VSync" }
        ]
      }
    ],
    right: [
      {
        title: "Qualitaet",
        rows: [
          { type: "select", key: "shadows", label: "Schattenqualitaet", options: ["Niedrig", "Mittel", "Hoch"] },
          { type: "select", key: "textures", label: "Texturqualitaet", options: ["Niedrig", "Mittel", "Hoch"] },
          { type: "select", key: "viewDistance", label: "Sichtweite", options: ["Niedrig", "Mittel", "Hoch"] }
        ]
      }
    ]
  },
  steuerung: {
    left: [
      {
        title: "Kamera",
        rows: [
          { type: "slider", key: "cameraSpeed", label: "Kameratempo", suffix: "%" },
          { type: "slider", key: "scrollSpeed", label: "Scrolltempo", suffix: "%" },
          { type: "toggle", key: "edgePan", label: "Randscrollen" }
        ]
      }
    ],
    right: [
      {
        title: "Steuerung",
        rows: [
          { type: "key", key: "select", label: "Auswaehlen" },
          { type: "key", key: "moveAttack", label: "Bewegen / Angriff" },
          { type: "key", key: "special", label: "Spezialfaehigkeit" },
          { type: "key", key: "stop", label: "Stopp" },
          { type: "key", key: "hold", label: "Halten / Positionieren" },
          { type: "key", key: "rally", label: "Sammelpunkte anzeigen" },
          { type: "key", key: "building", label: "Gebaeude auswaehlen" },
          { type: "key", key: "units", label: "Einheiten auswaehlen" },
          { type: "key", key: "allUnits", label: "Alle Einheiten auswaehlen" },
          { type: "key", key: "groups", label: "Kontrollgruppen 1-0" }
        ]
      }
    ]
  },
  spiel: {
    left: [
      {
        title: "Spiel",
        rows: [
          { type: "toggle", key: "blood", label: "Blut darstellen" },
          { type: "toggle", key: "tutorials", label: "Hinweise anzeigen" }
        ]
      }
    ],
    right: [
      {
        title: "Kommandos",
        rows: [
          { type: "key", key: "pause", label: "Pausieren" },
          { type: "key", key: "quickSave", label: "Schnellspeichern" },
          { type: "key", key: "quickLoad", label: "Schnellladen" }
        ]
      }
    ]
  }
};

let state = loadState();
let listeningKey = null;

const overlay = document.querySelector("#settingsOverlay");
const openButton = document.querySelector("#openMenu");
const tabsMount = document.querySelector("#settingsTabs");
const leftColumn = document.querySelector("#leftColumn");
const rightColumn = document.querySelector("#rightColumn");
const resetButton = document.querySelector("#resetButton");
const backButton = document.querySelector("#backButton");

renderTabs();
renderActiveTab();
syncRangeFills();

openButton.addEventListener("click", () => setMenuVisible(true));
backButton.addEventListener("click", () => setMenuVisible(false));
resetButton.addEventListener("click", resetCurrentTab);

document.addEventListener("keydown", (event) => {
  if (listeningKey) {
    handleKeybindInput(event);
    return;
  }

  if (event.key === "Escape") {
    setMenuVisible(overlay.classList.contains("is-hidden"));
  }
});

window.addEventListener("resize", syncRangeFills);

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return mergeState(defaults, stored || {});
  } catch {
    return structuredClone(defaults);
  }
}

function mergeState(base, patch) {
  return {
    activeTab: patch.activeTab || base.activeTab,
    values: { ...base.values, ...(patch.values || {}) },
    keybinds: { ...base.keybinds, ...(patch.keybinds || {}) }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderTabs() {
  tabsMount.innerHTML = tabs.map((tab) => `
    <button class="tab-button" type="button" data-tab="${tab.id}" data-tone="${tab.tone}">
      <span class="tab-icon tab-icon-${tab.icon}" aria-hidden="true"></span>
      <span class="tab-label">${tab.label}</span>
    </button>
  `).join("");

  tabsMount.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      listeningKey = null;
      saveState();
      renderActiveTab();
    });
  });
}

function renderActiveTab() {
  tabsMount.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === state.activeTab);
  });

  const activeContent = content[state.activeTab];
  leftColumn.innerHTML = renderSections(activeContent.left);
  rightColumn.innerHTML = renderSections(activeContent.right);
  bindControls();
  syncRangeFills();
}

function renderSections(sections) {
  return sections.map((section) => `
    <article class="settings-section">
      <h2 class="section-title"><span>${section.title}</span></h2>
      ${section.rows.map(renderRow).join("")}
    </article>
  `).join("");
}

function renderRow(row) {
  if (row.type === "key") {
    return `
      <div class="keybind-row">
        <span class="row-label">${row.label}</span>
        <button class="keybind-button" type="button" data-keybind="${row.key}">${state.keybinds[row.key]}</button>
      </div>
    `;
  }

  return `
    <div class="setting-row">
      <span class="row-label">${row.label}</span>
      <span class="control-cluster">${renderControl(row)}</span>
      <span class="value-label" data-value="${row.key}">${renderValue(row)}</span>
    </div>
  `;
}

function renderControl(row) {
  if (row.type === "slider") {
    return `<input type="range" min="0" max="100" value="${state.values[row.key]}" data-control="${row.key}" data-suffix="${row.suffix || ""}">`;
  }

  if (row.type === "select") {
    const options = row.options.map((option) => {
      const selected = state.values[row.key] === option ? "selected" : "";
      return `<option ${selected}>${option}</option>`;
    }).join("");
    return `<select class="select-control" data-control="${row.key}">${options}</select>`;
  }

  if (row.type === "toggle") {
    const pressed = state.values[row.key] ? "true" : "false";
    return `<button class="toggle-button" type="button" aria-label="${row.label}" aria-pressed="${pressed}" data-control="${row.key}"></button>`;
  }

  return "";
}

function renderValue(row) {
  if (row.type === "slider") return `${state.values[row.key]}${row.suffix || ""}`;
  if (row.type === "select") return "";
  if (row.type === "toggle") return "";
  return "";
}

function bindControls() {
  document.querySelectorAll("[data-control]").forEach((control) => {
    const key = control.dataset.control;

    if (control.type === "range") {
      control.addEventListener("input", () => {
        state.values[key] = Number(control.value);
        const valueLabel = document.querySelector(`[data-value="${key}"]`);
        if (valueLabel) valueLabel.textContent = `${control.value}${control.dataset.suffix || ""}`;
        updateRangeFill(control);
        saveState();
      });
      return;
    }

    if (control.tagName === "SELECT") {
      control.addEventListener("change", () => {
        state.values[key] = control.value;
        saveState();
      });
      return;
    }

    control.addEventListener("click", () => {
      state.values[key] = !state.values[key];
      control.setAttribute("aria-pressed", String(state.values[key]));
      saveState();
    });
  });

  document.querySelectorAll("[data-keybind]").forEach((button) => {
    button.addEventListener("click", () => {
      if (listeningKey) clearListeningButton();
      listeningKey = button.dataset.keybind;
      button.classList.add("is-listening");
      button.textContent = "...";
      button.focus();
    });
  });
}

function handleKeybindInput(event) {
  event.preventDefault();

  if (event.key === "Escape") {
    clearListeningButton();
    listeningKey = null;
    return;
  }

  const label = formatKey(event);
  state.keybinds[listeningKey] = label;
  saveState();
  listeningKey = null;
  renderActiveTab();
}

function formatKey(event) {
  const parts = [];
  if (event.ctrlKey) parts.push("STRG");
  if (event.altKey) parts.push("ALT");
  if (event.shiftKey) parts.push("SHIFT");

  const keyMap = {
    " ": "LEERTASTE",
    ArrowUp: "PFEIL OBEN",
    ArrowDown: "PFEIL UNTEN",
    ArrowLeft: "PFEIL LINKS",
    ArrowRight: "PFEIL RECHTS"
  };

  const key = keyMap[event.key] || event.key.toUpperCase();
  if (!["CONTROL", "ALT", "SHIFT"].includes(key)) parts.push(key);
  return parts.join(" + ");
}

function clearListeningButton() {
  const button = document.querySelector(".keybind-button.is-listening");
  if (!button) return;
  button.classList.remove("is-listening");
  button.textContent = state.keybinds[button.dataset.keybind];
}

function resetCurrentTab() {
  const activeContent = content[state.activeTab];
  const rows = [...activeContent.left, ...activeContent.right].flatMap((section) => section.rows);

  rows.forEach((row) => {
    if (row.type === "key") state.keybinds[row.key] = defaults.keybinds[row.key];
    else state.values[row.key] = defaults.values[row.key];
  });

  saveState();
  renderActiveTab();
}

function setMenuVisible(isVisible) {
  overlay.classList.toggle("is-hidden", !isVisible);
  openButton.hidden = isVisible;
  if (isVisible) {
    const activeTab = tabsMount.querySelector(".tab-button.is-active");
    if (activeTab) activeTab.focus();
  } else {
    openButton.focus();
  }
}

function syncRangeFills() {
  document.querySelectorAll('input[type="range"]').forEach(updateRangeFill);
}

function updateRangeFill(range) {
  const min = Number(range.min || 0);
  const max = Number(range.max || 100);
  const value = Number(range.value);
  const percentage = ((value - min) / (max - min)) * 100;
  range.style.setProperty("--fill", `${percentage}%`);
}
