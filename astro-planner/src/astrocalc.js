// Astronomy calculation utilities and target database

// ============================================
// CONSTANTS
// ============================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ============================================
// TARGET DATABASE
// ============================================

// Target types
export const TARGET_TYPES = {
  GALAXY: 'Galaxy',
  EMISSION_NEBULA: 'Emission Nebula',
  PLANETARY_NEBULA: 'Planetary Nebula',
  REFLECTION_NEBULA: 'Reflection Nebula',
  DARK_NEBULA: 'Dark Nebula',
  SUPERNOVA_REMNANT: 'Supernova Remnant',
  OPEN_CLUSTER: 'Open Cluster',
  GLOBULAR_CLUSTER: 'Globular Cluster',
  STAR: 'Star',
  DOUBLE_STAR: 'Double Star',
  ASTERISM: 'Asterism',
  MILKY_WAY: 'Milky Way Region'
};

// Difficulty ratings based on surface brightness and size
export const DIFFICULTY = {
  EASY: 'Easy',
  MODERATE: 'Moderate', 
  CHALLENGING: 'Challenging',
  EXPERT: 'Expert'
};

// Focal length recommendations
export const FOCAL_LENGTH = {
  WIDE: 'Wide Field (14-50mm)',      // Nikon 20mm, large MW regions
  SHORT: 'Short (200-400mm)',         // Seestar, RedCat range
  MEDIUM: 'Medium (400-800mm)',       // Evostar 72ED, Askar V
  LONG: 'Long (800mm+)'               // Larger scopes
};

// Deep Sky Object Database
// RA in decimal hours, Dec in decimal degrees
export const DSO_DATABASE = [
  // ==========================================
  // GALAXIES
  // ==========================================
  {
    id: 'M31',
    name: 'Andromeda Galaxy',
    altNames: ['NGC 224'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Andromeda',
    ra: 0.712,
    dec: 41.269,
    magnitude: 3.4,
    size: { width: 190, height: 60 }, // arcminutes
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Nearest major galaxy, stunning spiral structure. So large it benefits from wider fields.',
    tags: ['showpiece', 'beginner', 'fall']
  },
  {
    id: 'M33',
    name: 'Triangulum Galaxy',
    altNames: ['NGC 598'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Triangulum',
    ra: 1.564,
    dec: 30.660,
    magnitude: 5.7,
    size: { width: 73, height: 45 },
    bestMonths: [9, 10, 11, 12],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Face-on spiral with HII regions. Low surface brightness requires dark skies.',
    tags: ['fall', 'face-on']
  },
  {
    id: 'M51',
    name: 'Whirlpool Galaxy',
    altNames: ['NGC 5194'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Canes Venatici',
    ra: 13.498,
    dec: 47.195,
    magnitude: 8.4,
    size: { width: 11, height: 7 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Classic face-on spiral with companion NGC 5195. Great for showing spiral arms.',
    tags: ['showpiece', 'spring', 'face-on', 'interacting']
  },
  {
    id: 'M81',
    name: "Bode's Galaxy",
    altNames: ['NGC 3031'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Ursa Major',
    ra: 9.926,
    dec: 69.065,
    magnitude: 6.9,
    size: { width: 27, height: 14 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Grand design spiral, often imaged with M82. Bright and well-defined.',
    tags: ['spring', 'pair']
  },
  {
    id: 'M82',
    name: 'Cigar Galaxy',
    altNames: ['NGC 3034'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Ursa Major',
    ra: 9.932,
    dec: 69.680,
    magnitude: 8.4,
    size: { width: 11, height: 5 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Starburst galaxy with dramatic hydrogen outflows. Often paired with M81.',
    tags: ['spring', 'starburst', 'pair']
  },
  {
    id: 'M101',
    name: 'Pinwheel Galaxy',
    altNames: ['NGC 5457'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Ursa Major',
    ra: 14.053,
    dec: 54.349,
    magnitude: 7.9,
    size: { width: 29, height: 27 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Large face-on spiral. Low surface brightness but impressive detail possible.',
    tags: ['spring', 'face-on', 'large']
  },
  {
    id: 'M104',
    name: 'Sombrero Galaxy',
    altNames: ['NGC 4594'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Virgo',
    ra: 12.666,
    dec: -11.623,
    magnitude: 8.0,
    size: { width: 9, height: 4 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Edge-on spiral with prominent dust lane and bright nucleus.',
    tags: ['spring', 'edge-on', 'showpiece']
  },
  {
    id: 'M63',
    name: 'Sunflower Galaxy',
    altNames: ['NGC 5055'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Canes Venatici',
    ra: 13.264,
    dec: 42.029,
    magnitude: 8.6,
    size: { width: 13, height: 8 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Flocculent spiral with patchy arms. Nice detail in longer exposures.',
    tags: ['spring']
  },
  {
    id: 'M64',
    name: 'Black Eye Galaxy',
    altNames: ['NGC 4826'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Coma Berenices',
    ra: 12.944,
    dec: 21.683,
    magnitude: 8.5,
    size: { width: 10, height: 5 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Distinctive dark dust band gives this galaxy its name.',
    tags: ['spring']
  },
  {
    id: 'M65',
    name: 'M65',
    altNames: ['NGC 3623'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Leo',
    ra: 11.316,
    dec: 13.092,
    magnitude: 9.3,
    size: { width: 8, height: 2 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Part of the Leo Triplet with M66 and NGC 3628.',
    tags: ['spring', 'triplet']
  },
  {
    id: 'M66',
    name: 'M66',
    altNames: ['NGC 3627'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Leo',
    ra: 11.338,
    dec: 12.992,
    magnitude: 8.9,
    size: { width: 9, height: 4 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Brightest of the Leo Triplet. Distorted arms from gravitational interaction.',
    tags: ['spring', 'triplet']
  },
  {
    id: 'NGC3628',
    name: 'Hamburger Galaxy',
    altNames: ['Sarah\'s Galaxy'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Leo',
    ra: 11.336,
    dec: 13.589,
    magnitude: 9.5,
    size: { width: 15, height: 4 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Edge-on spiral completing the Leo Triplet. Prominent dust lane.',
    tags: ['spring', 'triplet', 'edge-on']
  },
  {
    id: 'M106',
    name: 'M106',
    altNames: ['NGC 4258'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Canes Venatici',
    ra: 12.316,
    dec: 47.304,
    magnitude: 8.4,
    size: { width: 19, height: 8 },
    bestMonths: [3, 4, 5, 6],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Seyfert galaxy with anomalous spiral arms. Active galactic nucleus.',
    tags: ['spring']
  },
  {
    id: 'NGC891',
    name: 'NGC 891',
    altNames: ['Silver Sliver Galaxy'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Andromeda',
    ra: 2.377,
    dec: 42.349,
    magnitude: 9.9,
    size: { width: 14, height: 3 },
    bestMonths: [10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Beautiful edge-on spiral with prominent dust lane. Often compared to what Milky Way might look like.',
    tags: ['fall', 'edge-on']
  },
  {
    id: 'NGC7331',
    name: 'NGC 7331',
    altNames: ['Deer Lick Group'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Pegasus',
    ra: 22.618,
    dec: 34.416,
    magnitude: 9.5,
    size: { width: 11, height: 4 },
    bestMonths: [9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Often called the Milky Way\'s twin. Surrounded by smaller galaxies.',
    tags: ['fall']
  },
  {
    id: 'NGC2903',
    name: 'NGC 2903',
    altNames: [],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Leo',
    ra: 9.535,
    dec: 21.501,
    magnitude: 9.0,
    size: { width: 13, height: 6 },
    bestMonths: [2, 3, 4],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Barred spiral often overlooked. Comparable to M109 in detail.',
    tags: ['spring', 'barred']
  },
  {
    id: 'M77',
    name: 'Cetus A',
    altNames: ['NGC 1068'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Cetus',
    ra: 2.711,
    dec: -0.014,
    magnitude: 8.9,
    size: { width: 7, height: 6 },
    bestMonths: [10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Active Seyfert galaxy with bright nucleus.',
    tags: ['fall']
  },
  {
    id: 'M74',
    name: 'Phantom Galaxy',
    altNames: ['NGC 628'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Pisces',
    ra: 1.611,
    dec: 15.783,
    magnitude: 9.4,
    size: { width: 11, height: 10 },
    bestMonths: [10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Face-on grand design spiral. Low surface brightness makes it challenging.',
    tags: ['fall', 'face-on', 'challenging']
  },
  
  // ==========================================
  // EMISSION NEBULAE
  // ==========================================
  {
    id: 'M42',
    name: 'Orion Nebula',
    altNames: ['NGC 1976', 'Great Orion Nebula'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Orion',
    ra: 5.588,
    dec: -5.390,
    magnitude: 4.0,
    size: { width: 85, height: 60 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'The showpiece of the winter sky. Incredible detail at any focal length.',
    tags: ['showpiece', 'beginner', 'winter', 'bright']
  },
  {
    id: 'M43',
    name: 'De Mairan\'s Nebula',
    altNames: ['NGC 1982'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Orion',
    ra: 5.593,
    dec: -5.267,
    magnitude: 9.0,
    size: { width: 20, height: 15 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Part of the Orion Nebula complex, just north of M42.',
    tags: ['winter']
  },
  {
    id: 'IC434',
    name: 'Horsehead Nebula',
    altNames: ['Barnard 33'],
    type: TARGET_TYPES.DARK_NEBULA,
    constellation: 'Orion',
    ra: 5.678,
    dec: -2.458,
    magnitude: 6.8,
    size: { width: 60, height: 10 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Iconic dark nebula silhouetted against emission nebula IC 434. Often includes Flame Nebula.',
    tags: ['winter', 'iconic', 'dark nebula']
  },
  {
    id: 'NGC2024',
    name: 'Flame Nebula',
    altNames: [],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Orion',
    ra: 5.679,
    dec: -1.849,
    magnitude: 2.0,
    size: { width: 30, height: 30 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Bright emission nebula near Alnitak. Often imaged with Horsehead.',
    tags: ['winter']
  },
  {
    id: 'NGC2244',
    name: 'Rosette Nebula',
    altNames: ['Caldwell 49', 'NGC 2237'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Monoceros',
    ra: 6.532,
    dec: 4.950,
    magnitude: 9.0,
    size: { width: 80, height: 60 },
    bestMonths: [12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Large circular nebula with open cluster at center. Great for widefield.',
    tags: ['winter', 'large', 'showpiece']
  },
  {
    id: 'IC1805',
    name: 'Heart Nebula',
    altNames: ['Sharpless 2-190'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cassiopeia',
    ra: 2.566,
    dec: 61.467,
    magnitude: 6.5,
    size: { width: 120, height: 120 },
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Large heart-shaped emission nebula. Often paired with Soul Nebula.',
    tags: ['fall', 'winter', 'large', 'widefield']
  },
  {
    id: 'IC1848',
    name: 'Soul Nebula',
    altNames: ['Westerhout 5', 'Sharpless 2-199'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cassiopeia',
    ra: 2.851,
    dec: 60.433,
    magnitude: 6.5,
    size: { width: 100, height: 75 },
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Partner to the Heart Nebula. Great for mosaics of the Heart & Soul.',
    tags: ['fall', 'winter', 'large', 'widefield']
  },
  {
    id: 'NGC7000',
    name: 'North America Nebula',
    altNames: ['Caldwell 20'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cygnus',
    ra: 20.983,
    dec: 44.333,
    magnitude: 4.0,
    size: { width: 120, height: 100 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.EASY,
    description: 'Huge nebula resembling North America. Best with widefield or mosaic.',
    tags: ['summer', 'fall', 'large', 'widefield', 'beginner']
  },
  {
    id: 'IC5070',
    name: 'Pelican Nebula',
    altNames: [],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cygnus',
    ra: 20.833,
    dec: 44.367,
    magnitude: 8.0,
    size: { width: 60, height: 50 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Adjacent to North America Nebula. Rich in ionization fronts.',
    tags: ['summer', 'fall']
  },
  {
    id: 'NGC6960',
    name: 'Western Veil Nebula',
    altNames: ['Witch\'s Broom', 'Caldwell 34'],
    type: TARGET_TYPES.SUPERNOVA_REMNANT,
    constellation: 'Cygnus',
    ra: 20.760,
    dec: 30.717,
    magnitude: 7.0,
    size: { width: 70, height: 6 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Western arc of the Veil complex, passing through 52 Cygni.',
    tags: ['summer', 'fall', 'SNR']
  },
  {
    id: 'NGC6992',
    name: 'Eastern Veil Nebula',
    altNames: ['Caldwell 33'],
    type: TARGET_TYPES.SUPERNOVA_REMNANT,
    constellation: 'Cygnus',
    ra: 20.940,
    dec: 31.717,
    magnitude: 7.0,
    size: { width: 60, height: 8 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Eastern arc of the Veil, includes NGC 6995. Beautiful filaments.',
    tags: ['summer', 'fall', 'SNR']
  },
  {
    id: 'NGC6888',
    name: 'Crescent Nebula',
    altNames: ['Caldwell 27', 'Sharpless 105'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cygnus',
    ra: 20.200,
    dec: 38.350,
    magnitude: 7.4,
    size: { width: 25, height: 18 },
    bestMonths: [6, 7, 8, 9],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Wolf-Rayet bubble nebula. Excellent in narrowband.',
    tags: ['summer', 'narrowband']
  },
  {
    id: 'M8',
    name: 'Lagoon Nebula',
    altNames: ['NGC 6523'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Sagittarius',
    ra: 18.063,
    dec: -24.383,
    magnitude: 6.0,
    size: { width: 90, height: 40 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Bright summer nebula with dark lanes. Easy target from southern latitudes.',
    tags: ['summer', 'showpiece', 'bright', 'beginner']
  },
  {
    id: 'M20',
    name: 'Trifid Nebula',
    altNames: ['NGC 6514'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Sagittarius',
    ra: 18.043,
    dec: -23.033,
    magnitude: 6.3,
    size: { width: 28, height: 28 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Three-lobed nebula with emission, reflection, and dark nebula components.',
    tags: ['summer', 'showpiece']
  },
  {
    id: 'M17',
    name: 'Omega Nebula',
    altNames: ['Swan Nebula', 'NGC 6618'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Sagittarius',
    ra: 18.348,
    dec: -16.183,
    magnitude: 6.0,
    size: { width: 46, height: 37 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Bright swan-shaped nebula. One of the brightest in the summer sky.',
    tags: ['summer', 'bright', 'beginner']
  },
  {
    id: 'M16',
    name: 'Eagle Nebula',
    altNames: ['NGC 6611', 'Star Queen'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Serpens',
    ra: 18.314,
    dec: -13.783,
    magnitude: 6.0,
    size: { width: 35, height: 28 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Home of the famous Pillars of Creation. Rich star-forming region.',
    tags: ['summer', 'showpiece', 'iconic']
  },
  {
    id: 'NGC6604',
    name: 'NGC 6604',
    altNames: ['Sharpless 2-54 region'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Serpens',
    ra: 18.298,
    dec: -12.243,
    magnitude: 6.5,
    size: { width: 60, height: 35 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Open cluster embedded in nebulosity near M16 and M17.',
    tags: ['summer']
  },
  {
    id: 'IC1396',
    name: 'Elephant Trunk Nebula',
    altNames: ['IC 1396A'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cepheus',
    ra: 21.628,
    dec: 57.500,
    magnitude: 3.5,
    size: { width: 170, height: 140 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Huge emission nebula with famous dark trunk. Requires widefield for full extent.',
    tags: ['summer', 'fall', 'large', 'widefield']
  },
  {
    id: 'NGC281',
    name: 'Pacman Nebula',
    altNames: ['IC 11', 'Sharpless 2-184'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cassiopeia',
    ra: 0.878,
    dec: 56.617,
    magnitude: 7.4,
    size: { width: 35, height: 30 },
    bestMonths: [9, 10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Distinctive shape with Bok globules. Nice in narrowband.',
    tags: ['fall', 'narrowband']
  },
  {
    id: 'NGC2264',
    name: 'Cone Nebula / Christmas Tree',
    altNames: ['Sharpless 2-273'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Monoceros',
    ra: 6.683,
    dec: 9.867,
    magnitude: 3.9,
    size: { width: 60, height: 30 },
    bestMonths: [12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Complex region with Cone Nebula, Christmas Tree Cluster, and Fox Fur Nebula.',
    tags: ['winter']
  },
  {
    id: 'IC405',
    name: 'Flaming Star Nebula',
    altNames: ['Caldwell 31', 'Sharpless 2-229'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Auriga',
    ra: 5.272,
    dec: 34.267,
    magnitude: 6.0,
    size: { width: 37, height: 19 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Emission and reflection nebula around AE Aurigae. Part of the Auriga complex.',
    tags: ['winter']
  },
  {
    id: 'IC410',
    name: 'Tadpoles Nebula',
    altNames: ['Sharpless 2-236'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Auriga',
    ra: 5.446,
    dec: 33.450,
    magnitude: 7.5,
    size: { width: 40, height: 40 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Contains famous tadpole structures pointing away from central cluster NGC 1893.',
    tags: ['winter', 'narrowband']
  },
  {
    id: 'IC417',
    name: 'Spider Nebula',
    altNames: ['Sharpless 2-234'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Auriga',
    ra: 5.471,
    dec: 34.417,
    magnitude: 7.0,
    size: { width: 18, height: 18 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Small emission nebula near IC 410. Often imaged together.',
    tags: ['winter']
  },
  {
    id: 'NGC1499',
    name: 'California Nebula',
    altNames: ['Sharpless 2-220'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Perseus',
    ra: 4.050,
    dec: 36.417,
    magnitude: 5.0,
    size: { width: 145, height: 40 },
    bestMonths: [10, 11, 12, 1, 2],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Large nebula shaped like California. Requires widefield setup.',
    tags: ['fall', 'winter', 'large', 'widefield']
  },
  {
    id: 'Sh2-129',
    name: 'Flying Bat Nebula',
    altNames: ['OU4 Squid Nebula region'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cepheus',
    ra: 21.200,
    dec: 60.167,
    magnitude: 7.7,
    size: { width: 200, height: 150 },
    bestMonths: [7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Large faint nebula containing the extremely faint Squid Nebula (OU4).',
    tags: ['summer', 'fall', 'challenging', 'narrowband']
  },
  {
    id: 'NGC7635',
    name: 'Bubble Nebula',
    altNames: ['Caldwell 11', 'Sharpless 2-162'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cassiopeia',
    ra: 23.342,
    dec: 61.200,
    magnitude: 7.0,
    size: { width: 15, height: 8 },
    bestMonths: [8, 9, 10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Spherical emission nebula blown by stellar wind. Near M52.',
    tags: ['fall', 'narrowband']
  },
  {
    id: 'Sh2-155',
    name: 'Cave Nebula',
    altNames: ['Caldwell 9'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cepheus',
    ra: 22.950,
    dec: 62.617,
    magnitude: 7.7,
    size: { width: 50, height: 30 },
    bestMonths: [8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Dim emission nebula with dark nebula creating cave-like appearance.',
    tags: ['fall', 'narrowband']
  },
  
  // ==========================================
  // PLANETARY NEBULAE
  // ==========================================
  {
    id: 'M27',
    name: 'Dumbbell Nebula',
    altNames: ['NGC 6853', 'Apple Core Nebula'],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Vulpecula',
    ra: 19.993,
    dec: 22.717,
    magnitude: 7.5,
    size: { width: 8, height: 6 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Large, bright planetary nebula. One of the easiest to image.',
    tags: ['summer', 'fall', 'showpiece', 'beginner']
  },
  {
    id: 'M57',
    name: 'Ring Nebula',
    altNames: ['NGC 6720'],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Lyra',
    ra: 18.893,
    dec: 33.029,
    magnitude: 8.8,
    size: { width: 1.4, height: 1.0 },
    bestMonths: [5, 6, 7, 8, 9],
    focalLength: FOCAL_LENGTH.LONG,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Classic ring-shaped planetary. Small but iconic.',
    tags: ['summer', 'iconic', 'small']
  },
  {
    id: 'M76',
    name: 'Little Dumbbell Nebula',
    altNames: ['NGC 650', 'Barbell Nebula'],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Perseus',
    ra: 1.703,
    dec: 51.575,
    magnitude: 10.1,
    size: { width: 2.7, height: 1.8 },
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.LONG,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Bipolar planetary nebula. Faint but interesting structure.',
    tags: ['fall', 'winter', 'challenging']
  },
  {
    id: 'M97',
    name: 'Owl Nebula',
    altNames: ['NGC 3587'],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Ursa Major',
    ra: 11.248,
    dec: 55.019,
    magnitude: 9.9,
    size: { width: 3.4, height: 3.3 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Round planetary with two dark "eyes." Near M108.',
    tags: ['spring']
  },
  {
    id: 'NGC6826',
    name: 'Blinking Planetary',
    altNames: [],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Cygnus',
    ra: 19.746,
    dec: 50.526,
    magnitude: 8.8,
    size: { width: 0.5, height: 0.5 },
    bestMonths: [6, 7, 8, 9],
    focalLength: FOCAL_LENGTH.LONG,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Small but bright planetary. Named for blinking effect when observing.',
    tags: ['summer', 'small']
  },
  {
    id: 'NGC7293',
    name: 'Helix Nebula',
    altNames: ['Caldwell 63', 'Eye of God'],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Aquarius',
    ra: 22.493,
    dec: -20.837,
    magnitude: 7.6,
    size: { width: 25, height: 25 },
    bestMonths: [8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Closest planetary nebula, very large angular size. Low in sky from northern latitudes.',
    tags: ['fall', 'large']
  },
  
  // ==========================================
  // GLOBULAR CLUSTERS
  // ==========================================
  {
    id: 'M13',
    name: 'Great Globular Cluster',
    altNames: ['NGC 6205', 'Hercules Cluster'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Hercules',
    ra: 16.695,
    dec: 36.461,
    magnitude: 5.8,
    size: { width: 20, height: 20 },
    bestMonths: [4, 5, 6, 7, 8, 9],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Brightest globular in northern sky. Resolves into hundreds of thousands of stars.',
    tags: ['summer', 'showpiece', 'beginner']
  },
  {
    id: 'M3',
    name: 'M3',
    altNames: ['NGC 5272'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Canes Venatici',
    ra: 13.703,
    dec: 28.377,
    magnitude: 6.2,
    size: { width: 18, height: 18 },
    bestMonths: [3, 4, 5, 6, 7],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'One of the largest and brightest globulars. Rich core.',
    tags: ['spring', 'summer']
  },
  {
    id: 'M5',
    name: 'M5',
    altNames: ['NGC 5904'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Serpens',
    ra: 15.310,
    dec: 2.083,
    magnitude: 5.7,
    size: { width: 23, height: 23 },
    bestMonths: [4, 5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Beautiful globular rivaling M13. Elliptical shape.',
    tags: ['spring', 'summer']
  },
  {
    id: 'M92',
    name: 'M92',
    altNames: ['NGC 6341'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Hercules',
    ra: 17.285,
    dec: 43.136,
    magnitude: 6.4,
    size: { width: 14, height: 14 },
    bestMonths: [4, 5, 6, 7, 8, 9],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Often overlooked neighbor of M13. Very old cluster.',
    tags: ['summer']
  },
  {
    id: 'M15',
    name: 'M15',
    altNames: ['NGC 7078'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Pegasus',
    ra: 21.500,
    dec: 12.167,
    magnitude: 6.2,
    size: { width: 18, height: 18 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Dense core, possibly contains black hole. One of the densest known.',
    tags: ['fall']
  },
  {
    id: 'M2',
    name: 'M2',
    altNames: ['NGC 7089'],
    type: TARGET_TYPES.GLOBULAR_CLUSTER,
    constellation: 'Aquarius',
    ra: 21.558,
    dec: -0.823,
    magnitude: 6.5,
    size: { width: 16, height: 16 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Rich globular, one of the larger ones. Elliptical shape.',
    tags: ['fall']
  },
  
  // ==========================================
  // OPEN CLUSTERS
  // ==========================================
  {
    id: 'M45',
    name: 'Pleiades',
    altNames: ['Seven Sisters', 'Subaru'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Taurus',
    ra: 3.791,
    dec: 24.117,
    magnitude: 1.6,
    size: { width: 110, height: 110 },
    bestMonths: [10, 11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Stunning cluster with blue reflection nebulosity. Iconic winter target.',
    tags: ['winter', 'showpiece', 'beginner', 'reflection']
  },
  {
    id: 'M35',
    name: 'M35',
    altNames: ['NGC 2168'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Gemini',
    ra: 6.148,
    dec: 24.333,
    magnitude: 5.3,
    size: { width: 28, height: 28 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Rich cluster with nearby NGC 2158 providing nice contrast.',
    tags: ['winter']
  },
  {
    id: 'M36',
    name: 'M36',
    altNames: ['NGC 1960', 'Pinwheel Cluster'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Auriga',
    ra: 5.602,
    dec: 34.133,
    magnitude: 6.3,
    size: { width: 12, height: 12 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'One of three Messier clusters in Auriga. Bright and compact.',
    tags: ['winter']
  },
  {
    id: 'M37',
    name: 'M37',
    altNames: ['NGC 2099'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Auriga',
    ra: 5.873,
    dec: 32.550,
    magnitude: 6.2,
    size: { width: 24, height: 24 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Richest of the Auriga clusters. Over 500 stars.',
    tags: ['winter']
  },
  {
    id: 'M38',
    name: 'M38',
    altNames: ['NGC 1912', 'Starfish Cluster'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Auriga',
    ra: 5.478,
    dec: 35.833,
    magnitude: 7.4,
    size: { width: 21, height: 21 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Cross-shaped pattern of stars. Near NGC 1907.',
    tags: ['winter']
  },
  {
    id: 'NGC884',
    name: 'Double Cluster',
    altNames: ['NGC 869', 'Caldwell 14'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Perseus',
    ra: 2.367,
    dec: 57.133,
    magnitude: 3.7,
    size: { width: 60, height: 30 },
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Two rich clusters side by side. Spectacular at any focal length.',
    tags: ['fall', 'winter', 'showpiece', 'beginner']
  },
  {
    id: 'M52',
    name: 'M52',
    altNames: ['NGC 7654'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Cassiopeia',
    ra: 23.407,
    dec: 61.583,
    magnitude: 5.0,
    size: { width: 13, height: 13 },
    bestMonths: [8, 9, 10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Rich cluster near Bubble Nebula. Great pairing.',
    tags: ['fall']
  },
  {
    id: 'M103',
    name: 'M103',
    altNames: ['NGC 581'],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Cassiopeia',
    ra: 1.555,
    dec: 60.700,
    magnitude: 7.4,
    size: { width: 6, height: 6 },
    bestMonths: [9, 10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Fan-shaped cluster in Cassiopeia.',
    tags: ['fall', 'winter']
  },
  
  // ==========================================
  // WIDE FIELD / MILKY WAY REGIONS
  // ==========================================
  {
    id: 'MWCore',
    name: 'Milky Way Core',
    altNames: ['Galactic Center'],
    type: TARGET_TYPES.MILKY_WAY,
    constellation: 'Sagittarius',
    ra: 17.761,
    dec: -28.936,
    magnitude: 0,
    size: { width: 1800, height: 600 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'The bright central bulge of our galaxy. Best with ultra-wide lens.',
    tags: ['summer', 'widefield', 'milky way']
  },
  {
    id: 'Rho_Oph',
    name: 'Rho Ophiuchi Cloud Complex',
    altNames: [],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Ophiuchus',
    ra: 16.433,
    dec: -23.433,
    magnitude: 4.6,
    size: { width: 270, height: 240 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Colorful region with reflection, emission, and dark nebulae. Includes Antares.',
    tags: ['summer', 'widefield', 'colorful']
  },
  {
    id: 'Cygnus_Region',
    name: 'Cygnus Star Cloud',
    altNames: ['IC 1318', 'Sadr Region'],
    type: TARGET_TYPES.EMISSION_NEBULA,
    constellation: 'Cygnus',
    ra: 20.367,
    dec: 40.250,
    magnitude: 4.0,
    size: { width: 300, height: 200 },
    bestMonths: [6, 7, 8, 9, 10],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.EASY,
    description: 'Rich region around Sadr with emission nebulae. Great for mosaics.',
    tags: ['summer', 'fall', 'widefield']
  },
  {
    id: 'Cepheus_Flare',
    name: 'Cepheus Flare',
    altNames: ['LDN 1228 region'],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Cepheus',
    ra: 21.000,
    dec: 68.000,
    magnitude: 5.0,
    size: { width: 300, height: 200 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Large region of dust clouds with IFN (Integrated Flux Nebulae). Requires very dark skies.',
    tags: ['fall', 'widefield', 'IFN', 'challenging']
  },
  
  // ==========================================
  // ADDITIONAL INTERESTING TARGETS
  // ==========================================
  {
    id: 'NGC6946',
    name: 'Fireworks Galaxy',
    altNames: ['Caldwell 12'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Cepheus',
    ra: 20.582,
    dec: 60.154,
    magnitude: 9.6,
    size: { width: 11, height: 10 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Face-on spiral near NGC 6939. Famous for frequent supernovae.',
    tags: ['fall', 'face-on']
  },
  {
    id: 'NGC6939',
    name: 'NGC 6939',
    altNames: [],
    type: TARGET_TYPES.OPEN_CLUSTER,
    constellation: 'Cepheus',
    ra: 20.526,
    dec: 60.652,
    magnitude: 7.8,
    size: { width: 8, height: 8 },
    bestMonths: [7, 8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EASY,
    description: 'Rich open cluster near Fireworks Galaxy. Great pairing.',
    tags: ['fall']
  },
  {
    id: 'M108',
    name: 'Surfboard Galaxy',
    altNames: ['NGC 3556'],
    type: TARGET_TYPES.GALAXY,
    constellation: 'Ursa Major',
    ra: 11.191,
    dec: 55.674,
    magnitude: 10.0,
    size: { width: 8, height: 2 },
    bestMonths: [2, 3, 4, 5],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Edge-on spiral near Owl Nebula (M97). Good pairing.',
    tags: ['spring', 'edge-on', 'pair']
  },
  {
    id: 'IC443',
    name: 'Jellyfish Nebula',
    altNames: ['Sharpless 2-248'],
    type: TARGET_TYPES.SUPERNOVA_REMNANT,
    constellation: 'Gemini',
    ra: 6.283,
    dec: 22.517,
    magnitude: 12.0,
    size: { width: 50, height: 40 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Large supernova remnant. Best in narrowband (Ha, OIII).',
    tags: ['winter', 'SNR', 'narrowband', 'challenging']
  },
  {
    id: 'Simeis147',
    name: 'Spaghetti Nebula',
    altNames: ['Sharpless 2-240'],
    type: TARGET_TYPES.SUPERNOVA_REMNANT,
    constellation: 'Taurus',
    ra: 5.667,
    dec: 28.000,
    magnitude: 12.0,
    size: { width: 180, height: 180 },
    bestMonths: [11, 12, 1, 2],
    focalLength: FOCAL_LENGTH.WIDE,
    difficulty: DIFFICULTY.EXPERT,
    description: 'Extremely faint but huge SNR. Requires many hours and narrowband.',
    tags: ['winter', 'SNR', 'narrowband', 'expert', 'widefield']
  },
  {
    id: 'Abell39',
    name: 'Abell 39',
    altNames: [],
    type: TARGET_TYPES.PLANETARY_NEBULA,
    constellation: 'Hercules',
    ra: 16.455,
    dec: 27.905,
    magnitude: 13.7,
    size: { width: 2.8, height: 2.8 },
    bestMonths: [5, 6, 7, 8],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.EXPERT,
    description: 'Nearly perfect spherical planetary. Extremely faint but beautiful.',
    tags: ['summer', 'challenging', 'expert']
  },
  {
    id: 'NGC1333',
    name: 'NGC 1333',
    altNames: [],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Perseus',
    ra: 3.486,
    dec: 31.363,
    magnitude: 5.6,
    size: { width: 9, height: 7 },
    bestMonths: [10, 11, 12, 1],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.MODERATE,
    description: 'Blue reflection nebula in Perseus molecular cloud. Active star forming.',
    tags: ['fall', 'winter', 'reflection']
  },
  {
    id: 'vdB152',
    name: 'Cederblad 201',
    altNames: ['vdB 152', 'Wolf\'s Cave'],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Cepheus',
    ra: 22.200,
    dec: 70.350,
    magnitude: 9.3,
    size: { width: 3, height: 2 },
    bestMonths: [8, 9, 10, 11],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Blue reflection nebula embedded in dark nebula. Surrounded by IFN.',
    tags: ['fall', 'reflection', 'IFN', 'challenging']
  },
  {
    id: 'NGC1977',
    name: 'Running Man Nebula',
    altNames: ['Sharpless 2-279'],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Orion',
    ra: 5.586,
    dec: -4.833,
    magnitude: 7.0,
    size: { width: 20, height: 10 },
    bestMonths: [11, 12, 1, 2, 3],
    focalLength: FOCAL_LENGTH.SHORT,
    difficulty: DIFFICULTY.EASY,
    description: 'Blue reflection nebula just north of M42. Often captured with Orion Nebula.',
    tags: ['winter', 'reflection']
  },
  {
    id: 'IC59_63',
    name: 'IC 59 & IC 63',
    altNames: ['Gamma Cas Nebulae', 'Ghost of Cassiopeia'],
    type: TARGET_TYPES.REFLECTION_NEBULA,
    constellation: 'Cassiopeia',
    ra: 0.983,
    dec: 61.150,
    magnitude: 10.0,
    size: { width: 20, height: 15 },
    bestMonths: [9, 10, 11, 12],
    focalLength: FOCAL_LENGTH.MEDIUM,
    difficulty: DIFFICULTY.CHALLENGING,
    description: 'Pair of nebulae near Gamma Cas. IC 63 is emission, IC 59 is reflection.',
    tags: ['fall', 'reflection', 'challenging']
  }
];

// ============================================
// ASTRONOMY CALCULATIONS
// ============================================

/**
 * Convert RA (hours) and Dec (degrees) to altitude and azimuth
 * @param {number} ra - Right Ascension in decimal hours
 * @param {number} dec - Declination in decimal degrees
 * @param {number} lat - Observer latitude in decimal degrees
 * @param {number} lon - Observer longitude in decimal degrees
 * @param {Date} date - Date and time of observation
 * @returns {Object} { altitude, azimuth } in degrees
 */
export function raDecToAltAz(ra, dec, lat, lon, date) {
  // Calculate Julian Date
  const JD = dateToJD(date);
  
  // Calculate Greenwich Mean Sidereal Time
  const GMST = calculateGMST(JD);
  
  // Calculate Local Sidereal Time (in hours)
  const LST = (GMST + lon / 15) % 24;
  
  // Hour Angle (in hours, then convert to degrees)
  let HA = LST - ra;
  if (HA < 0) HA += 24;
  if (HA > 12) HA -= 24;
  const HADeg = HA * 15;
  
  // Convert to radians
  const latRad = lat * DEG_TO_RAD;
  const decRad = dec * DEG_TO_RAD;
  const HARad = HADeg * DEG_TO_RAD;
  
  // Calculate altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(HARad);
  const altitude = Math.asin(sinAlt) * RAD_TO_DEG;
  
  // Calculate azimuth
  const cosA = (Math.sin(decRad) - Math.sin(altitude * DEG_TO_RAD) * Math.sin(latRad)) /
               (Math.cos(altitude * DEG_TO_RAD) * Math.cos(latRad));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosA))) * RAD_TO_DEG;
  
  if (Math.sin(HARad) > 0) {
    azimuth = 360 - azimuth;
  }
  
  return { altitude, azimuth };
}

/**
 * Convert Date to Julian Date
 */
function dateToJD(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate() + 
            date.getUTCHours() / 24 + 
            date.getUTCMinutes() / 1440 + 
            date.getUTCSeconds() / 86400;
  
  let A, B;
  if (M <= 2) {
    A = Math.floor((Y - 1) / 100);
    B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (Y - 1 + 4716)) + Math.floor(30.6001 * (M + 12 + 1)) + D + B - 1524.5;
  } else {
    A = Math.floor(Y / 100);
    B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
  }
}

/**
 * Calculate Greenwich Mean Sidereal Time from Julian Date
 * @returns {number} GMST in hours
 */
function calculateGMST(JD) {
  const T = (JD - 2451545.0) / 36525;
  let GMST = 280.46061837 + 360.98564736629 * (JD - 2451545.0) + 
             0.000387933 * T * T - T * T * T / 38710000;
  GMST = ((GMST % 360) + 360) % 360;
  return GMST / 15; // Convert to hours
}

/**
 * Calculate the angular separation between two points on the celestial sphere
 * @param {number} ra1 - RA of first object (hours)
 * @param {number} dec1 - Dec of first object (degrees)
 * @param {number} ra2 - RA of second object (hours)
 * @param {number} dec2 - Dec of second object (degrees)
 * @returns {number} Angular separation in degrees
 */
export function angularSeparation(ra1, dec1, ra2, dec2) {
  const ra1Rad = ra1 * 15 * DEG_TO_RAD;
  const dec1Rad = dec1 * DEG_TO_RAD;
  const ra2Rad = ra2 * 15 * DEG_TO_RAD;
  const dec2Rad = dec2 * DEG_TO_RAD;
  
  const cosD = Math.sin(dec1Rad) * Math.sin(dec2Rad) +
               Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad);
  
  return Math.acos(Math.max(-1, Math.min(1, cosD))) * RAD_TO_DEG;
}

/**
 * Calculate approximate moon position (simplified)
 * @param {Date} date 
 * @returns {Object} { ra, dec } in hours and degrees
 */
export function getMoonPosition(date) {
  const JD = dateToJD(date);
  const T = (JD - 2451545.0) / 36525;
  
  // Mean longitude of Moon
  let L = 218.3164477 + 481267.88123421 * T;
  L = ((L % 360) + 360) % 360;
  
  // Mean anomaly of Moon
  let M = 134.9633964 + 477198.8675055 * T;
  M = ((M % 360) + 360) % 360;
  
  // Mean elongation of Moon
  let D = 297.8501921 + 445267.1114034 * T;
  D = ((D % 360) + 360) % 360;
  
  // Simplified calculation - good enough for angular separation
  const MRad = M * DEG_TO_RAD;
  const DRad = D * DEG_TO_RAD;
  
  // Longitude with main perturbations
  let lon = L + 6.289 * Math.sin(MRad);
  let lat = 5.128 * Math.sin(MRad);
  
  // Convert ecliptic to equatorial (simplified)
  const obliquity = 23.439 * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;
  const latRad = lat * DEG_TO_RAD;
  
  const ra = Math.atan2(
    Math.sin(lonRad) * Math.cos(obliquity) - Math.tan(latRad) * Math.sin(obliquity),
    Math.cos(lonRad)
  ) * RAD_TO_DEG / 15;
  
  const dec = Math.asin(
    Math.sin(latRad) * Math.cos(obliquity) + 
    Math.cos(latRad) * Math.sin(obliquity) * Math.sin(lonRad)
  ) * RAD_TO_DEG;
  
  return { ra: ((ra % 24) + 24) % 24, dec };
}

/**
 * Find the transit time (when object crosses meridian) for a target
 * @param {number} ra - Right Ascension in hours
 * @param {number} lon - Observer longitude in degrees
 * @param {Date} date - Date to calculate for
 * @returns {Date} Transit time
 */
export function getTransitTime(ra, lon, date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  
  const JD = dateToJD(midnight);
  const GMST = calculateGMST(JD);
  const LST = (GMST + lon / 15) % 24;
  
  let hourAngle = ra - LST;
  if (hourAngle < 0) hourAngle += 24;
  if (hourAngle > 12) hourAngle -= 24;
  
  const transitTime = new Date(midnight);
  transitTime.setTime(transitTime.getTime() + hourAngle * 3600 * 1000);
  
  return transitTime;
}

/**
 * Calculate rise and set times for a target
 * @param {number} ra - Right Ascension in hours
 * @param {number} dec - Declination in degrees
 * @param {number} lat - Observer latitude in degrees
 * @param {number} lon - Observer longitude in degrees
 * @param {Date} date - Date to calculate for
 * @param {number} minAltitude - Minimum altitude to consider (default 0)
 * @returns {Object} { rise, transit, set, maxAlt, neverSets, neverRises }
 */
export function getRiseTransitSet(ra, dec, lat, lon, date, minAltitude = 0) {
  const transit = getTransitTime(ra, lon, date);
  
  // Calculate max altitude at transit
  const maxAlt = 90 - Math.abs(lat - dec);
  
  // Check if circumpolar or never rises
  const latRad = lat * DEG_TO_RAD;
  const decRad = dec * DEG_TO_RAD;
  const minAltRad = minAltitude * DEG_TO_RAD;
  
  const cosH = (Math.sin(minAltRad) - Math.sin(latRad) * Math.sin(decRad)) /
               (Math.cos(latRad) * Math.cos(decRad));
  
  if (cosH < -1) {
    // Object is circumpolar (never sets)
    return { rise: null, transit, set: null, maxAlt, neverSets: true, neverRises: false };
  }
  
  if (cosH > 1) {
    // Object never rises above minAltitude
    return { rise: null, transit: null, set: null, maxAlt, neverSets: false, neverRises: true };
  }
  
  const H = Math.acos(cosH) * RAD_TO_DEG / 15; // Hour angle in hours
  
  const rise = new Date(transit.getTime() - H * 3600 * 1000);
  const set = new Date(transit.getTime() + H * 3600 * 1000);
  
  return { rise, transit, set, maxAlt, neverSets: false, neverRises: false };
}

/**
 * Calculate hours above a given altitude for tonight
 * @param {Object} target - Target object from database
 * @param {number} lat - Observer latitude
 * @param {number} lon - Observer longitude
 * @param {Date} date - Date to calculate for
 * @param {number} minAlt - Minimum altitude (default 30)
 * @returns {number} Hours above minAlt tonight (between sunset and sunrise)
 */
export function getHoursAboveAltitude(target, lat, lon, date, minAlt = 30) {
  const rts = getRiseTransitSet(target.ra, target.dec, lat, lon, date, minAlt);
  
  if (rts.neverRises) return 0;
  if (rts.neverSets) return 12; // Assume full night availability
  
  // Simplified: calculate hours between rise and set above minAlt
  if (rts.rise && rts.set) {
    const hours = (rts.set - rts.rise) / (1000 * 60 * 60);
    return Math.min(hours, 12); // Cap at 12 hours
  }
  
  return 0;
}

/**
 * Get a visibility summary for a target
 * @param {Object} target - Target from database
 * @param {number} lat - Observer latitude
 * @param {number} lon - Observer longitude
 * @param {Date} date - Date to calculate for
 * @param {Object} moonData - Moon phase/illumination data
 * @returns {Object} Visibility summary
 */
export function getTargetVisibility(target, lat, lon, date, moonData) {
  // Get rise/transit/set
  const rts = getRiseTransitSet(target.ra, target.dec, lat, lon, date, 15);
  
  // Current position
  const currentPos = raDecToAltAz(target.ra, target.dec, lat, lon, date);
  
  // Moon separation
  const moonPos = getMoonPosition(date);
  const moonSeparation = angularSeparation(target.ra, target.dec, moonPos.ra, moonPos.dec);
  
  // Hours above 30 degrees tonight
  const hoursAbove30 = getHoursAboveAltitude(target, lat, lon, date, 30);
  
  // Is it a good month for this target?
  const currentMonth = date.getMonth() + 1;
  const isGoodMonth = target.bestMonths.includes(currentMonth);
  
  // Calculate overall score (0-100)
  let score = 0;
  
  // Altitude contribution (0-30 points)
  if (currentPos.altitude > 30) {
    score += Math.min(30, (currentPos.altitude - 30) * 0.75);
  }
  
  // Hours available contribution (0-25 points)
  score += Math.min(25, hoursAbove30 * 3);
  
  // Moon separation contribution (0-25 points)
  if (moonSeparation > 90) {
    score += 25;
  } else if (moonSeparation > 45) {
    score += 15;
  } else if (moonSeparation > 20) {
    score += 5;
  }
  
  // Moon illumination penalty
  if (moonData && moonData.illumination > 50) {
    score -= (moonData.illumination - 50) * 0.3;
  }
  
  // Season bonus (0-20 points)
  if (isGoodMonth) {
    score += 20;
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  return {
    target,
    currentAltitude: currentPos.altitude,
    currentAzimuth: currentPos.azimuth,
    rise: rts.rise,
    transit: rts.transit,
    set: rts.set,
    maxAltitude: rts.maxAlt,
    neverSets: rts.neverSets,
    neverRises: rts.neverRises,
    moonSeparation,
    hoursAbove30,
    isGoodMonth,
    score: Math.round(score)
  };
}

/**
 * Get recommended targets sorted by score
 * @param {number} lat - Observer latitude
 * @param {number} lon - Observer longitude
 * @param {Date} date - Date to calculate for
 * @param {Object} moonData - Moon data
 * @param {Object} filters - Optional filters { types, minAltitude, minScore }
 * @returns {Array} Sorted array of target visibility data
 */
export function getRecommendedTargets(lat, lon, date, moonData, filters = {}) {
  const { 
    types = null, 
    minAltitude = -90,
    minScore = 0,
    focalLength = null
  } = filters;
  
  let targets = DSO_DATABASE;
  
  // Filter by type if specified
  if (types && types.length > 0) {
    targets = targets.filter(t => types.includes(t.type));
  }
  
  // Filter by focal length if specified
  if (focalLength) {
    targets = targets.filter(t => t.focalLength === focalLength);
  }
  
  // Calculate visibility for each target
  const results = targets.map(target => getTargetVisibility(target, lat, lon, date, moonData));
  
  // Filter by altitude and score
  const filtered = results.filter(r => 
    r.currentAltitude >= minAltitude && 
    r.score >= minScore &&
    !r.neverRises
  );
  
  // Sort by score (descending)
  filtered.sort((a, b) => b.score - a.score);
  
  return filtered;
}

/**
 * Format RA for display (hours:minutes:seconds)
 */
export function formatRA(raHours) {
  const hours = Math.floor(raHours);
  const minutes = Math.floor((raHours - hours) * 60);
  const seconds = Math.round(((raHours - hours) * 60 - minutes) * 60);
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Format Dec for display (degrees:arcmin:arcsec)
 */
export function formatDec(decDegrees) {
  const sign = decDegrees >= 0 ? '+' : '-';
  const absD = Math.abs(decDegrees);
  const degrees = Math.floor(absD);
  const arcmin = Math.floor((absD - degrees) * 60);
  const arcsec = Math.round(((absD - degrees) * 60 - arcmin) * 60);
  return `${sign}${degrees}° ${arcmin}' ${arcsec}"`;
}

/**
 * Get cardinal direction from azimuth
 */
export function getCardinalDirection(azimuth) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}