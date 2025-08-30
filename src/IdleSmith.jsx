import React, { useEffect, useMemo, useRef, useState } from "react";

// IdleSmith — a tiny idle/clicker game
// Single-file React component. Uses Tailwind for styling (no imports needed).
// Features: clicking, idle income, upgrades, unlocks, prestige, autosave/offline progress, soft animations.

// Utility helpers
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const fmt = (n) => {
  if (n < 1_000) return n.toFixed(0);
  if (n < 1_000_000) return (n / 1_000).toFixed(2) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n < 1_000_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  return (n / 1_000_000_000_000).toFixed(2) + "T";
};

// Default save
const defaultSave = {
  version: 1,
  gold: 0,
  goldPerClickBase: 1,
  goldPerSecondBase: 0,
  upgrades: {
    hammer: 0, // increases click power
    anvil: 0, // increases idle income
    forge: 0, // multiplies all income
    apprentice: 0, // autoclicker
  },
  prestige: {
    count: 0,
    essence: 0, // permanent multiplier currency
  },
  lastTick: Date.now(),
};

const UPGRADE_DEFS = {
  hammer: {
    name: "Hammer",
    desc: "+1 base gold/click per level",
    baseCost: 10,
    costMult: 1.15,
    effect: (lvl) => lvl * 1,
    icon: "🔨",
  },
  anvil: {
    name: "Anvil",
    desc: "+0.5 base gold/sec per level",
    baseCost: 25,
    costMult: 1.18,
    effect: (lvl) => lvl * 0.5,
    icon: "⚒️",
  },
  forge: {
    name: "Forge",
    desc: "+10% global income per level",
    baseCost: 100,
    costMult: 1.25,
    effect: (lvl) => 1 + lvl * 0.1,
    icon: "🔥",
  },
  apprentice: {
    name: "Apprentice",
    desc: "Auto-clicks 1x/sec per level",
    baseCost: 75,
    costMult: 1.22,
    effect: (lvl) => lvl, // clicks per second
    icon: "🧑‍🏭",
  },
};

function upgradeCost(key, lvl) {
  const def = UPGRADE_DEFS[key];
  return Math.floor(def.baseCost * Math.pow(def.costMult, lvl));
}

function computeDerived(save) {
  const { upgrades, goldPerClickBase, goldPerSecondBase, prestige } = save;
  const hammer = UPGRADE_DEFS.hammer.effect(upgrades.hammer);
  const anvil = UPGRADE_DEFS.anvil.effect(upgrades.anvil);
  const forgeMult = UPGRADE_DEFS.forge.effect(upgrades.forge);
  const essenceMult = 1 + prestige.essence * 0.02; // +2% per essence
  const globalMult = forgeMult * essenceMult;

  const click = (goldPerClickBase + hammer) * globalMult;
  const gps = (goldPerSecondBase + anvil) * globalMult;
  const autoClicksPerSec = UPGRADE_DEFS.apprentice.effect(upgrades.apprentice);
  return { click, gps, globalMult, autoClicksPerSec };
}

function loadSave() {
  try {
    const raw = localStorage.getItem("idlesmith-save");
    if (!raw) return { ...defaultSave };
    const parsed = JSON.parse(raw);
    return { ...defaultSave, ...parsed };
  } catch {
    return { ...defaultSave };
  }
}

function storeSave(save) {
  localStorage.setItem("idlesmith-save", JSON.stringify(save));
}

export default function IdleSmith() {
  const [save, setSave] = useState(loadSave);
  const [tab, setTab] = useState("play");
  const { click, gps, globalMult, autoClicksPerSec } = useMemo(() => computeDerived(save), [save]);
  const lastFrame = useRef(performance.now());

  // Apply offline progress on mount
  useEffect(() => {
    const now = Date.now();
    const deltaSec = clamp((now - save.lastTick) / 1000, 0, 60 * 60 * 8); // cap 8h
    if (deltaSec > 1 && (gps > 0 || autoClicksPerSec > 0)) {
      const goldFromIdle = deltaSec * (gps + autoClicksPerSec * click);
      setSave((s) => ({ ...s, gold: s.gold + goldFromIdle, lastTick: now }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main game loop (~60fps accumulates fractional income)
  useEffect(() => {
    let raf;
    let carry = 0;
    const loop = (t) => {
      const dt = Math.min(0.25, (t - lastFrame.current) / 1000); // cap frame time
      lastFrame.current = t;
      carry += dt;
      while (carry >= 1) {
        setSave((s) => ({ ...s, gold: s.gold + gps + autoClicksPerSec * click, lastTick: Date.now() }));
        carry -= 1;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gps, click, autoClicksPerSec]);

  // Autosave
  useEffect(() => {
    storeSave(save);
  }, [save]);

  const doClick = () => setSave((s) => ({ ...s, gold: s.gold + click }));

  const buyUpgrade = (key) => {
    const cost = upgradeCost(key, save.upgrades[key]);
    if (save.gold < cost) return;
    setSave((s) => ({
      ...s,
      gold: s.gold - cost,
      upgrades: { ...s.upgrades, [key]: s.upgrades[key] + 1 },
    }));
  };

  const canPrestige = save.gold >= 50_000; // simple threshold
  const essenceGain = Math.floor(Math.sqrt(save.gold / 5_000));

  const doPrestige = () => {
    if (!canPrestige || essenceGain <= 0) return;
    setSave((s) => ({
      ...defaultSave,
      prestige: {
        count: s.prestige.count + 1,
        essence: s.prestige.essence + essenceGain,
      },
      lastTick: Date.now(),
    }));
  };

  const resetAll = () => {
    if (!confirm("Reset your game? This clears progress but keeps nothing.")) return;
    setSave({ ...defaultSave, lastTick: Date.now() });
  };

  const UpgradeCard = ({ k }) => {
    const def = UPGRADE_DEFS[k];
    const lvl = save.upgrades[k];
    const cost = upgradeCost(k, lvl);
    const affordable = save.gold >= cost;
    return (
      <div className="rounded-2xl shadow-lg p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur border border-zinc-200/50 dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl" aria-hidden>{def.icon}</div>
            <div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-100">{def.name} <span className="text-xs text-zinc-500">Lv. {lvl}</span></div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{def.desc}</div>
            </div>
          </div>
          <button
            onClick={() => buyUpgrade(k)}
            disabled={!affordable}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition active:scale-[.98] ${affordable ? "bg-emerald-100/60 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200/70" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400 cursor-not-allowed"}`}
          >
            Buy — {fmt(cost)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[80vh] w-full grid place-items-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="max-w-3xl w-full">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">IdleSmith <span className="text-zinc-500 font-medium text-base">v{defaultSave.version}</span></h1>
          <nav className="flex gap-2">
            {[
              ["play", "Play"],
              ["upgrades", "Upgrades"],
              ["prestige", "Prestige"],
              ["settings", "Settings"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-xl text-sm border ${tab === k ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
            <div className="text-xs text-zinc-500">Gold</div>
            <div className="text-xl font-semibold" title={save.gold.toFixed(2)}>{fmt(save.gold)}</div>
          </div>
          <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
            <div className="text-xs text-zinc-500">Per Click</div>
            <div className="text-xl font-semibold" title={click.toFixed(2)}>{fmt(click)}</div>
          </div>
          <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
            <div className="text-xs text-zinc-500">Per Second</div>
            <div className="text-xl font-semibold" title={gps.toFixed(2)}>{fmt(gps)}</div>
          </div>
          <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
            <div className="text-xs text-zinc-500">Global Multiplier</div>
            <div className="text-xl font-semibold" title={globalMult.toFixed(2)}>{globalMult.toFixed(2)}×</div>
          </div>
        </div>

        {/* Tabs */}
        {tab === "play" && (
          <div className="rounded-3xl border p-6 bg-white/70 dark:bg-zinc-900/70 shadow-xl">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Click the ingot to forge gold. Invest in upgrades to automate and multiply your income.</div>
            <button
              onClick={doClick}
              className="w-full aspect-[3/1] grid place-items-center text-3xl sm:text-5xl font-extrabold rounded-3xl border active:scale-[.99] select-none shadow-inner bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-200 dark:from-amber-900/40 dark:via-amber-800/40 dark:to-yellow-800/30"
            >
              🧱 Forge! +{fmt(click)}
            </button>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.keys(UPGRADE_DEFS).map((k) => (
                <UpgradeCard key={k} k={k} />
              ))}
            </div>
          </div>
        )}

        {tab === "upgrades" && (
          <div className="grid gap-3">
            {Object.keys(UPGRADE_DEFS).map((k) => (
              <UpgradeCard key={k} k={k} />
            ))}
          </div>
        )}

        {tab === "prestige" && (
          <div className="rounded-3xl border p-6 bg-white/70 dark:bg-zinc-900/70 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">Prestige</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Convert progress into Essence for permanent +2% income per Essence.</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Prestiges</div>
                <div className="text-xl font-semibold">{save.prestige.count}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
                <div className="text-xs text-zinc-500">Current Essence</div>
                <div className="text-xl font-semibold">{fmt(save.prestige.essence)}</div>
              </div>
              <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
                <div className="text-xs text-zinc-500">Gold Required</div>
                <div className="text-xl font-semibold">{fmt(50_000)}</div>
              </div>
              <div className="rounded-2xl border p-3 bg-white/70 dark:bg-zinc-900/70">
                <div className="text-xs text-zinc-500">Essence on Reset</div>
                <div className="text-xl font-semibold">{fmt(essenceGain)}</div>
              </div>
            </div>
            <button
              onClick={doPrestige}
              disabled={!canPrestige || essenceGain <= 0}
              className={`mt-4 px-4 py-2 rounded-2xl border text-lg font-semibold ${canPrestige && essenceGain > 0 ? "bg-purple-100/70 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" : "opacity-50 cursor-not-allowed"}`}
            >
              Ascend & Gain Essence
            </button>
          </div>
        )}

        {tab === "settings" && (
          <div className="rounded-3xl border p-6 bg-white/70 dark:bg-zinc-900/70 shadow-xl grid gap-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Your progress saves automatically to localStorage and includes offline progress (capped at 8 hours).</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  storeSave(save);
                  alert("Saved!");
                }}
                className="px-3 py-1.5 rounded-xl border"
              >
                Manual Save
              </button>
              <button
                onClick={() => {
                  const txt = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
                  navigator.clipboard.writeText(txt);
                  alert("Copied export to clipboard!");
                }}
                className="px-3 py-1.5 rounded-xl border"
              >
                Export Save
              </button>
              <button
                onClick={() => {
                  const txt = prompt("Paste your save code");
                  if (!txt) return;
                  try {
                    const obj = JSON.parse(decodeURIComponent(escape(atob(txt))));
                    setSave({ ...defaultSave, ...obj });
                  // eslint-disable-next-line no-unused-vars
                  } catch (e) {
                    alert("Invalid save code");
                  }
                }}
                className="px-3 py-1.5 rounded-xl border"
              >
                Import Save
              </button>
              <button onClick={resetAll} className="px-3 py-1.5 rounded-xl border border-red-300 text-red-600">Hard Reset</button>
            </div>
            <div className="text-xs text-zinc-500">Tip: Toggle your chat UI dark mode for a different vibe.</div>
          </div>
        )}

        <footer className="mt-6 text-center text-xs text-zinc-500">
          Built by Christopher James Evans. Extend with new resources, buildings, achievements, and events.
        </footer>
      </div>
    </div>
  );
}
