// Gear configuration and compatibility scoring

// ============================================
// USER GEAR PROFILES
// ============================================

export const USER_GEAR = {
  cameras: [
    {
      id: 'asi533mc',
      name: 'ZWO ASI533MC Pro',
      sensorWidth: 11.31,  // mm
      sensorHeight: 11.31,
      pixelSize: 3.76,     // microns
      resolution: { width: 3008, height: 3008 },
      type: 'cooled',
      color: true
    },
    {
      id: 'asi220mm',
      name: 'ZWO ASI220MM Mini',
      sensorWidth: 8.8,
      sensorHeight: 6.6,
      pixelSize: 2.9,
      resolution: { width: 3072, height: 2048 },
      type: 'uncooled',
      color: false  // mono - guide camera
    },
    {
      id: 'nikon-z6iii',
      name: 'Nikon Z6 III',
      sensorWidth: 35.9,
      sensorHeight: 23.9,
      pixelSize: 5.9,
      resolution: { width: 6048, height: 4032 },
      type: 'dslr',
      color: true
    },
    {
      id: 'seestar-sensor',
      name: 'Seestar S50 (integrated)',
      sensorWidth: 6.4,
      sensorHeight: 4.8,
      pixelSize: 2.9,
      resolution: { width: 1920, height: 1080 },
      type: 'integrated',
      color: true
    }
  ],
  
  optics: [
    {
      id: 'seestar',
      name: 'Seestar S50',
      focalLength: 250,
      aperture: 50,
      fRatio: 5.0,
      type: 'refractor',
      defaultCamera: 'seestar-sensor'
    },
    {
      id: 'evostar72',
      name: 'Evostar 72ED',
      focalLength: 420,
      aperture: 72,
      fRatio: 5.8,
      type: 'refractor',
      defaultCamera: 'asi533mc'
    },
    {
      id: 'evostar72-reducer',
      name: 'Evostar 72ED + 0.85x',
      focalLength: 357,
      aperture: 72,
      fRatio: 4.9,
      type: 'refractor',
      defaultCamera: 'asi533mc'
    },
    {
      id: 'askar-v60',
      name: 'Askar V 60mm',
      focalLength: 336,
      aperture: 60,
      fRatio: 5.6,
      type: 'refractor',
      defaultCamera: 'asi533mc'
    },
    {
      id: 'askar-v80',
      name: 'Askar V 80mm',
      focalLength: 504,
      aperture: 80,
      fRatio: 6.3,
      type: 'refractor',
      defaultCamera: 'asi533mc'
    },
    {
      id: 'nikon-20mm',
      name: 'Nikon 20mm f/1.8',
      focalLength: 20,
      aperture: 11.1,  // at f/1.8
      fRatio: 1.8,
      type: 'camera-lens',
      defaultCamera: 'nikon-z6iii'
    },
    {
      id: 'nikon-24-70',
      name: 'Nikon 24-70mm f/4',
      focalLength: 50,  // mid-range
      aperture: 12.5,
      fRatio: 4.0,
      type: 'camera-lens',
      defaultCamera: 'nikon-z6iii'
    }
  ],
  
  mounts: [
    {
      id: 'eq-al55i',
      name: 'Sky-Watcher EQ-AL55i Pro',
      type: 'eq-goto',
      payload: 12,  // kg
      tracking: true,
      guiding: true
    }
  ],
  
  filters: [
    {
      id: 'cls-nikon',
      name: 'Astronomik CLS (Nikon Z)',
      type: 'light-pollution',
      forCamera: 'nikon-z6iii'
    }
  ],
  
  accessories: {
    guidescope: true,
    guideCamera: true,
    eaf: true,
    dewHeater: true
  }
};

// ============================================
// IMAGING SETUPS (Camera + Optic combinations)
// ============================================

export const IMAGING_SETUPS = [
  {
    id: 'seestar-integrated',
    name: 'Seestar S50',
    optic: 'seestar',
    camera: 'seestar-sensor',
    focalLength: 250,
    pixelScale: 2.4,  // arcsec/pixel
    fov: { width: 76.8, height: 43.2 },  // arcminutes
    category: 'grab-and-go',
    strengths: ['portable', 'automated', 'beginner-friendly'],
    limitations: ['small-sensor', 'limited-exposure']
  },
  {
    id: 'evostar-asi533',
    name: 'Evostar 72ED + ASI533MC',
    optic: 'evostar72',
    camera: 'asi533mc',
    focalLength: 420,
    pixelScale: 1.85,
    fov: { width: 92.7, height: 92.7 },
    category: 'main-rig',
    strengths: ['versatile', 'good-fov', 'quality-optics'],
    limitations: []
  },
  {
    id: 'evostar-reduced-asi533',
    name: 'Evostar 72ED + 0.85x + ASI533MC',
    optic: 'evostar72-reducer',
    camera: 'asi533mc',
    focalLength: 357,
    pixelScale: 2.17,
    fov: { width: 109.0, height: 109.0 },
    category: 'main-rig',
    strengths: ['wider-fov', 'faster', 'versatile'],
    limitations: []
  },
  {
    id: 'askar-v60-asi533',
    name: 'Askar V 60mm + ASI533MC',
    optic: 'askar-v60',
    camera: 'asi533mc',
    focalLength: 336,
    pixelScale: 2.31,
    fov: { width: 116.0, height: 116.0 },
    category: 'main-rig',
    strengths: ['wide-fov', 'triplet-quality'],
    limitations: []
  },
  {
    id: 'askar-v80-asi533',
    name: 'Askar V 80mm + ASI533MC',
    optic: 'askar-v80',
    camera: 'asi533mc',
    focalLength: 504,
    pixelScale: 1.54,
    fov: { width: 77.3, height: 77.3 },
    category: 'main-rig',
    strengths: ['higher-resolution', 'triplet-quality'],
    limitations: ['narrower-fov']
  },
  {
    id: 'nikon-widefield',
    name: 'Nikon Z6 III + 20mm f/1.8',
    optic: 'nikon-20mm',
    camera: 'nikon-z6iii',
    focalLength: 20,
    pixelScale: 60.8,  // very wide!
    fov: { width: 6132, height: 4088 },  // huge FOV in arcmin
    category: 'widefield',
    strengths: ['ultra-wide', 'milky-way', 'fast'],
    limitations: ['untracked-short-exposures', 'no-guiding']
  }
];

// ============================================
// COMPATIBILITY SCORING
// ============================================

/**
 * Calculate how well a target fits in a given setup's FOV
 * @param {Object} target - Target from DSO database
 * @param {Object} setup - Imaging setup
 * @returns {Object} { score, rating, details }
 */
export function calculateFOVFit(target, setup) {
  const targetWidth = target.size.width;   // arcminutes
  const targetHeight = target.size.height;
  const fovWidth = setup.fov.width;
  const fovHeight = setup.fov.height;
  
  // Calculate what percentage of FOV the target fills
  const widthFill = (targetWidth / fovWidth) * 100;
  const heightFill = (targetHeight / fovHeight) * 100;
  const maxFill = Math.max(widthFill, heightFill);
  const minFill = Math.min(widthFill, heightFill);
  
  // Ideal: target fills 30-70% of FOV (room for framing, not too small)
  let score = 0;
  let rating = '';
  let details = '';
  
  if (maxFill > 100) {
    // Target is larger than FOV - will be cropped
    const overflow = maxFill - 100;
    score = Math.max(0, 50 - overflow);
    rating = 'Too Large';
    details = `Target exceeds FOV by ${Math.round(overflow)}%. Consider mosaic.`;
  } else if (maxFill > 70) {
    // Target fills most of FOV - tight but workable
    score = 70 + (100 - maxFill);
    rating = 'Tight Fit';
    details = `Fills ${Math.round(maxFill)}% of FOV. Limited framing options.`;
  } else if (maxFill >= 30) {
    // Ideal range
    score = 90 + (maxFill - 30) / 4;
    rating = 'Excellent';
    details = `Fills ${Math.round(maxFill)}% of FOV. Ideal framing.`;
  } else if (maxFill >= 15) {
    // Target is small but still reasonable
    score = 60 + maxFill;
    rating = 'Good';
    details = `Fills ${Math.round(maxFill)}% of FOV. Room for context.`;
  } else if (maxFill >= 5) {
    // Target is quite small
    score = 30 + maxFill * 2;
    rating = 'Small';
    details = `Only fills ${Math.round(maxFill)}% of FOV. Consider longer focal length.`;
  } else {
    // Target is tiny in this FOV
    score = maxFill * 6;
    rating = 'Too Small';
    details = `Fills only ${maxFill.toFixed(1)}% of FOV. Much longer FL needed.`;
  }
  
  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    rating,
    details,
    fillPercent: maxFill
  };
}

/**
 * Calculate resolution suitability (is pixel scale appropriate for target?)
 * @param {Object} target - Target from DSO database  
 * @param {Object} setup - Imaging setup
 * @returns {Object} { score, rating, details }
 */
export function calculateResolutionFit(target, setup) {
  const pixelScale = setup.pixelScale;  // arcsec/pixel
  const targetSizeArcsec = Math.min(target.size.width, target.size.height) * 60;
  
  // How many pixels across the smaller dimension?
  const pixelsAcross = targetSizeArcsec / pixelScale;
  
  let score = 0;
  let rating = '';
  let details = '';
  
  // For most DSOs, you want at least 200-500 pixels across for good detail
  // But for large nebulae, even 100 pixels is fine
  
  if (target.type === 'Planetary Nebula' || target.size.width < 5) {
    // Small targets need more pixels
    if (pixelsAcross >= 200) {
      score = 95;
      rating = 'Excellent';
      details = `${Math.round(pixelsAcross)} pixels across. Great resolution.`;
    } else if (pixelsAcross >= 100) {
      score = 75;
      rating = 'Good';
      details = `${Math.round(pixelsAcross)} pixels across. Adequate detail.`;
    } else if (pixelsAcross >= 50) {
      score = 50;
      rating = 'Marginal';
      details = `Only ${Math.round(pixelsAcross)} pixels across. Limited detail.`;
    } else {
      score = 20;
      rating = 'Undersampled';
      details = `Only ${Math.round(pixelsAcross)} pixels. Need longer FL.`;
    }
  } else {
    // Larger targets are more forgiving
    if (pixelsAcross >= 500) {
      score = 95;
      rating = 'Excellent';
      details = `${Math.round(pixelsAcross)} pixels across. Great detail potential.`;
    } else if (pixelsAcross >= 200) {
      score = 90;
      rating = 'Very Good';
      details = `${Math.round(pixelsAcross)} pixels across. Good resolution.`;
    } else if (pixelsAcross >= 100) {
      score = 75;
      rating = 'Good';
      details = `${Math.round(pixelsAcross)} pixels across. Adequate.`;
    } else {
      score = 50;
      rating = 'Low Res';
      details = `${Math.round(pixelsAcross)} pixels. Fine for context shots.`;
    }
  }
  
  return { score, rating, details, pixelsAcross: Math.round(pixelsAcross) };
}

/**
 * Calculate overall gear compatibility for a target
 * @param {Object} target - Target from DSO database
 * @param {Array} setups - Array of imaging setups to evaluate (defaults to all)
 * @returns {Object} { bestSetup, allScores, overallScore }
 */
export function calculateGearCompatibility(target, setups = IMAGING_SETUPS) {
  const scores = setups.map(setup => {
    const fovFit = calculateFOVFit(target, setup);
    const resFit = calculateResolutionFit(target, setup);
    
    // Weight: FOV fit is more important (60%) than resolution (40%)
    const combinedScore = Math.round(fovFit.score * 0.6 + resFit.score * 0.4);
    
    return {
      setup,
      fovFit,
      resFit,
      combinedScore,
      recommendation: getSetupRecommendation(combinedScore, fovFit, resFit)
    };
  });
  
  // Sort by combined score
  scores.sort((a, b) => b.combinedScore - a.combinedScore);
  
  const bestSetup = scores[0];
  const overallScore = bestSetup.combinedScore;
  
  return {
    bestSetup,
    allScores: scores,
    overallScore,
    hasGoodOption: overallScore >= 60
  };
}

function getSetupRecommendation(score, fovFit, resFit) {
  if (score >= 85) return 'Highly Recommended';
  if (score >= 70) return 'Good Match';
  if (score >= 50) return 'Workable';
  if (score >= 30) return 'Challenging';
  return 'Not Recommended';
}

/**
 * Get the best imaging setup for a target
 * @param {Object} target 
 * @returns {Object} Best setup with scores
 */
export function getBestSetupForTarget(target) {
  return calculateGearCompatibility(target).bestSetup;
}

/**
 * Filter setups that can reasonably image a target
 * @param {Object} target 
 * @param {number} minScore - Minimum combined score (default 50)
 * @returns {Array} Suitable setups
 */
export function getSuitableSetups(target, minScore = 50) {
  const { allScores } = calculateGearCompatibility(target);
  return allScores.filter(s => s.combinedScore >= minScore);
}