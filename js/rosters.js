/* Hayward Invitational — Rosters page: final rosters and read-only 2026
   pairings. The Matchup Chooser and simulation both live on the
   Simulation page (js/simulate.js) instead — see js/pairings-engine.js
   for the shared, DOM-free data both pages build from. */

(function () {
  const captains = PairingsEngine.captains;
  const state = PairingsEngine.state;
  const fixedPairings = PairingsEngine.fixedPairings;
  const fixedPairLabel = PairingsEngine.fixedPairLabel;

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

  // ============ 2026 FIXED PAIRINGS (read-only display) ============
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

  // ============ INIT ============
  renderRosters();
  renderFixedPairings();
})();
