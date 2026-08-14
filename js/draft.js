/* Hayward Invitational — final rosters, pairings, and weekend simulation */

(function () {
  const captains = HI_DATA.captains;

  const allPlayers = HI_DATA.players2026.filter(
    p => p.name !== captains.team1.name && p.name !== captains.team2.name
  );

  const state = {
    team1: [],
    team2: [],
    // pairings[team][day] = array of confirmed pairs, each pair = [playerObj, playerObj]
    pairings: {
      team1: { day1: [], day2: [] },
      team2: { day1: [], day2: [] },
    },
  };

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

  // ---- Box-Muller normal random ----
  function randNormal(mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * sd;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Higher-ranked / lower-volatility players get a bigger chance of a hole
  // landing on their "good" (better-than-expected) side of the distribution
  // — kept deliberately small across the board (max 14%, was 30%) so that a
  // full-strength good hole, and therefore a new personal best round, stays
  // rare rather than routine.
  function goodChanceFor(p) {
    const rank = p.rank ?? 15;
    return clamp(0.14 - (rank - 1) * (0.10 / 19), 0.04, 0.14);
  }

  // Top-ranked players are more consistent round to round (a smaller spread
  // around their average); lower-ranked players swing wider. This scales on
  // top of each player's own data-driven volatility (from statsFor), it
  // doesn't replace it.
  function volatilityMultiplierFor(p) {
    const rank = p.rank ?? 15;
    return clamp(0.75 + (rank - 1) * (0.5 / 19), 0.75, 1.25);
  }

  // Heavily right-skewed per-hole noise: deviations worse than expected
  // pass through at full strength (volatility should mostly push a round
  // higher, not lower), while better-than-expected deviations are
  // compressed hard — even the occasional "good" hole (goodChance) only
  // gets 3/4 strength, and the rest of the time a good deviation is cut to
  // under half. This keeps rounds well inside a player's normal range on
  // the good side, so a new personal best stays rare instead of routine.
  function skewedNoise(sd, goodChance) {
    const z = randNormal(0, sd);
    if (z < 0) return Math.random() < goodChance ? z * 0.75 : z * 0.45;
    return z;
  }

  // Splits a player's average over/under-par performance across 18 holes,
  // weighting harder holes (low hcp) to absorb slightly more of it, then
  // adds skewed per-hole noise. Returns an array of per-hole strokes.
  function simulateHoleScores(p, par, hcp) {
    const { avg, sd: baseSd } = statsFor(p);
    const sd = baseSd * volatilityMultiplierFor(p);
    const n = par.length;
    const totalPar = par.reduce((s, x) => s + x, 0);
    const expectedOverPar = avg - totalPar;
    const multipliers = hcp.map(h => 0.85 + (n - h) / (n - 1) * 0.30);
    const mSum = multipliers.reduce((s, x) => s + x, 0);
    const perHoleSD = sd / Math.sqrt(n);
    const goodChance = goodChanceFor(p);
    const rawHoles = par.map((holePar, i) => {
      const holeExpected = expectedOverPar * (multipliers[i] / mSum);
      const noise = skewedNoise(perHoleSD, goodChance);
      const raw = holePar + holeExpected + noise;
      return clamp(raw, holePar - 3, holePar + 6);
    });

    // Anchor the round to this player's own realistic history: their actual
    // best/worst round this season (`low`/`high`, from column H/G of the
    // trip workbook's 2026 sheet) is a far better ceiling than an abstract
    // statistical bound — someone whose worst round all year is 93
    // shouldn't suddenly blow up into the high 90s just because the random
    // draw ran hot. Rescale the round's deviations from par (keeping their
    // hole-to-hole shape) so the total lands inside [low, high] — the low
    // (personal-best) side has no bonus buffer, so the rescale never pushes
    // a round below a player's actual best; the high side keeps a small
    // buffer since a worse-than-ever round is the direction volatility
    // should push toward. Falls back to a stats-only bound for players
    // with no logged rounds.
    const rawTotal = rawHoles.reduce((s, x) => s + x, 0);
    const lo = p.low != null ? p.low : avg - sd * 2.5;
    const hi = p.high != null ? p.high + 2 : avg + sd * 2.5;
    let scale = 1;
    if (rawTotal > hi && rawTotal !== totalPar) scale = (hi - totalPar) / (rawTotal - totalPar);
    else if (rawTotal < lo && rawTotal !== totalPar) scale = (lo - totalPar) / (rawTotal - totalPar);

    return par.map((holePar, i) => {
      const deviation = rawHoles[i] - holePar;
      const scored = holePar + deviation * scale;
      return Math.max(1, Math.round(clamp(scored, holePar - 3, holePar + 6)));
    });
  }

  // ============ DRAFT ORDER (retained for next year's live draft) ============
  // Not wired up this year — the 2026 draft already happened and rosters are
  // seeded directly from HI_DATA.draftResults2026 (see seedFinalRosters()).
  // Kept here, still fully functional, so a future year's live coin-flip +
  // snake draft doesn't have to be re-derived from scratch: pass the coin-
  // flip winner's team key and the number of remaining picks (pool size) to
  // get back an ordered list of "team1"/"team2" turns.
  function buildSnakeOrder(firstTeam, numPicks) {
    const order = [];
    let round = 0;
    let idx = 0;
    const teams = firstTeam === "team1" ? ["team1", "team2"] : ["team2", "team1"];
    while (idx < numPicks) {
      const roundTeams = round % 2 === 0 ? teams : teams.slice().reverse();
      for (const t of roundTeams) {
        if (idx >= numPicks) break;
        order.push(t);
        idx++;
      }
      round++;
    }
    return order;
  }

  // ============ ROSTER RENDER ============
  function teamPanelHTML(teamKey) {
    const roster = state[teamKey];
    const label = teamKey === "team1" ? "Team " + captains.team1.teamLabel : "Team " + captains.team2.teamLabel;
    const rows = roster.map(p => `
      <li class="${p.isCaptain ? "captain-row" : ""}">
        <span>${p.name}${p.isCaptain ? " (C)" : ""}</span>
        <span class="pool-meta">${p.avgAll != null ? "avg " + p.avgAll : "—"}</span>
      </li>`).join("");
    return `
      <h3><span>${label}</span><span class="pill ${teamKey === "team1" ? "team1" : "team2"}">${roster.length} players</span></h3>
      <ul class="roster-list">${rows}</ul>`;
  }

  function renderRosters() {
    document.getElementById("team1-panel").innerHTML = teamPanelHTML("team1");
    document.getElementById("team2-panel").innerHTML = teamPanelHTML("team2");
  }

  // ============ ARCHIVED — interactive pairing-picker engine (2026) ============
  // 2026's pairings were set directly by the captains ahead of the trip (see
  // HI_DATA.pairings2026 in js/data.js) rather than chosen on the site, so
  // this whole tier/pairing/auto-pair engine is retired for this year — see
  // "2026 FIXED PAIRINGS" further down for what actually renders and feeds
  // the simulation now. Kept here, still fully functional, in case a future
  // year goes back to letting captains build pairings interactively on the
  // page (same treatment as buildSnakeOrder above for the live draft).
  // Nothing in this block is called anywhere below.
  //
  // ============ TIERS ============
  // Top 4 (best avg score), Bottom 4 (worst avg score), everyone else = Wild
  // Cards — except `forcedWildNames`, who are pulled out of the scoring pool
  // up front and are always Wild regardless of their avg score (used for
  // Team Hagan's captain + A. Urban, see FORCED_WILD below). Forcing them out
  // of the pool before the top/bottom split also means the remaining players
  // still divide the same way the un-forced roster would have.
  function computeTiers(roster, forcedWildNames = []) {
    const forcedWild = roster.filter(p => forcedWildNames.includes(p.name));
    const scored = roster.filter(p => !forcedWildNames.includes(p.name));
    const sorted = scored.slice().sort((a, b) => scoreKey(a) - scoreKey(b));
    const n = sorted.length;
    const top = sorted.slice(0, 4);
    const bottom = sorted.slice(Math.max(4, n - 4));
    const wild = forcedWild.concat(sorted.slice(4, Math.max(4, n - 4)));
    const tierOf = new Map();
    top.forEach(p => tierOf.set(p.name, "top"));
    wild.forEach(p => tierOf.set(p.name, "wild"));
    bottom.forEach(p => tierOf.set(p.name, "bottom"));
    return { top, bottom, wild, tierOf };
  }

  // Team Hagan's captain and A. Urban are always Wild Cards, per the 2026
  // pairing rules — not left to fall out of the score split like everyone
  // else. Team Greenblat has no forced Wild Cards.
  const FORCED_WILD = { team1: ["M. Hagan", "A. Urban"], team2: [] };

  const tierCache = { team1: null, team2: null };
  function tiersFor(teamKey) {
    if (!tierCache[teamKey]) tierCache[teamKey] = computeTiers(state[teamKey], FORCED_WILD[teamKey]);
    return tierCache[teamKey];
  }

  function tierBadge(tier) {
    const label = tier === "top" ? "Top" : tier === "bottom" ? "Bottom" : "Wild";
    return `<span class="pair-tier-badge ${tier}">${label}</span>`;
  }

  // ============ PAIRINGS ============
  const panelSelection = {}; // key "teamKey-day" -> selected player name or null

  function panelKey(teamKey, day) { return `${teamKey}-day${day}`; }

  function pairedNames(teamKey, day) {
    const pairs = state.pairings[teamKey][`day${day}`];
    const names = new Set();
    pairs.forEach(pr => { names.add(pr[0].name); names.add(pr[1].name); });
    return names;
  }

  function unpairedPlayers(teamKey, day) {
    const paired = pairedNames(teamKey, day);
    return state[teamKey].filter(p => !paired.has(p.name));
  }

  // Wild Cards play with Top players on Day 1 and with Bottom players on
  // Day 2 (both teams) — never with another Wild Card, and never with the
  // tier that's "off" for that day. Top and Bottom never pair with each
  // other, on either day.
  function tierCompatible(teamKey, day, a, b) {
    const { tierOf } = tiersFor(teamKey);
    const ta = tierOf.get(a.name), tb = tierOf.get(b.name);
    if (ta === "top" && tb === "bottom") return false;
    if (ta === "bottom" && tb === "top") return false;
    if (ta === "wild" && tb === "wild") return false;
    const otherTierFor = (mine, other) => (mine === "wild" ? other : null);
    const wildPartnerTier = otherTierFor(ta, tb) || otherTierFor(tb, ta);
    if (wildPartnerTier) {
      const requiredTier = day === 1 ? "top" : "bottom";
      if (wildPartnerTier !== requiredTier) return false;
    }
    return true;
  }

  function wasDay1Partner(teamKey, a, b) {
    const day1Pairs = state.pairings[teamKey].day1;
    return day1Pairs.some(pr =>
      (pr[0].name === a.name && pr[1].name === b.name) ||
      (pr[0].name === b.name && pr[1].name === a.name)
    );
  }

  function canPair(teamKey, day, a, b) {
    if (a.name === b.name) return false;
    if (!tierCompatible(teamKey, day, a, b)) return false;
    if (day === 2 && wasDay1Partner(teamKey, a, b)) return false;
    return true;
  }

  // Finds Team Hagan's Day 1 shoot-twice player, if one has been chosen —
  // used to keep Day 2's shoot-twice pick from repeating the same person.
  function day1ShootTwiceName(teamKey) {
    const pr = state.pairings[teamKey].day1.find(p => p[0].name === p[1].name);
    return pr ? pr[0].name : null;
  }

  function day1Complete(teamKey) {
    return unpairedPlayers(teamKey, 1).length <= 1;
  }

  function addPair(teamKey, day, a, b) {
    state.pairings[teamKey][`day${day}`].push([a, b]);
    panelSelection[panelKey(teamKey, day)] = null;
  }

  function removePair(teamKey, day, idx) {
    state.pairings[teamKey][`day${day}`].splice(idx, 1);
    // if this was day1, any day2 pairs that relied on the now-changed day1 state
    // are still valid (they were valid when made); no cascade needed.
  }

  // Team Hagan (team1) is 9 players (odd), so on any given day one player
  // would otherwise sit out. Instead, that player plays as their own
  // scramble partner (self-pair) for that specific day — a different
  // player can shoot twice on Day 1 than on Day 2. Only offered for team1:
  // rosters are finalized this year, so this isn't generalized to
  // "whichever team is odd" (Team Greenblat is 10 and never needs it).
  //
  // Day 1: only a Bottom-tier player may shoot twice — the Wild-with-Top-only
  // rule in tierCompatible guarantees Top+Wild always pairs off fully, so
  // Bottom (3, odd) is the only group that can have a leftover. Day 2: a
  // Bottom-tier or Wild-tier player may shoot twice (see the Wild-vs-Top ban
  // in tierCompatible and the fixup in settleSoloPlayer below), but never the
  // same person who already shot twice on Day 1 — this spreads the "extra
  // round" across two different players instead of it landing on one person
  // twice.
  function pairSelf(teamKey, day, name) {
    const dayPairs = state.pairings[teamKey][`day${day}`];
    if (dayPairs.some(pr => pr[0].name === pr[1].name)) return; // only one shoot-twice player per day
    const unpaired = unpairedPlayers(teamKey, day);
    const player = unpaired.find(p => p.name === name);
    if (!player) return;
    addPair(teamKey, day, player, player);
  }

  // There is no sit-out: whenever pairing (manual or auto) leaves exactly
  // one player with no partner, they automatically shoot twice instead.
  // Safe to call after any pairing change — a no-op unless exactly one
  // player is left, and pairSelf itself guards against a second self-pair
  // on the same day.
  function settleSoloPlayer(teamKey, day) {
    const unpaired = unpairedPlayers(teamKey, day);
    if (unpaired.length !== 1) return;
    let solo = unpaired[0];
    // Day 2, Team Hagan: the Day 2 shoot-twice player can't be the same
    // person who already shot twice on Day 1. Top always pairs off fully on
    // Day 2 (Wild only partners Bottom), so if the Day 1 shooter is the one
    // left over here, some other Wild/Bottom pair must already be confirmed
    // — break it, give the Day 1 shooter that slot, and let the freed player
    // become the new (valid) leftover instead.
    if (teamKey === "team1" && day === 2 && solo.name === day1ShootTwiceName(teamKey)) {
      const dayPairs = state.pairings.team1.day2;
      const { tierOf } = tiersFor("team1");
      const idx = dayPairs.findIndex(pr => tierOf.get(pr[0].name) !== "top");
      if (idx !== -1) {
        const [x, y] = dayPairs[idx];
        dayPairs.splice(idx, 1);
        addPair("team1", 2, solo, x);
        solo = y;
      }
    }
    pairSelf(teamKey, day, solo.name);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Finds a maximum matching (most pairs, at most one leftover) that never
  // violates canPairFn — a plain greedy pass can get stuck and previously
  // fell back to forcing invalid tier pairings, so this backtracks instead.
  function bestMatching(players, canPairFn) {
    function helper(list) {
      if (list.length === 0) return { pairs: [], leftover: [] };
      if (list.length === 1) return { pairs: [], leftover: list.slice() };
      const first = list[0];
      const rest = list.slice(1);
      let best = null;
      for (let i = 0; i < rest.length; i++) {
        if (!canPairFn(first, rest[i])) continue;
        const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
        const sub = helper(remaining);
        if (!best || sub.pairs.length + 1 > best.pairs.length) {
          best = { pairs: [[first, rest[i]], ...sub.pairs], leftover: sub.leftover };
        }
        if (best.leftover.length === 0) return best; // can't do better than fully paired
      }
      // leave 'first' sitting out and pair the rest
      const subB = helper(rest);
      if (!best || subB.pairs.length > best.pairs.length) {
        best = { pairs: subB.pairs, leftover: [first, ...subB.leftover] };
      }
      return best;
    }
    return helper(players);
  }

  function autoPairRemaining(teamKey, day) {
    const unpaired = shuffle(unpairedPlayers(teamKey, day));
    const { pairs } = bestMatching(unpaired, (a, b) => canPair(teamKey, day, a, b));
    pairs.forEach(([a, b]) => addPair(teamKey, day, a, b));
    settleSoloPlayer(teamKey, day);
    renderPairingPanel(teamKey, day);
    renderOtherDayPanelIfNeeded(teamKey, day);
    updateSimulateGate();
  }

  function renderOtherDayPanelIfNeeded(teamKey, day) {
    if (day === 1) renderPairingPanel(teamKey, 2);
  }

  function pairingPanelHTML(teamKey, day) {
    const c = teamKey === "team1" ? captains.team1 : captains.team2;
    const teamLabel = "Team " + c.teamLabel;
    const teamClass = teamKey === "team1" ? "team1" : "team2";

    if (day === 2 && !day1Complete(teamKey)) {
      return `
        <h4>${teamLabel}</h4>
        <p class="locked-msg">Finish Day 1 pairings for ${teamLabel} first.</p>`;
    }

    const { tierOf } = tiersFor(teamKey);
    const pairs = state.pairings[teamKey][`day${day}`];
    const unpaired = unpairedPlayers(teamKey, day);
    const selName = panelSelection[panelKey(teamKey, day)];
    const selPlayer = unpaired.find(p => p.name === selName) || null;

    // Only one player per day can shoot twice — once someone's picked, hide
    // the button for everyone else on that day rather than allow a second.
    const hasSelfPair = pairs.some(pr => pr[0].name === pr[1].name);

    // Team Hagan only: offered on both days now — Day 1 to Bottom-tier
    // players, Day 2 to Bottom-tier or Wild-tier players, excluding whoever
    // already shot twice on Day 1 (see day1ShootTwiceName).
    const canOfferShootTwice = teamKey === "team1" && !hasSelfPair;
    const day1Shooter = day === 2 ? day1ShootTwiceName(teamKey) : null;

    const playerButtons = unpaired.map(p => {
      const isSelected = selPlayer && p.name === selPlayer.name;
      const disabled = selPlayer && !isSelected && !canPair(teamKey, day, selPlayer, p);
      const tier = tierOf.get(p.name);
      const shootTwiceEligible = canOfferShootTwice && p.name !== day1Shooter &&
        (day === 1 ? tier === "bottom" : tier === "bottom" || tier === "wild");
      const shootTwiceBtn = shootTwiceEligible
        ? `<button type="button" class="shoot-twice-mini" data-team="${teamKey}" data-day="${day}" data-name="${p.name}" title="${p.name} shoots twice">2&times;</button>`
        : "";
      return `
        <div class="pair-pool-item">
          <button type="button" class="pair-player-btn ${isSelected ? "selected" : ""}"
            data-team="${teamKey}" data-day="${day}" data-name="${p.name}" ${disabled ? "disabled" : ""}>
            <span class="pair-player-name">${p.name}${p.isCaptain ? " (C)" : ""}</span>
            <span class="pair-player-meta">${tierBadge(tierOf.get(p.name))}<span class="pool-meta">${p.avgAll != null ? p.avgAll : "—"}</span></span>
          </button>
          ${shootTwiceBtn}
        </div>`;
    }).join("");

    const pairRows = pairs.map((pr, i) => {
      const label = pr[0].name === pr[1].name ? `${pr[0].name} &mdash; Shooting Twice` : `${pr[0].name} &amp; ${pr[1].name}`;
      const unpairBtn = `<button type="button" class="unpair-btn" data-team="${teamKey}" data-day="${day}" data-idx="${i}" title="Unpair">&times;</button>`;
      return `<li class="confirmed-pair-row"><span>${label}</span>${unpairBtn}</li>`;
    }).join("");

    return `
      <h4>${teamLabel}</h4>
      <div class="pair-tier-legend">${tierBadge("top")}${tierBadge("wild")}${tierBadge("bottom")}</div>
      ${unpaired.length > 1 ? `<div class="text-center pairing-autobtn"><button type="button" class="btn-outline" style="background:transparent;border:1px solid var(--masters-green);color:var(--masters-green-dark);padding:6px 16px;border-radius:999px;font-size:0.8rem;cursor:pointer;font-family:inherit;font-weight:700;" data-autopair-team="${teamKey}" data-autopair-day="${day}">Auto-Pair</button></div>` : ""}
      ${pairs.length ? `<ul class="confirmed-pairs">${pairRows}</ul>` : ""}
      ${unpaired.length > 1 ? `<div class="pair-pool">${playerButtons}</div>` : ""}
      ${canOfferShootTwice && unpaired.length > 1 ? `<p class="sitout-note">Tap <strong>2&times;</strong> next to an eligible player to have them shoot twice, or leave it be — whoever's left unpaired shoots twice automatically.</p>` : ""}
    `;
  }

  function renderPairingPanel(teamKey, day) {
    const el = document.getElementById(`pair-${teamKey}-day${day}`);
    if (!el) return;
    el.innerHTML = pairingPanelHTML(teamKey, day);

    el.querySelectorAll(".pair-player-btn").forEach(btn => {
      btn.addEventListener("click", () => onPlayerClick(btn.getAttribute("data-team"), Number(btn.getAttribute("data-day")), btn.getAttribute("data-name")));
    });
    el.querySelectorAll(".shoot-twice-mini").forEach(btn => {
      btn.addEventListener("click", () => {
        const teamKey = btn.getAttribute("data-team");
        const day = Number(btn.getAttribute("data-day"));
        pairSelf(teamKey, day, btn.getAttribute("data-name"));
        renderPairingPanel(teamKey, day);
        renderOtherDayPanelIfNeeded(teamKey, day);
        updateSimulateGate();
      });
    });
    el.querySelectorAll(".unpair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const teamKey = btn.getAttribute("data-team");
        const day = Number(btn.getAttribute("data-day"));
        removePair(teamKey, day, Number(btn.getAttribute("data-idx")));
        renderPairingPanel(teamKey, day);
        renderOtherDayPanelIfNeeded(teamKey, day);
        updateSimulateGate();
      });
    });
    el.querySelectorAll("[data-autopair-team]").forEach(btn => {
      btn.addEventListener("click", () => autoPairRemaining(btn.getAttribute("data-autopair-team"), Number(btn.getAttribute("data-autopair-day"))));
    });
  }

  function onPlayerClick(teamKey, day, name) {
    const key = panelKey(teamKey, day);
    const unpaired = unpairedPlayers(teamKey, day);
    const player = unpaired.find(p => p.name === name);
    if (!player) return;
    const selectedName = panelSelection[key];

    if (!selectedName) {
      panelSelection[key] = name;
    } else if (selectedName === name) {
      panelSelection[key] = null;
    } else {
      const selPlayer = unpaired.find(p => p.name === selectedName);
      if (selPlayer && canPair(teamKey, day, selPlayer, player)) {
        addPair(teamKey, day, selPlayer, player);
        settleSoloPlayer(teamKey, day);
      } else {
        panelSelection[key] = name;
      }
    }
    renderPairingPanel(teamKey, day);
    renderOtherDayPanelIfNeeded(teamKey, day);
    updateSimulateGate();
  }

  function renderAllPairingPanels() {
    tierCache.team1 = null;
    tierCache.team2 = null;
    renderPairingPanel("team1", 1);
    renderPairingPanel("team2", 1);
    renderPairingPanel("team1", 2);
    renderPairingPanel("team2", 2);
    updateSimulateGate();
  }

  function autoPairAllDays() {
    ["team1", "team2"].forEach(tk => autoPairRemaining(tk, 1));
    ["team1", "team2"].forEach(tk => autoPairRemaining(tk, 2));
  }

  const autopairAllBtn = document.getElementById("autopair-all-btn");
  if (autopairAllBtn) autopairAllBtn.addEventListener("click", autoPairAllDays);

  function allPairingsComplete() {
    return ["team1", "team2"].every(teamKey =>
      unpairedPlayers(teamKey, 1).length <= 1 && unpairedPlayers(teamKey, 2).length <= 1
    );
  }

  function updateSimulateGate() {
    const btn = document.getElementById("simulate-btn");
    const help = document.getElementById("simulate-help");
    const heading = document.getElementById("simulate-heading");
    if (!btn) return;
    if (allPairingsComplete()) {
      btn.disabled = false;
      heading.textContent = "Ready to Simulate!";
      help.textContent = "Pairings are set for both days — let's see who takes the Cup.";
    } else {
      btn.disabled = true;
      heading.textContent = "Set Your Pairings";
      help.textContent = "Complete all four pairing panels above to unlock the simulation.";
    }
  }
  // ============ END ARCHIVED interactive pairing-picker engine ============

  // ============ 2026 FIXED PAIRINGS ============
  // Captains set these ahead of the trip (HI_DATA.pairings2026) — the site
  // just resolves the names to player objects and renders them read-only,
  // grouped the same "Upper Tier"/"Bottom Tier" way as the source graphic.
  // This is also how the simulation decides matchups: Upper plays Upper and
  // Bottom plays Bottom, each side matched by comparable strength within its
  // tier (see matchDayByTier below) — same fairness goal the old cross-team
  // strength-sort had, just scoped per tier since that's how the real
  // pairings are already grouped.
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

  // Populated during INIT (after seedFinalRosters), not here — resolvePair
  // needs state.team1/team2 to already be filled in.
  let fixedPairings = null;

  function fixedPairLabel(pair) {
    return pair[0].name === pair[1].name
      ? `${pair[0].name} &mdash; Shooting Twice`
      : `${pair[0].name} &amp; ${pair[1].name}`;
  }

  function fixedTierRowsHTML(label, pairs) {
    if (!pairs.length) return "";
    const rows = pairs.map(pr => `<li class="confirmed-pair-row"><span>${fixedPairLabel(pr)}</span></li>`).join("");
    return `<p class="pairing-tier-label">${label}</p><ul class="confirmed-pairs">${rows}</ul>`;
  }

  function fixedPairingPanelHTML(teamKey, day) {
    const c = teamKey === "team1" ? captains.team1 : captains.team2;
    const { upper, bottom } = fixedPairings[teamKey][day];
    return `
      <h4>Team ${c.teamLabel}</h4>
      ${fixedTierRowsHTML("Upper Tier", upper)}
      ${fixedTierRowsHTML("Bottom Tier", bottom)}
    `;
  }

  function renderFixedPairings() {
    document.getElementById("pair-team1-day1").innerHTML = fixedPairingPanelHTML("team1", "day1");
    document.getElementById("pair-team2-day1").innerHTML = fixedPairingPanelHTML("team2", "day1");
    document.getElementById("pair-team1-day2").innerHTML = fixedPairingPanelHTML("team1", "day2");
    document.getElementById("pair-team2-day2").innerHTML = fixedPairingPanelHTML("team2", "day2");
  }

  // ============ SIMULATION ============
  // Scramble match play: each teammate plays every hole, the team's score on
  // that hole is the better (lower) of the two, and whichever team wins more
  // of the 18 individual holes wins the match (ties on a hole are halved).
  const DAY_POINTS = {
    1: { win: 2, draw: 1, loss: 0 },
    2: { win: 3, draw: 1, loss: 0 },
  };

  function pairStrength(pair) {
    return (scoreKey(pair[0]) + scoreKey(pair[1])) / 2;
  }

  function simulatePairing(pairA, pairB, dayNum, par, hcp) {
    const holesA = pairA.map(p => simulateHoleScores(p, par, hcp));
    const holesB = pairB.map(p => simulateHoleScores(p, par, hcp));
    const n = par.length;
    let holesWonA = 0, holesWonB = 0, halved = 0;
    // teamScoreA/B is the real scramble score: every player hits from the
    // shared spot each stroke and the team keeps its best result, so there's
    // only ever one ball per team per hole (approximated here as the better
    // of the two players' simulated hole scores). scoreA/scoreB below are
    // each player's own hypothetical solo round — not a real card in a
    // scramble, kept only as flavor/context in the UI.
    let teamScoreA = 0, teamScoreB = 0;
    for (let i = 0; i < n; i++) {
      const bestA = Math.min(holesA[0][i], holesA[1][i]);
      const bestB = Math.min(holesB[0][i], holesB[1][i]);
      teamScoreA += bestA;
      teamScoreB += bestB;
      if (bestA < bestB) holesWonA++;
      else if (bestB < bestA) holesWonB++;
      else halved++;
    }
    const scoreA = holesA.map(h => h.reduce((a, b) => a + b, 0));
    const scoreB = holesB.map(h => h.reduce((a, b) => a + b, 0));
    const pts = DAY_POINTS[dayNum];
    let pointsA = pts.draw, pointsB = pts.draw;
    if (holesWonA > holesWonB) { pointsA = pts.win; pointsB = pts.loss; }
    else if (holesWonB > holesWonA) { pointsA = pts.loss; pointsB = pts.win; }
    return { pairA, pairB, scoreA, scoreB, teamScoreA, teamScoreB, holesWonA, holesWonB, halved, pointsA, pointsB };
  }

  // Matches pairs of comparable strength within a tier (sorted best-to-worst
  // on both sides and zipped) so a team's stronger pairing in a tier doesn't
  // draw the other team's weakest pairing in that same tier. Upper and
  // Bottom are matched separately (not against each other) since that's how
  // the real 2026 pairings are grouped — see fixedPairings above.
  function matchDayByTier(pairsA, pairsB, dayNum, par, hcp) {
    function zipTier(tierA, tierB) {
      const sortedA = tierA.slice().sort((a, b) => pairStrength(a) - pairStrength(b));
      const sortedB = tierB.slice().sort((a, b) => pairStrength(a) - pairStrength(b));
      const n = Math.min(sortedA.length, sortedB.length);
      const matchups = [];
      for (let i = 0; i < n; i++) matchups.push(simulatePairing(sortedA[i], sortedB[i], dayNum, par, hcp));
      return matchups;
    }
    return [...zipTier(pairsA.upper, pairsB.upper), ...zipTier(pairsA.bottom, pairsB.bottom)];
  }

  function pairingHTML(m, name1, name2) {
    const aWin = m.pointsA > m.pointsB;
    const bWin = m.pointsB > m.pointsA;
    // Points are earned per matchup (day 1 win = 2, day 2 win = 3, draw = 1
    // each), not a head-to-head score, so show them as "+N" awarded to
    // whichever side won rather than as a "2 – 0"-style scoreline.
    const pointsDisplay = aWin ? `+${m.pointsA}`
      : bWin ? `+${m.pointsB}`
      : `+${m.pointsA} each`;
    // Color the points to match whichever team won (var(--team1) green for
    // Hagan-side, var(--team2) gold for Greenblat-side); a draw stays the
    // default muted color since there's no winner to color it after.
    const pointsColor = aWin ? "var(--team1)" : bWin ? "var(--team2)" : "var(--ink-soft)";
    const isShootTwiceA = m.pairA[0].name === m.pairA[1].name;
    const isShootTwiceB = m.pairB[0].name === m.pairB[1].name;
    const soloLines = (pair, scores, isShootTwice) => isShootTwice
      ? `<div>${pair[0].name} (Round 1: ${scores[0]})</div><div>${pair[1].name} (Round 2: ${scores[1]})</div>`
      : pair.map((p, i) => `<div>${p.name} (solo pace ${scores[i]})</div>`).join("");
    return `
    <div class="sim-pair">
      <div class="muted" style="grid-column:1/-1; font-size:0.85rem; text-align:center;">
        Holes won: ${m.holesWonA}&nbsp;&ndash;&nbsp;${m.holesWonB}${m.halved ? ` (${m.halved} halved)` : ""}
      </div>
      <div class="sim-side ${aWin ? "win" : ""}">
        <div class="pill team1">${name1}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreA}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${soloLines(m.pairA, m.scoreA, isShootTwiceA)}</div>
      </div>
      <div class="sim-vs" style="color:${pointsColor}; font-weight:700;">${pointsDisplay}</div>
      <div class="sim-side ${bWin ? "win" : ""}">
        <div class="pill team2">${name2}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreB}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${soloLines(m.pairB, m.scoreB, isShootTwiceB)}</div>
      </div>
    </div>`;
  }

  function runSimulation() {
    const name1 = captains.team1.teamLabel, name2 = captains.team2.teamLabel;

    const hayward = HI_DATA.courses.hayward, bigFish = HI_DATA.courses.bigFish;
    const day1Matchups = matchDayByTier(fixedPairings.team1.day1, fixedPairings.team2.day1, 1, bigFish.par, bigFish.hcp);
    const day2Matchups = matchDayByTier(fixedPairings.team1.day2, fixedPairings.team2.day2, 2, hayward.par, hayward.hcp);

    let total1 = 0, total2 = 0;
    [day1Matchups, day2Matchups].forEach(matchups => matchups.forEach(m => { total1 += m.pointsA; total2 += m.pointsB; }));

    const winner = total1 > total2 ? name1 : total2 > total1 ? name2 : "Tie";

    function daySection(matchups, label, dayNum) {
      const pts = DAY_POINTS[dayNum];
      return `
      <div class="sim-day">
        <h3>${label}</h3>
        <p class="muted" style="font-size:0.8rem; margin-top:-4px;">Win = ${pts.win} pts &middot; Draw = ${pts.draw} pt &middot; Loss = ${pts.loss} pts</p>
        ${matchups.map(m => pairingHTML(m, name1, name2)).join("")}
      </div>`;
    }

    const html = `
      <div class="winner-banner">
        <div class="muted" style="color: var(--fairway); text-transform:uppercase; letter-spacing:.15em; font-size:0.8rem;">Projected Winner</div>
        <h2>Team ${winner}</h2>
        <p style="color: var(--fairway); font-size:1.1rem;">Final Score: Team ${name1} ${total1} &ndash; Team ${name2} ${total2}</p>
      </div>
      <div class="section" style="margin-top:28px;">
        ${daySection(day1Matchups, "Day 1 — Big Fish Golf Club (2v2 Scramble)", 1)}
        ${daySection(day2Matchups, "Day 2 — Hayward Golf Course (2v2 Scramble)", 2)}
      </div>
      <div class="text-center">
        <button class="btn btn-secondary" id="resim-btn">Re-run Simulation</button>
      </div>
    `;
    const resultsEl = document.getElementById("sim-results");
    resultsEl.innerHTML = html;
    resultsEl.style.display = "";
    document.getElementById("resim-btn").addEventListener("click", () => {
      runSimulation();
      document.getElementById("sim-results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("simulate-btn").addEventListener("click", runSimulation);

  // ============ INIT ============
  seedFinalRosters();
  renderRosters();
  fixedPairings = resolveFixedPairings();
  renderFixedPairings();
})();
