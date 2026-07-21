/* Hayward Invitational — mock draft + weekend simulation */

(function () {
  const captains = HI_DATA.captains;

  const allPlayers = HI_DATA.players2026.filter(
    p => p.name !== captains.team1.name && p.name !== captains.team2.name
  );

  const state = {
    available: allPlayers.slice().sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    team1: [{ ...captainAsPlayer(captains.team1) }],
    team2: [{ ...captainAsPlayer(captains.team2) }],
    order: [],      // array of "team1"/"team2" for each remaining pick
    pickIndex: 0,
    started: false,
    // pairings[team][day] = array of confirmed pairs, each pair = [playerObj, playerObj]
    pairings: {
      team1: { day1: [], day2: [] },
      team2: { day1: [], day2: [] },
    },
  };

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
  // landing on their "good" (better-than-expected) side of the distribution.
  function goodChanceFor(p) {
    const rank = p.rank ?? 15;
    return clamp(0.30 - (rank - 1) * (0.22 / 19), 0.08, 0.30);
  }

  // Top-ranked players are more consistent round to round (a smaller spread
  // around their average); lower-ranked players swing wider. This scales on
  // top of each player's own data-driven volatility (from statsFor), it
  // doesn't replace it.
  function volatilityMultiplierFor(p) {
    const rank = p.rank ?? 15;
    return clamp(0.75 + (rank - 1) * (0.5 / 19), 0.75, 1.25);
  }

  // Right-skewed per-hole noise: deviations worse than expected pass through
  // in full (this is where most of the spread lives — golfers on this trip
  // mostly shoot at or below their average), while better-than-expected
  // deviations are dampened to a small nudge most of the time, except a
  // goodChance fraction of holes where they pass through in full (an
  // occasional strong showing, more likely for the top-ranked players).
  function skewedNoise(sd, goodChance) {
    const z = randNormal(0, sd);
    if (z < 0) return Math.random() < goodChance ? z : z * 0.7;
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
    // best/worst round this season (`low`/`high`) is a far better ceiling
    // than an abstract statistical bound — someone whose worst round all
    // year is 93 shouldn't suddenly blow up into the high 90s just because
    // the random draw ran hot. Rescale the round's deviations from par
    // (keeping their hole-to-hole shape) so the total lands inside
    // [low, high] with a small buffer for a rare new personal best/worst,
    // falling back to a stats-only bound for players with no logged rounds.
    const rawTotal = rawHoles.reduce((s, x) => s + x, 0);
    const lo = p.low != null ? p.low - 2 : avg - sd * 2.5;
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

  // ============ DRAFT ORDER ============
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

  document.getElementById("coin-flip-btn").addEventListener("click", () => {
    const btn = document.getElementById("coin-flip-btn");
    btn.disabled = true;
    let flips = 0;
    const resultEl = document.getElementById("coin-result");
    const flipInterval = setInterval(() => {
      resultEl.textContent = Math.random() < 0.5 ? `Team ${captains.team1.teamLabel}...` : `Team ${captains.team2.teamLabel}...`;
      flips++;
      if (flips > 8) {
        clearInterval(flipInterval);
        const first = Math.random() < 0.5 ? "team1" : "team2";
        const firstLabel = first === "team1" ? captains.team1.teamLabel : captains.team2.teamLabel;
        resultEl.textContent = `Team ${firstLabel} picks first!`;
        state.order = buildSnakeOrder(first, state.available.length);
        state.started = true;
        document.getElementById("draft-section").style.display = "";
        renderAll();
        document.getElementById("draft-section").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  });

  // ============ DRAFT RENDER ============
  function teamPanelHTML(teamKey) {
    const c = teamKey === "team1" ? captains.team1 : captains.team2;
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

  function currentTeam() {
    return state.order[state.pickIndex];
  }

  function draftComplete() {
    return state.order.length > 0 && state.pickIndex >= state.order.length;
  }

  function renderTurnBanner() {
    const el = document.getElementById("turn-banner");
    if (draftComplete()) {
      el.textContent = "Draft complete! Now set your pairings below.";
      el.className = "turn-banner t1";
      document.getElementById("pairings-section").style.display = "";
      document.getElementById("simulate-cta").style.display = "";
      renderAllPairingPanels();
      return;
    }
    const team = currentTeam();
    const label = team === "team1" ? captains.team1.teamLabel : captains.team2.teamLabel;
    el.textContent = `On the clock: Team ${label} (Pick ${state.pickIndex + 1} of ${state.order.length})`;
    el.className = "turn-banner " + (team === "team1" ? "t1" : "t2");
  }

  function renderPool() {
    const ul = document.getElementById("pool-list");
    const draftEnabled = state.pickIndex < state.order.length;
    ul.innerHTML = state.available.map(p => `
      <li>
        <span><strong>#${p.rank ?? "—"}</strong> &nbsp;${p.name} <span class="pool-meta">${p.avgAll != null ? "avg " + p.avgAll : "no data"}</span></span>
        <button class="draft-btn" data-name="${p.name}" ${draftEnabled ? "" : "disabled"}>Draft</button>
      </li>`).join("");
    ul.querySelectorAll(".draft-btn").forEach(btn => {
      btn.addEventListener("click", () => draftPlayer(btn.getAttribute("data-name")));
    });
  }

  function renderAll() {
    document.getElementById("team1-panel").innerHTML = teamPanelHTML("team1");
    document.getElementById("team2-panel").innerHTML = teamPanelHTML("team2");
    renderTurnBanner();
    renderPool();
  }

  function draftPlayer(name) {
    if (state.pickIndex >= state.order.length) return;
    const idx = state.available.findIndex(p => p.name === name);
    if (idx === -1) return;
    const [player] = state.available.splice(idx, 1);
    const team = currentTeam();
    state[team].push(player);
    state.pickIndex++;
    renderAll();
    if (draftComplete()) {
      document.getElementById("pairings-section").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.getElementById("autodraft-btn").addEventListener("click", () => {
    while (state.pickIndex < state.order.length && state.available.length) {
      const player = state.available.shift();
      state[currentTeam()].push(player);
      state.pickIndex++;
    }
    renderAll();
    document.getElementById("pairings-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ============ TIERS ============
  // Top 4 (best avg score), Bottom 4 (worst avg score), everyone else = Wild Cards.
  function computeTiers(roster) {
    const sorted = roster.slice().sort((a, b) => scoreKey(a) - scoreKey(b));
    const n = sorted.length;
    const top = sorted.slice(0, 4);
    const bottom = sorted.slice(Math.max(4, n - 4));
    const wild = sorted.slice(4, Math.max(4, n - 4));
    const tierOf = new Map();
    top.forEach(p => tierOf.set(p.name, "top"));
    wild.forEach(p => tierOf.set(p.name, "wild"));
    bottom.forEach(p => tierOf.set(p.name, "bottom"));
    return { top, bottom, wild, tierOf };
  }

  const tierCache = { team1: null, team2: null };
  function tiersFor(teamKey) {
    if (!tierCache[teamKey]) tierCache[teamKey] = computeTiers(state[teamKey]);
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

  function tierCompatible(teamKey, a, b) {
    const { tierOf } = tiersFor(teamKey);
    const ta = tierOf.get(a.name), tb = tierOf.get(b.name);
    if (ta === "top" && tb === "bottom") return false;
    if (ta === "bottom" && tb === "top") return false;
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
    if (!tierCompatible(teamKey, a, b)) return false;
    if (day === 2 && wasDay1Partner(teamKey, a, b)) return false;
    return true;
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

    const playerButtons = unpaired.map(p => {
      const isSelected = selPlayer && p.name === selPlayer.name;
      const disabled = selPlayer && !isSelected && !canPair(teamKey, day, selPlayer, p);
      return `
        <button type="button" class="pair-player-btn ${isSelected ? "selected" : ""}"
          data-team="${teamKey}" data-day="${day}" data-name="${p.name}" ${disabled ? "disabled" : ""}>
          <span>${p.name}${p.isCaptain ? " (C)" : ""} ${tierBadge(tierOf.get(p.name))}</span>
          <span class="pool-meta">${p.avgAll != null ? p.avgAll : "—"}</span>
        </button>`;
    }).join("");

    const pairRows = pairs.map((pr, i) => `
      <li class="confirmed-pair-row">
        <span>${pr[0].name} &amp; ${pr[1].name}</span>
        <button type="button" class="unpair-btn" data-team="${teamKey}" data-day="${day}" data-idx="${i}" title="Unpair">&times;</button>
      </li>`).join("");

    const sitOutNote = unpaired.length === 1
      ? `<p class="sitout-note">${unpaired[0].name} sits out ${day === 1 ? "Day 1" : "Day 2"}.</p>`
      : "";

    return `
      <h4>${teamLabel}</h4>
      <div class="pair-tier-legend">${tierBadge("top")}${tierBadge("wild")}${tierBadge("bottom")}</div>
      ${unpaired.length > 1 ? `<div class="text-center pairing-autobtn"><button type="button" class="btn-outline" style="background:transparent;border:1px solid var(--masters-green);color:var(--masters-green-dark);padding:6px 16px;border-radius:999px;font-size:0.8rem;cursor:pointer;font-family:inherit;font-weight:700;" data-autopair-team="${teamKey}" data-autopair-day="${day}">Auto-Pair</button></div>` : ""}
      ${pairs.length ? `<ul class="confirmed-pairs">${pairRows}</ul>` : ""}
      ${unpaired.length > 1 ? `<div class="pair-pool">${playerButtons}</div>` : ""}
      ${sitOutNote}
    `;
  }

  function renderPairingPanel(teamKey, day) {
    const el = document.getElementById(`pair-${teamKey}-day${day}`);
    if (!el) return;
    el.innerHTML = pairingPanelHTML(teamKey, day);

    el.querySelectorAll(".pair-player-btn").forEach(btn => {
      btn.addEventListener("click", () => onPlayerClick(btn.getAttribute("data-team"), Number(btn.getAttribute("data-day")), btn.getAttribute("data-name")));
    });
    el.querySelectorAll(".unpair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        removePair(btn.getAttribute("data-team"), Number(btn.getAttribute("data-day")), Number(btn.getAttribute("data-idx")));
        renderPairingPanel(btn.getAttribute("data-team"), Number(btn.getAttribute("data-day")));
        renderOtherDayPanelIfNeeded(btn.getAttribute("data-team"), Number(btn.getAttribute("data-day")));
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

  // Matches pairs of comparable strength across teams (sorted best-to-worst on
  // both sides and zipped) so a team's top pairing doesn't draw the other
  // team's weakest pairing.
  function simulateDay(teamKey1Pairs, teamKey2Pairs, dayNum, par, hcp) {
    const sortedA = teamKey1Pairs.slice().sort((a, b) => pairStrength(a) - pairStrength(b));
    const sortedB = teamKey2Pairs.slice().sort((a, b) => pairStrength(a) - pairStrength(b));
    const n = Math.min(sortedA.length, sortedB.length);
    const matchups = [];
    for (let i = 0; i < n; i++) {
      matchups.push(simulatePairing(sortedA[i], sortedB[i], dayNum, par, hcp));
    }
    return matchups;
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
    return `
    <div class="sim-pair">
      <div class="muted" style="grid-column:1/-1; font-size:0.85rem; text-align:center;">
        Holes won: ${m.holesWonA}&nbsp;&ndash;&nbsp;${m.holesWonB}${m.halved ? ` (${m.halved} halved)` : ""}
      </div>
      <div class="sim-side ${aWin ? "win" : ""}">
        <div class="pill team1">${name1}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreA}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${m.pairA.map((p, i) => `<div>${p.name} (solo pace ${m.scoreA[i]})</div>`).join("")}</div>
      </div>
      <div class="sim-vs" style="color:${pointsColor}; font-weight:700;">${pointsDisplay}</div>
      <div class="sim-side ${bWin ? "win" : ""}">
        <div class="pill team2">${name2}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreB}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${m.pairB.map((p, i) => `<div>${p.name} (solo pace ${m.scoreB[i]})</div>`).join("")}</div>
      </div>
    </div>`;
  }

  function sitOutFor(teamKey, day) {
    const unpaired = unpairedPlayers(teamKey, day);
    return unpaired.length === 1 ? unpaired[0] : null;
  }

  function runSimulation() {
    if (!allPairingsComplete()) return;
    const name1 = captains.team1.teamLabel, name2 = captains.team2.teamLabel;

    const hayward = HI_DATA.courses.hayward, bigFish = HI_DATA.courses.bigFish;
    const day1Matchups = simulateDay(state.pairings.team1.day1, state.pairings.team2.day1, 1, hayward.par, hayward.hcp);
    const day2Matchups = simulateDay(state.pairings.team1.day2, state.pairings.team2.day2, 2, bigFish.par, bigFish.hcp);

    let total1 = 0, total2 = 0;
    [day1Matchups, day2Matchups].forEach(matchups => matchups.forEach(m => { total1 += m.pointsA; total2 += m.pointsB; }));

    const winner = total1 > total2 ? name1 : total2 > total1 ? name2 : "Tie";

    function daySection(matchups, label, dayNum) {
      const sitA = sitOutFor("team1", dayNum);
      const sitB = sitOutFor("team2", dayNum);
      const sitOutNote = [];
      if (sitA) sitOutNote.push(`${sitA.name} (Team ${name1}) sits out`);
      if (sitB) sitOutNote.push(`${sitB.name} (Team ${name2}) sits out`);
      const pts = DAY_POINTS[dayNum];
      return `
      <div class="sim-day">
        <h3>${label}</h3>
        <p class="muted" style="font-size:0.8rem; margin-top:-4px;">Win = ${pts.win} pts &middot; Draw = ${pts.draw} pt &middot; Loss = ${pts.loss} pts</p>
        ${matchups.map(m => pairingHTML(m, name1, name2)).join("")}
        ${sitOutNote.length ? `<p class="muted" style="font-size:0.82rem;">${sitOutNote.join(" · ")}</p>` : ""}
      </div>`;
    }

    const html = `
      <div class="winner-banner">
        <div class="muted" style="color: var(--fairway); text-transform:uppercase; letter-spacing:.15em; font-size:0.8rem;">Projected Winner</div>
        <h2>Team ${winner}</h2>
        <p style="color: var(--fairway); font-size:1.1rem;">Final Score: Team ${name1} ${total1} &ndash; Team ${name2} ${total2}</p>
      </div>
      <div class="section" style="margin-top:28px;">
        ${daySection(day1Matchups, "Day 1 — Hayward Golf Course (2v2 Scramble)", 1)}
        ${daySection(day2Matchups, "Day 2 — Big Fish Golf Club (2v2 Scramble)", 2)}
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
})();
