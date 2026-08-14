/* Hayward Invitational — Simulation page: lets the user pick matchups (the
   Matchup Chooser — which team1 pair faces which team2 pair, within a
   tier) and then runs the weekend simulation against whatever's currently
   chosen, rendering results including a Day 1 / Day 2 / Combined
   scoreboard. Rosters/pairings themselves stay read-only on the Rosters
   page — only the cross-team matchup is editable, and only here. See
   js/pairings-engine.js for the shared, DOM-free data this builds on. */

(function () {
  const captains = PairingsEngine.captains;
  const fixedPairings = PairingsEngine.fixedPairings;
  const fixedPairLabel = PairingsEngine.fixedPairLabel;
  // Unfilled (null) on a genuinely fresh visit — matchups don't exist
  // until Auto-Match is pressed. Only non-null here if something was
  // already saved from an earlier visit/edit on this same page.
  let matchOrder = PairingsEngine.loadSavedMatchOrder();

  // ============ MATCHUP CHOOSER ============
  // Lets the user pick which team1 pair faces which team2 pair, within a
  // tier, on top of the fixed pairings2026 partnerships (those stay
  // read-only on the Rosters page — this only reorders who plays whom).
  // Stored as a permutation (matchOrder) so an edit is always a swap,
  // never a partial/duplicate state — that's what makes the tier-lock and
  // one-to-one constraints impossible to violate rather than something to
  // check for. Every change is saved to localStorage so a page reload or
  // later visit picks it back up. Starts unfilled (matchOrder === null):
  // each row shows "Not yet matched" instead of a dropdown until
  // Auto-Match generates the tier-locked, strength-matched starting point
  // — after that, individual matchups can still be swapped freely.
  function matchupRowHTML(day, tier, i, pairA, tierB, order) {
    if (!order) {
      return `
        <li class="matchup-row">
          <span class="pill team1">${fixedPairLabel(pairA)}</span>
          <span class="matchup-vs">vs</span>
          <span class="muted matchup-unfilled">Not yet matched</span>
        </li>`;
    }
    const options = tierB.map((pairB, j) =>
      `<option value="${j}" ${order[i] === j ? "selected" : ""}>${fixedPairLabel(pairB)}</option>`
    ).join("");
    return `
      <li class="matchup-row">
        <span class="pill team1">${fixedPairLabel(pairA)}</span>
        <span class="matchup-vs">vs</span>
        <select class="matchup-select" data-day="${day}" data-tier="${tier}" data-idx="${i}"
          ${tierB.length <= 1 ? "disabled" : ""}>${options}</select>
      </li>`;
  }

  function matchupTierHTML(day, tier, label) {
    const tierA = fixedPairings.team1[day][tier];
    const tierB = fixedPairings.team2[day][tier];
    if (!tierA.length) return "";
    const order = matchOrder ? matchOrder[day][tier] : null;
    const rows = tierA.map((pairA, i) => matchupRowHTML(day, tier, i, pairA, tierB, order)).join("");
    return `<p class="pairing-tier-label">${label}</p><ul class="matchup-rows">${rows}</ul>`;
  }

  function renderMatchupPanel(day) {
    const el = document.getElementById(`matchups-${day}`);
    if (!el) return;
    el.innerHTML = matchupTierHTML(day, "upper", "Upper Tier") + matchupTierHTML(day, "bottom", "Bottom Tier");
    el.querySelectorAll(".matchup-select").forEach(sel => {
      sel.addEventListener("change", () => {
        onMatchupChange(
          sel.getAttribute("data-day"),
          sel.getAttribute("data-tier"),
          Number(sel.getAttribute("data-idx")),
          Number(sel.value)
        );
      });
    });
  }

  function renderAllMatchupPanels() {
    renderMatchupPanel("day1");
    renderMatchupPanel("day2");
  }

  // Swaps two team1 rows' opponents so `order` stays a permutation at every
  // step: whoever currently has newIdx trades with row i's old value.
  function onMatchupChange(day, tier, i, newIdx) {
    const order = matchOrder[day][tier];
    const oldIdx = order[i];
    if (oldIdx === newIdx) return;
    const j = order.findIndex((v, idx) => idx !== i && v === newIdx);
    if (j !== -1) order[j] = oldIdx;
    order[i] = newIdx;
    PairingsEngine.saveMatchOrder(matchOrder);
    renderMatchupPanel(day);
  }

  // Generates the matchups per the site's matchup guidelines — tier-locked
  // (Upper only ever faces Upper, Bottom only ever faces Bottom) and
  // matched by comparable strength within each tier — same algorithm
  // whether this is the very first fill or a later reset back to it after
  // manual swaps.
  function autoMatch() {
    matchOrder = PairingsEngine.computeDefaultMatchOrder();
    PairingsEngine.saveMatchOrder(matchOrder);
    renderAllMatchupPanels();
    updateSimulateGate();
  }

  const autoMatchBtn = document.getElementById("auto-match-btn");
  if (autoMatchBtn) autoMatchBtn.addEventListener("click", autoMatch);

  // Simulate can't run until matchups exist — disabled on a fresh unfilled
  // visit, enabled the moment Auto-Match has been pressed (or a saved
  // matchOrder was loaded).
  function updateSimulateGate() {
    const btn = document.getElementById("simulate-btn");
    const help = document.getElementById("simulate-help");
    if (!btn) return;
    if (matchOrder) {
      btn.disabled = false;
      if (help) help.textContent = "Run this year's matchups through a simulated weekend and see who takes the Cup.";
    } else {
      btn.disabled = true;
      if (help) help.textContent = "Press Auto-Match above to set this year's matchups before simulating.";
    }
  }

  renderAllMatchupPanels();
  updateSimulateGate();

  // ============ SIMULATION MATH ============
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
    const { avg, sd: baseSd } = PairingsEngine.statsFor(p);
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

  // ============ SIMULATION ============
  // Scramble match play: each teammate plays every hole, the team's score on
  // that hole is the better (lower) of the two, and whichever team wins more
  // of the 18 individual holes wins the match (ties on a hole are halved).
  const DAY_POINTS = {
    1: { win: 2, draw: 1, loss: 0 },
    2: { win: 3, draw: 1, loss: 0 },
  };

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

  // Matches pairs within a tier according to `order` (order.upper[i] /
  // order.bottom[i] = index into pairsB's same tier that pairsA's tier-index
  // i faces) — built either by PairingsEngine's strength-sorted default or
  // by the user's own choices in the Rosters page's Matchup Chooser. Upper
  // and Bottom are always matched separately, never against each other —
  // order only ever contains same-tier indices by construction.
  function matchDayByTier(pairsA, pairsB, order, dayNum, par, hcp) {
    function zipTier(tierA, tierB, tierOrder) {
      return tierA.map((pairA, i) => simulatePairing(pairA, tierB[tierOrder[i]], dayNum, par, hcp));
    }
    return [...zipTier(pairsA.upper, pairsB.upper, order.upper), ...zipTier(pairsA.bottom, pairsB.bottom, order.bottom)];
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
    // Color the points to match whichever team won (var(--team1) blue for
    // Hagan-side, var(--team2) red for Greenblat-side); a draw stays the
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
        <div class="pill team1">Team ${name1}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreA}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${soloLines(m.pairA, m.scoreA, isShootTwiceA)}</div>
      </div>
      <div class="sim-vs" style="color:${pointsColor}; font-weight:700;">${pointsDisplay}</div>
      <div class="sim-side ${bWin ? "win" : ""}">
        <div class="pill team2">Team ${name2}</div>
        <div style="font-size:1.3rem; font-weight:700; margin-top:6px;">${m.teamScoreB}</div>
        <div class="muted" style="font-size:0.78rem; margin-top:2px;">${soloLines(m.pairB, m.scoreB, isShootTwiceB)}</div>
      </div>
    </div>`;
  }

  // Sums points/holes-won across a day's matchups for both teams. Halved
  // holes are excluded from both sides' "holes won" tallies since neither
  // team actually won them.
  function sumDay(matchups) {
    return matchups.reduce((acc, m) => {
      acc.ptsA += m.pointsA; acc.ptsB += m.pointsB;
      acc.holesA += m.holesWonA; acc.holesB += m.holesWonB;
      return acc;
    }, { ptsA: 0, ptsB: 0, holesA: 0, holesB: 0 });
  }

  // Box-score style scoreboard: one row per team, Day 1 / Day 2 / Total
  // points and holes won grouped by column — rendered right after the
  // winner banner and before the per-matchup breakdown, so the weekend's
  // outcome reads at a glance before drilling into individual pairings.
  // The winning team's entire row gets a shaded background (same "win"
  // treatment as the individual matchup cards' .sim-side.win below), but
  // only its Total Pts/Holes cells (not the per-day cells) are bolded —
  // the day-by-day numbers are just detail, the Total is the headline.
  function scoreboardHTML(day1, day2, name1, name2, total1, total2) {
    const combinedHolesA = day1.holesA + day2.holesA;
    const combinedHolesB = day1.holesB + day2.holesB;
    const rowShadeA = total1 > total2 ? "background: rgba(30,45,64,0.07);" : "";
    const rowShadeB = total2 > total1 ? "background: rgba(30,45,64,0.07);" : "";
    const totalBoldA = total1 > total2 ? "font-weight:700;" : "";
    const totalBoldB = total2 > total1 ? "font-weight:700;" : "";
    return `
    <div class="section" style="margin-top:20px;">
      <div class="section-title"><h2>Scoreboard</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th rowspan="2">Team</th>
              <th colspan="2" style="text-align:center;">Day 1</th>
              <th colspan="2" style="text-align:center;">Day 2</th>
              <th colspan="2" style="text-align:center;">Total</th>
            </tr>
            <tr>
              <th class="num">Pts</th><th class="num">Holes</th>
              <th class="num">Pts</th><th class="num">Holes</th>
              <th class="num">Pts</th><th class="num">Holes</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${rowShadeA}">
              <td><span class="pill team1">Team ${name1}</span></td>
              <td class="num">${day1.ptsA}</td><td class="num">${day1.holesA}</td>
              <td class="num">${day2.ptsA}</td><td class="num">${day2.holesA}</td>
              <td class="num" style="${totalBoldA}">${total1}</td><td class="num" style="${totalBoldA}">${combinedHolesA}</td>
            </tr>
            <tr style="${rowShadeB}">
              <td><span class="pill team2">Team ${name2}</span></td>
              <td class="num">${day1.ptsB}</td><td class="num">${day1.holesB}</td>
              <td class="num">${day2.ptsB}</td><td class="num">${day2.holesB}</td>
              <td class="num" style="${totalBoldB}">${total2}</td><td class="num" style="${totalBoldB}">${combinedHolesB}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function runSimulation() {
    if (!matchOrder) return; // guards the disabled-button state above
    const name1 = captains.team1.teamLabel, name2 = captains.team2.teamLabel;

    const hayward = HI_DATA.courses.hayward, bigFish = HI_DATA.courses.bigFish;
    const day1Matchups = matchDayByTier(fixedPairings.team1.day1, fixedPairings.team2.day1, matchOrder.day1, 1, bigFish.par, bigFish.hcp);
    const day2Matchups = matchDayByTier(fixedPairings.team1.day2, fixedPairings.team2.day2, matchOrder.day2, 2, hayward.par, hayward.hcp);

    const day1Totals = sumDay(day1Matchups);
    const day2Totals = sumDay(day2Matchups);
    const total1 = day1Totals.ptsA + day2Totals.ptsA;
    const total2 = day1Totals.ptsB + day2Totals.ptsB;

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
      ${scoreboardHTML(day1Totals, day2Totals, name1, name2, total1, total2)}
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
})();
