/* Hayward Invitational — shared rosters/pairings/matchup engine.
   No DOM here — this is the pure-data layer both rosters.html (which lets
   the user customize matchups) and simulation.html (which just needs to
   read them) load before their own page-specific renderer script. One
   script exposing one global (`PairingsEngine`), same convention js/data.js
   already establishes with `HI_DATA`. */

const PairingsEngine = (function () {
  const captains = HI_DATA.captains;

  const allPlayers = HI_DATA.players2026.filter(
    p => p.name !== captains.team1.name && p.name !== captains.team2.name
  );

  const state = { team1: [], team2: [] };

  // ============ FINAL ROSTERS (2026) ============
  // The real draft already happened — seed team rosters directly from the
  // actual results instead of running a live coin-flip/pick-by-pick draft.
  // See HI_DATA.draftResults2026 in js/data.js.
  function seedFinalRosters() {
    function buildRoster(teamKey) {
      const captain = captainAsPlayer(captains[teamKey]);
      const picks = HI_DATA.draftResults2026[teamKey]
        .map(name => allPlayers.find(p => p.name === name))
        .filter(Boolean);
      return [captain, ...picks];
    }
    state.team1 = buildRoster("team1");
    state.team2 = buildRoster("team2");
  }

  function captainAsPlayer(c) {
    const p = HI_DATA.players2026.find(pl => pl.name === c.name);
    return p ? { ...p, isCaptain: true } : { name: c.name, isCaptain: true, avgAll: null, rank: null };
  }

  // ---- fallback stats for players with no logged rounds this season ----
  function scoreKey(p) { return p.avgAll ?? 100; }

  function statsFor(p) {
    if (p.avgAll != null) {
      return {
        avg: p.avgAll,
        sd: Math.max(2, (p.volatility || 10) / 3.2),
      };
    }
    return { avg: 100, sd: 8 }; // rookie / no-data fallback
  }

  function pairStrength(pair) {
    return (scoreKey(pair[0]) + scoreKey(pair[1])) / 2;
  }

  // Shared display helper — both the Rosters page (read-only pairings) and
  // the Simulation page (Matchup Chooser) render pair labels the same way.
  function fixedPairLabel(pair) {
    return pair[0].name === pair[1].name
      ? `${pair[0].name} &mdash; Shooting Twice`
      : `${pair[0].name} &amp; ${pair[1].name}`;
  }

  // ============ 2026 FIXED PAIRINGS ============
  // Captains set these ahead of the trip (HI_DATA.pairings2026) — resolve
  // the names to player objects, grouped the same "Upper Tier"/"Bottom
  // Tier" way as the source graphic. This is also how the simulation
  // decides matchups: Upper plays Upper and Bottom plays Bottom, each side
  // matched by comparable strength within its tier by default.
  function resolvePair(teamKey, names) {
    const roster = state[teamKey];
    return names.map(n => roster.find(p => p.name === n));
  }

  function resolveFixedPairings() {
    const out = {};
    ["team1", "team2"].forEach(teamKey => {
      out[teamKey] = {};
      ["day1", "day2"].forEach(day => {
        const src = HI_DATA.pairings2026[teamKey][day];
        out[teamKey][day] = {
          upper: src.upper.map(pair => resolvePair(teamKey, pair)),
          bottom: src.bottom.map(pair => resolvePair(teamKey, pair)),
        };
      });
    });
    return out;
  }

  // ============ MATCHUP DEFAULT ORDER ============
  // order[i] = index into tierB that tierA[i] (team1's fixed pair order)
  // faces, built by sorting both sides by strength and zipping — the
  // default a user can override on the Rosters page's Matchup Chooser and
  // reset back to at any time.
  function defaultMatchOrderForTier(tierA, tierB) {
    const idxA = tierA.map((_, i) => i).sort((i, j) => pairStrength(tierA[i]) - pairStrength(tierA[j]));
    const idxB = tierB.map((_, i) => i).sort((i, j) => pairStrength(tierB[i]) - pairStrength(tierB[j]));
    const order = new Array(tierA.length);
    idxA.forEach((origIdx, rank) => { order[origIdx] = idxB[rank]; });
    return order;
  }

  function computeDefaultMatchOrder() {
    const out = {};
    ["day1", "day2"].forEach(day => {
      out[day] = {
        upper: defaultMatchOrderForTier(fixedPairings.team1[day].upper, fixedPairings.team2[day].upper),
        bottom: defaultMatchOrderForTier(fixedPairings.team1[day].bottom, fixedPairings.team2[day].bottom),
      };
    });
    return out;
  }

  seedFinalRosters();
  const fixedPairings = resolveFixedPairings();

  // ============ MATCHUP PERSISTENCE ============
  // The only user-created state in this whole flow is a customized
  // matchOrder (set via the Simulation page's Matchup Chooser, by pressing
  // Auto-Match and/or swapping individual matchups) — fixedPairings above
  // is 100% deterministic from HI_DATA alone. Saved to localStorage
  // (unused anywhere else on this site — confirmed by repo grep, so no
  // collision risk) purely so it survives a page reload/re-visit — the
  // Matchup Chooser is unfilled by default on a genuinely fresh visit (no
  // matchups exist until Auto-Match is pressed), this is not a fallback
  // default the way it used to be. Year-scoped key so a future year's data
  // refresh naturally invalidates any stale saved order without needing a
  // migration step.
  const STORAGE_KEY = "hi_matchOrder_2026";

  function isValidMatchOrderShape(parsed, fallback) {
    return !!parsed && ["day1", "day2"].every(day =>
      parsed[day] && ["upper", "bottom"].every(tier =>
        Array.isArray(parsed[day][tier]) &&
        parsed[day][tier].length === fallback[day][tier].length
      )
    );
  }

  // Returns whatever matchOrder was last saved, or null if nothing's
  // stored / what's stored is malformed / shape-mismatched (e.g. tier
  // sizes changed in a future year's pairings2026 refresh) — null means
  // "unfilled," the Matchup Chooser's genuine default state, not "fall
  // back to something."
  function loadSavedMatchOrder() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const fallback = computeDefaultMatchOrder();
      return isValidMatchOrderShape(parsed, fallback) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveMatchOrder(order) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
  }

  return {
    captains, state, fixedPairings,
    pairStrength, scoreKey, statsFor, fixedPairLabel,
    computeDefaultMatchOrder, loadSavedMatchOrder, saveMatchOrder,
  };
})();
