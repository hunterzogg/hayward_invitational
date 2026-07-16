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
  scoresUpdated: "2026-07-16",

  captains: {
    team1: { name: "Hagan", full: "M. Hagan", color: "green", logo: "img/team-hagan-logo.jpg" },
    team2: { name: "Green", full: "E. Greenblat", color: "gold", logo: "img/team-greenblat-logo.jpg" },
  },

  // Current-season (2026) power rankings, pulled from the "2026" sheet's
  // "New Rank" table. Scores are full-round gross scores (18 holes).
  players2026: [
    { rank: 1, name: "Brent", avgAll: 75.9, avgLast3: 76, avgLast5: 79, high: 93, low: 68, volatility: 25, rounds: [77,77,74,74,93,73,78,82,79,76,68,73,78,76,76,71,70,75,71,77] },
    { rank: 2, name: "Glen", avgAll: 81.7, avgLast3: 83, avgLast5: 84.8, high: 90, low: 76, volatility: 14, rounds: [82,78,89,90,85,78,78,79,76] },
    { rank: 3, name: "Goetz", avgAll: 83.1, avgLast3: 82.3, avgLast5: 81.8, high: 87, low: 80, volatility: 7, rounds: [80,80,87,80,82,86,81,86,87,82] },
    { rank: 4, name: "Luke G", avgAll: 86.8, avgLast3: 85.3, avgLast5: 85.4, high: 94, low: 83, volatility: 11, rounds: [88,85,83,83,88,85,89,85,94,83,86,92] },
    { rank: 5, name: "Cedar", avgAll: 87, avgLast3: 85.7, avgLast5: 87.6, high: 93, low: 82, volatility: 11, rounds: [86,89,82,88,93,84] },
    { rank: 6, name: "Stover", avgAll: 88.5, avgLast3: 89.7, avgLast5: 87.8, high: 96, low: 83, volatility: 13, rounds: [95,87,87,84,86,92,83,90,89,89,96,87,88,86] },
    { rank: 7, name: "Drew G", avgAll: 90.5, avgLast3: 90.5, avgLast5: 90.5, high: 92, low: 89, volatility: 3, rounds: [92,89] },
    { rank: 8, name: "Jolm", avgAll: 90.7, avgLast3: 90.3, avgLast5: 89.8, high: 105, low: 82, volatility: 23, rounds: [93,87,91,89,89,83,83,85,88,92,96,94,85,105,95,102,91,92,96,87,82,91] },
    { rank: 9, name: "Chad", avgAll: 92.4, avgLast3: 95, avgLast5: 92, high: 103, low: 83, volatility: 20, rounds: [91,91,103,92,83,98,92,89] },
    { rank: 10, name: "Hagan", avgAll: 93, avgLast3: 93.7, avgLast5: 93, high: 96, low: 91, volatility: 5, rounds: [94,91,96,91] },
    { rank: 11, name: "Green", avgAll: 93.8, avgLast3: 94.3, avgLast5: 93.8, high: 99, low: 91, volatility: 8, rounds: [91,93,99,92] },
    { rank: 12, name: "Urban", avgAll: 94.8, avgLast3: 98.3, avgLast5: 94.8, high: 101, low: 89, volatility: 12, rounds: [94,101,100,90,89] },
    { rank: 13, name: "Joe P", avgAll: 95.8, avgLast3: 94.3, avgLast5: 95.8, high: 100, low: 93, volatility: 7, rounds: [96,93,94,100] },
    { rank: 14, name: "Jackie", avgAll: 102.7, avgLast3: 101, avgLast5: 101.6, high: 108, low: 98, volatility: 10, rounds: [100,105,98,99,106,108] },
    { rank: 15, name: "Joedogg", avgAll: 103, avgLast3: 103, avgLast5: 103, high: 104, low: 102, volatility: 2, rounds: [102,104] },
    { rank: 16, name: "Luke A", avgAll: 105, avgLast3: 105, avgLast5: 105, high: 107, low: 101, volatility: 6, rounds: [101,107,107] },
    { rank: 17, name: "TBD", avgAll: 109, avgLast3: 109, avgLast5: 109, high: 118, low: 100, volatility: 18, rounds: [], isPlaceholder: true },
    { rank: 18, name: "Zogg", avgAll: 110.3, avgLast3: 110.3, avgLast5: 110.3, high: 121, low: 97, volatility: 24, rounds: [121,113,97] },
    { rank: 19, name: "Munch", avgAll: 116, avgLast3: 116, avgLast5: 116, high: 120, low: 112, volatility: 8, rounds: [120,112] },
    { rank: 20, name: "Jase", avgAll: null, avgLast3: null, avgLast5: null, high: null, low: null, volatility: null, rounds: [] },
  ],

  // Prior-year average scores by nickname, for trend lines (self-consistent
  // naming within the workbook across the 2024/2025/2026 tabs).
  historicalAvg: {
    "Brent":   { y2024: 77,  y2025: 77,   y2026: 75.9 },
    "Glen":    { y2024: 80,  y2025: 80.6, y2026: 81.7 },
    "Goetz":   { y2024: 87,  y2025: 85,   y2026: 83.1 },
    "Cedar":   { y2024: 86,  y2025: 87.3, y2026: 87 },
    "Hagan":   { y2024: 90,  y2025: 89.2, y2026: 93 },
    "Stover":  { y2024: 92,  y2025: 90.2, y2026: 88.5 },
    "Chad":    { y2024: null,y2025: 93.5, y2026: 92.4 },
    "Urban":   { y2024: null,y2025: 92.3, y2026: 94.8 },
    "Joe P":   { y2024: 96,  y2025: 95,   y2026: 95.8 },
    "Jolm":    { y2024: null,y2025: 96,   y2026: 90.7 },
    "Green":   { y2024: 98,  y2025: 101,  y2026: 93.8 },
    "Jackie":  { y2024: 110, y2025: 103,  y2026: 102.7 },
    "Jase":    { y2024: 102, y2025: 105,  y2026: null },
    "Joedogg": { y2024: 100, y2025: null, y2026: 103 },
    "Munch":   { y2024: null,y2025: null, y2026: 116 },
  },

  // Career legacy records, from the PDF "Historical Summary" page.
  // Keyed by formal name as printed (Last, First initial).
  legacyRecords: [
    { name: "Ainsworth, L.",  years: 1, championships: 0, wins: 0, draws: 0, losses: 2, winPct: "0%" },
    { name: "Conlin, J.",     years: 2, championships: 2, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "Goetz, D.",      years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
    { name: "Goetz, J.",      years: 2, championships: 1, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "Goetz, L.",      years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
    { name: "Goetz, N.",      years: 2, championships: 1, wins: 1, draws: 3, losses: 0, winPct: "63%" },
    { name: "Greenblat, E.",  years: 2, championships: 1, wins: 2, draws: 0, losses: 2, winPct: "50%" },
    { name: "Hagan, M.",      years: 2, championships: 0, wins: 1, draws: 1, losses: 2, winPct: "38%" },
    { name: "Larson, J.",     years: 2, championships: 1, wins: 3, draws: 0, losses: 1, winPct: "75%" },
    { name: "Muenchow, M.",   years: 1, championships: 1, wins: 1, draws: 0, losses: 1, winPct: "50%" },
    { name: "Musser, C.",     years: 1, championships: 1, wins: 0, draws: 1, losses: 1, winPct: "25%" },
    { name: "Olmanson, J.",   years: 1, championships: 0, wins: 0, draws: 0, losses: 2, winPct: "0%" },
    { name: "Palaia, C.",     years: 2, championships: 1, wins: 1, draws: 1, losses: 2, winPct: "38%" },
    { name: "Pfaffinger, J.", years: 2, championships: 1, wins: 1, draws: 0, losses: 3, winPct: "25%" },
    { name: "Prodahl, B.",    years: 2, championships: 0, wins: 1, draws: 2, losses: 1, winPct: "50%" },
    { name: "Prodahl, G.",    years: 2, championships: 1, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "Rothstein, J.",  years: 2, championships: 2, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "Stover, M.",     years: 2, championships: 1, wins: 2, draws: 1, losses: 1, winPct: "63%" },
    { name: "Urban, A.",      years: 1, championships: 1, wins: 1, draws: 1, losses: 0, winPct: "75%" },
    { name: "Zogg, H.",       years: 0, championships: 0, wins: 0, draws: 0, losses: 0, winPct: "--" },
  ],

  // Past tournament results, from the PDF.
  pastResults: [
    {
      year: 2024, title: "1st Annual (Inaugural Year)",
      captains: { team1: "Ainsworth, L.", team2: "Conlin, J." },
      day1: { date: "August 16, 2024", course: "Hayward Golf Course", format: "Combined Score Match Play" },
      day2: { date: "August 17, 2024", course: "Big Fish Golf Club", format: "2v2 Scramble" },
      finalScore: { team1: 1.5, team2: 4.5 },
      winner: "team2",
    },
    {
      year: 2025, title: "2nd Annual",
      captains: { team1: "Goetz, N.", team2: "Palaia, C." },
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
