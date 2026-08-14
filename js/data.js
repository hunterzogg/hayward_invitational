/* Hayward Invitational — trip data
   Sourced from "3rd Annual Hayward Invitational.xlsx" and
   "Hayward Invitational - Historical Stats.pdf" */

const HI_DATA = {

  trip: {
    edition: "3rd Annual",
    year: 2026,
    dates: "August 21–22, 2026",
    location: "Hayward, Wisconsin",
  },

  // Bump this whenever players2026 scores/rounds are updated with fresh
  // data — it drives the "last updated" indicator on the Power Rankings page.
  scoresUpdated: "2026-08-12",

  // Bump this whenever players2026 prevRank/prevVibesRank snapshots are
  // refreshed (i.e. whenever rank/vibes data is republished) — drives future
  // rank-movement recalculation. See the "Recent Change" note above players2026.
  rankingsUpdated: "2026-08-12",

  captains: {
    // `teamLabel` is the short surname used for team branding ("Team Hagan")
    // throughout the draft/pairing UI. `name` is the standardized full
    // display name (F. Last) and MUST exactly match that player's `name`
    // in players2026 below, since draft.js looks players up by this value.
    team1: { teamLabel: "Hagan", name: "M. Hagan", color: "green", logo: "img/team-hagan-logo.jpg" },
    team2: { teamLabel: "Greenblat", name: "E. Greenblat", color: "gold", logo: "img/team-greenblat-logo.jpg" },
  },

  // Real 2026 draft results (picks after each captain was auto-assigned to
  // their own team), in actual draft-pick order. Captains themselves are
  // added separately in draft.js via captainAsPlayer() — don't list them
  // here. The mock-draft page no longer runs a live draft (the real one
  // already happened); it seeds team rosters straight from this block. Kept
  // as data rather than hardcoded in draft.js so a future year's refresh
  // only has to touch this one place. See js/draft.js's seedFinalRosters().
  draftResults2026: {
    team1: ["G. Prodahl", "N. Goetz", "D. Goetz", "J. Olmanson", "A. Urban", "J. Pfaffinger", "J. Larson", "M. Muenchow"], // Team Hagan
    team2: ["B. Prodahl", "C. Palaia", "L. Goetz", "M. Stover", "C. Musser", "J. Conlin", "L. Ainsworth", "J. Goetz", "H. Zogg"], // Team Greenblat
  },

  // Final 2026 pairings, set directly by each captain ahead of the trip
  // (from the "2026 Pairings" graphic) — this year's pairings are fixed,
  // not chosen interactively on the site. See js/draft.js: the old
  // pairing-picker UI (tiers, Auto-Pair, "2x" shoot-twice buttons) has been
  // archived/unwired in favor of just simulating these fixed matchups. Each
  // entry is { tier, pairs }, tier is "upper" or "bottom" (matches the
  // graphic's "Upper Tier"/"Bottom Tier" grouping and is how cross-team
  // matchups are made — Upper plays Upper, Bottom plays Bottom, matched by
  // comparable strength within that tier). A pair is [name, name]; a player
  // shooting twice (self-pair) is [name, name] with the same name twice —
  // Team Hagan's 9-player roster is odd, so one player shoots twice each
  // day (M. Muenchow on Day 1, A. Urban on Day 2).
  pairings2026: {
    team1: {
      day1: {
        upper: [["G. Prodahl", "D. Goetz"], ["N. Goetz", "J. Olmanson"], ["M. Hagan", "A. Urban"]],
        bottom: [["J. Pfaffinger", "J. Larson"], ["M. Muenchow", "M. Muenchow"]],
      },
      day2: {
        upper: [["N. Goetz", "D. Goetz"], ["G. Prodahl", "J. Olmanson"]],
        bottom: [["A. Urban", "A. Urban"], ["J. Larson", "M. Hagan"], ["J. Pfaffinger", "M. Muenchow"]],
      },
    },
    team2: {
      day1: {
        upper: [["B. Prodahl", "L. Goetz"], ["E. Greenblat", "M. Stover"], ["C. Palaia", "C. Musser"]],
        bottom: [["J. Conlin", "H. Zogg"], ["J. Goetz", "L. Ainsworth"]],
      },
      day2: {
        upper: [["B. Prodahl", "M. Stover"], ["C. Palaia", "L. Goetz"]],
        bottom: [["E. Greenblat", "L. Ainsworth"], ["C. Musser", "H. Zogg"], ["J. Goetz", "J. Conlin"]],
      },
    },
  },

  // Current-season (2026) power rankings, pulled from the "2026" sheet's
  // "New Rank" table. Scores are full-round gross scores (18 holes).
  //
  // Names are standardized site-wide as "F. Last" (first initial + last
  // name), confirmed directly by the user — see Assets/handoff.md for the
  // nickname-to-full-name mapping this replaced.
  //
  // `vibes`: a 0-10 subjective "vibes" score, supplied directly by the user
  // (not derived from any performance data).
  //
  // `prevRank`: this player's rank the last time rankings were published,
  // counted only among real (non-placeholder) players, 1-19. Used to compute
  // the avgAll "Recent Change" column (prevRank - current real-players-only
  // avgAll rank).
  //
  // `prevVibesRank`: same idea, but for the Vibes leaderboard (rank 1 =
  // highest vibes), counted among the same real-players-only pool. Used to
  // compute "Recent Change" when the table is sorted by Vibes instead of
  // Avg (All) — see rankings.html, which recomputes both the Rank badge and
  // the Recent Change delta against whichever column is currently sorted.
  //
  // When you refresh scores/ranks/vibes in the future, for BOTH of these:
  // set each player's `prevRank`/`prevVibesRank` to their rank AS OF THIS
  // CURRENT snapshot (i.e. shift the current values into the prev* fields
  // before overwriting rank/vibes/scores with the new data) — that's what
  // makes next time's "Recent Change" column correct in both sort modes.
  // TBD has no prevRank/prevVibesRank (new to the list, no vibes score).
  players2026: [
    { rank: 1, name: "B. Prodahl", avgAll: 76, avgLast3: 77.3, avgLast5: 76.4, high: 93, low: 68, volatility: 25, vibes: 9.2, prevRank: 1, prevVibesRank: 2, rounds: [77,76,79,73,77,77,74,74,93,73,78,82,79,76,68,73,78,76,76,71,70,75,71,77] },
    { rank: 2, name: "G. Prodahl", avgAll: 81.7, avgLast3: 82, avgLast5: 82.6, high: 90, low: 76, volatility: 14, vibes: 6.2, prevRank: 2, prevVibesRank: 13, rounds: [83,81,82,78,89,90,85,78,78,79,76] },
    { rank: 3, name: "N. Goetz", avgAll: 82.8, avgLast3: 82, avgLast5: 81.2, high: 87, low: 80, volatility: 7, vibes: 8.3, prevRank: 3, prevVibesRank: 3, rounds: [81,84,81,80,80,87,80,82,86,81,86,87,82] },
    { rank: 4, name: "D. Goetz", avgAll: 86.3, avgLast3: 85.3, avgLast5: 86.3, high: 92, low: 79, volatility: 13, vibes: 5.8, prevRank: 4, prevVibesRank: 15, rounds: [79,85,92,89] },
    { rank: 5, name: "L. Goetz", avgAll: 87, avgLast3: 88.3, avgLast5: 86.6, high: 94, low: 83, volatility: 11, vibes: 7.8, prevRank: 5, prevVibesRank: 8, rounds: [90,87,88,85,83,83,88,85,89,85,94,83,86,92] },
    { rank: 6, name: "C. Palaia", avgAll: 87.4, avgLast3: 88.3, avgLast5: 87, high: 93, low: 82, volatility: 11, vibes: 3.1, prevRank: 6, prevVibesRank: 18, rounds: [90,86,89,82,88,93,84] },
    { rank: 7, name: "J. Olmanson", avgAll: 88.4, avgLast3: 86, avgLast5: 83, high: 105, low: 77, volatility: 28, vibes: 9.3, prevRank: 8, prevVibesRank: 1, rounds: [83,85,90,80,77,81,80,93,87,91,89,89,83,83,85,88,92,96,94,85,105,95,102,91,92,87,82,91] },
    { rank: 8, name: "M. Stover", avgAll: 88.5, avgLast3: 90, avgLast5: 89.8, high: 96, low: 83, volatility: 13, vibes: 3.0, prevRank: 7, prevVibesRank: 19, rounds: [86,91,93,84,95,87,87,84,86,92,83,90,89,89,96,87,88,86] },
    { rank: 9, name: "C. Musser", avgAll: 90, avgLast3: 84, avgLast5: 89.2, high: 103, low: 75, volatility: 28, vibes: 0.1, prevRank: 9, prevVibesRank: 17, rounds: [86,75,91,91,103,92,83,98,92,89] },
    { rank: 10, name: "M. Hagan", avgAll: 93, avgLast3: 93.7, avgLast5: 93, high: 96, low: 91, volatility: 5, vibes: 8.3, prevRank: 10, prevVibesRank: 9, rounds: [94,91,96,91] },
    { rank: 11, name: "E. Greenblat", avgAll: 93.7, avgLast3: 92.7, avgLast5: 94, high: 99, low: 91, volatility: 8, vibes: 7.3, prevRank: 11, prevVibesRank: 10, rounds: [91,96,91,93,99,92] },
    { rank: 12, name: "J. Pfaffinger", avgAll: 94.6, avgLast3: 93, avgLast5: 94.6, high: 100, low: 90, volatility: 10, vibes: 7.4, prevRank: 12, prevVibesRank: 7, rounds: [90,96,93,94,100] },
    { rank: 13, name: "A. Urban", avgAll: 94.8, avgLast3: 98.3, avgLast5: 94.8, high: 101, low: 89, volatility: 12, vibes: 4.0, prevRank: 13, prevVibesRank: 16, rounds: [94,101,100,90,89] },
    { rank: 14, name: "J. Conlin", avgAll: 101.7, avgLast3: 100.3, avgLast5: 99.6, high: 108, low: 96, volatility: 12, vibes: 7.0, prevRank: 14, prevVibesRank: 12, rounds: [96,100,105,98,99,106,108] },
    { rank: 15, name: "J. Larson", avgAll: 103, avgLast3: 103, avgLast5: 103, high: 104, low: 102, volatility: 2, vibes: 6.5, prevRank: 15, prevVibesRank: 11, rounds: [102,104] },
    { rank: 16, name: "L. Ainsworth", avgAll: 105.8, avgLast3: 105.3, avgLast5: 105.8, high: 108, low: 101, volatility: 7, vibes: 9.2, prevRank: 16, prevVibesRank: 4, rounds: [108,101,107,107] },
    { rank: 17, name: "H. Zogg", avgAll: 109.2, avgLast3: 113.7, avgLast5: 110.2, high: 121, low: 97, volatility: 24, vibes: 8.6, prevRank: 17, prevVibesRank: 6, rounds: [115,105,121,113,97,104] },
    { rank: 18, name: "M. Muenchow", avgAll: 113.3, avgLast3: 113.3, avgLast5: 113.3, high: 120, low: 108, volatility: 12, vibes: 8.4, prevRank: 18, prevVibesRank: 5, rounds: [120,112,108] },
    { rank: 19, name: "J. Goetz", avgAll: null, avgLast3: null, avgLast5: null, high: null, low: null, volatility: null, vibes: 6.0, prevRank: 19, prevVibesRank: 14, rounds: [] },
  ],

  // Prior-year average scores by standardized name, for trend lines
  // (self-consistent naming within the workbook across the 2024/2025/2026
  // tabs — see players2026 note above on the name standardization).
  historicalAvg: {
    "B. Prodahl":   { y2024: 77,  y2025: 77,   y2026: 76 },
    "G. Prodahl":   { y2024: 80,  y2025: 80.6, y2026: 81.7 },
    "N. Goetz":     { y2024: 87,  y2025: 85,   y2026: 82.8 },
    "C. Palaia":    { y2024: 86,  y2025: 87.3, y2026: 87.4 },
    "M. Hagan":     { y2024: 90,  y2025: 89.2, y2026: 93 },
    "M. Stover":    { y2024: 92,  y2025: 90.2, y2026: 88.5 },
    "C. Musser":    { y2024: null,y2025: 93.5, y2026: 90 },
    "A. Urban":     { y2024: null,y2025: 92.3, y2026: 94.8 },
    "J. Pfaffinger":{ y2024: 96,  y2025: 95,   y2026: 94.6 },
    "J. Olmanson":  { y2024: null,y2025: 96,   y2026: 88.4 },
    "E. Greenblat": { y2024: 98,  y2025: 101,  y2026: 93.7 },
    "J. Conlin":    { y2024: 110, y2025: 103,  y2026: 101.7 },
    "J. Goetz":     { y2024: 102, y2025: 105,  y2026: null },
    "J. Larson":    { y2024: 100, y2025: null, y2026: 103 },
    "M. Muenchow":  { y2024: null,y2025: null, y2026: 113.3 },
  },

  // Career legacy records, from the PDF "Historical Summary" page.
  // Reformatted to the same "F. Last" standard as players2026 (originally
  // printed "Last, First initial" — this is a pure format flip of data we
  // already had, not a new name guess).
  legacyRecords: [
    { name: "L. Ainsworth",  years: 1, championships: 0, wins: 0, draws: 0, losses: 2, winPct: "0%" },
    { name: "J. Conlin",     years: 2, championships: 2, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "D. Goetz",      years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
    { name: "J. Goetz",      years: 2, championships: 1, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "L. Goetz",      years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
    { name: "N. Goetz",      years: 2, championships: 1, wins: 1, draws: 3, losses: 0, winPct: "63%" },
    { name: "E. Greenblat",  years: 2, championships: 1, wins: 2, draws: 0, losses: 2, winPct: "50%" },
    { name: "M. Hagan",      years: 2, championships: 0, wins: 1, draws: 1, losses: 2, winPct: "38%" },
    { name: "J. Larson",     years: 2, championships: 1, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "M. Muenchow",   years: 1, championships: 1, wins: 1, draws: 0, losses: 1, winPct: "50%" },
    { name: "C. Musser",     years: 1, championships: 1, wins: 0, draws: 1, losses: 1, winPct: "25%" },
    { name: "J. Olmanson",   years: 1, championships: 0, wins: 0, draws: 0, losses: 2, winPct: "0%" },
    { name: "C. Palaia",     years: 2, championships: 1, wins: 1, draws: 1, losses: 2, winPct: "38%" },
    { name: "J. Pfaffinger", years: 2, championships: 1, wins: 1, draws: 0, losses: 3, winPct: "25%" },
    { name: "B. Prodahl",    years: 2, championships: 0, wins: 1, draws: 2, losses: 1, winPct: "50%" },
    { name: "G. Prodahl",    years: 2, championships: 1, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "J. Rothstein",  years: 2, championships: 2, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "M. Stover",     years: 2, championships: 1, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "A. Urban",      years: 1, championships: 1, wins: 1, draws: 1, losses: 0, winPct: "75%" },
    { name: "H. Zogg",       years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
  ],

  // Past tournament results, from the PDF. Captain names reformatted to the
  // same "F. Last" standard (pure format flip, same source data as before).
  pastResults: [
    {
      year: 2024, title: "1st Annual (Inaugural Year)",
      captains: { team1: "L. Ainsworth", team2: "J. Conlin" },
      day1: { date: "August 16, 2024", course: "Hayward Golf Course", format: "Combined Score Match Play" },
      day2: { date: "August 17, 2024", course: "Big Fish Golf Club", format: "2v2 Scramble" },
      finalScore: { team1: 1.5, team2: 4.5 },
      winner: "team2",
    },
    {
      year: 2025, title: "2nd Annual",
      captains: { team1: "N. Goetz", team2: "C. Palaia" },
      day1: { date: "August 22, 2025", course: "Big Fish Golf Club", format: "Combined Score Match Play" },
      day2: { date: "August 23, 2025", course: "Hayward Golf Course", format: "2v2 Scramble" },
      finalScore: { team1: 3.0, team2: 5.0 },
      winner: "team2",
    },
  ],

  // Course data
  courses: {
    bigFish: {
      name: "Big Fish Golf Club",
      location: "14122 W True North Lane, Hayward, WI 54843",
      designer: "Pete Dye",
      blurb: "A Pete Dye–designed championship layout blending classic links-style golf with the beauty of the Northwoods. The front nine plays as a traditional links layout with pot bunkers; the back nine is cut into the woodlands with dramatic elevation and views. Ranked among the top public courses in Wisconsin.",
      amenities: ["Dye Hards Restaurant", "Golf simulator", "Driving range", "Pro shop", "Event center"],
      par: [4,5,3,4,4,4,5,4,3,4,4,3,5,4,4,3,5,4],
      yardageGreen: [378,525,149,437,337,410,514,385,123,362,345,174,487,398,464,179,524,417],
      yardageWhite: [332,513,137,387,315,394,484,346,104,347,285,149,475,351,420,171,490,384],
      hcp: [18,2,16,6,8,10,4,14,12,15,17,13,7,11,3,9,1,5],
      ratingGreen: "71.7/130",
      ratingWhite: "69.6/127",
      source: "Big Fish Country Club member scorecard (3rd Annual Hayward Invitational workbook) and bigfishgc.com",
      mapImage: { src: "img/bigfish-map.png", alt: "Map of Big Fish Golf Club showing the clubhouse and holes 1 and 9-18", attribution: "Map data © OpenStreetMap contributors" },
      photos: [
        { src: "img/bigfish-aerial.jpg", alt: "Aerial drone view of a Big Fish Golf Club hole, fairway winding through the Northwoods" },
        { src: "img/bigfish-course.jpg", alt: "Golden-hour view down a Big Fish Golf Club fairway" },
      ],
    },
    hayward: {
      name: "Hayward Golf Course",
      location: "16005 W Radio Hill Road, Hayward, WI 54843",
      designer: null,
      blurb: "Celebrating over 100 years of operation (est. 1924), Hayward Golf Course is a 4-star (Golf Digest) public course and a centerpiece of the local resort community — challenging for the good golfer, and charitable to the average and beginner golfer, with immaculate grooming and Northwoods scenery.",
      amenities: ["Caddyshak Bar & Grill", "Golf simulator", "Pro shop", "Practice facilities", "Event hosting"],
      par: [4,4,3,5,4,4,4,3,5,4,4,3,5,3,5,4,4,4],
      yardageBlack: [382,336,173,508,376,441,422,186,532,451,395,210,495,164,512,285,395,386],
      yardageBlue: [376,330,167,496,360,427,409,174,519,430,389,197,488,155,504,280,388,370],
      yardageWhite: [368,320,157,464,325,394,369,147,500,389,380,167,468,142,460,273,378,363],
      hcp: [11,15,13,5,7,3,1,17,9,10,6,14,8,16,4,18,12,2],
      ratingBlack: "72.1/132",
      ratingBlue: "71.6/130",
      ratingWhite: "69.8/126",
      source: "Official Hayward Golf Course scorecard (as of April 2025), haywardgolf.com",
      mapEmbed: "https://www.google.com/maps?q=Hayward+Golf+Course,16005+W+Radio+Hill+Rd,Hayward,WI+54843&t=k&z=15&output=embed",
      mapImage: { src: "img/hayward-map.png", alt: "Hayward Golf Course routing map showing all 18 holes, from the club's official scorecard" },
      photos: [
        { src: "img/hayward-course.jpeg", alt: "Sunset over a pond at Hayward Golf Course" },
        { src: "img/hayward-photo2.jpg", alt: "Reflection of the Northwoods tree line in a Hayward Golf Course pond" },
      ],
    },
  },
};
