/* ===================================================
   ELIOUSH GAMING — script.js  v3  (ES Module)
   =================================================== */
import DB, {
  listenApprovedMods,
  listenComments,
  addComment,
  incrementDownload,
  getDownloadsLocal,
  addPendingSubmission,
  getSubmissionStatus,
  listenSubmissionStatus,
  processAdminKeyword,
  loginUser,
  registerUser,
  logoutUser,
  onUserStateChange
} from "./js/db.js";

// ===================================================
// i18n — Translations
// ===================================================
const i18n = {
  fr: {
    'nav.all': 'Tous', 'nav.vehicles': 'Véhicules', 'nav.paints': 'Peintures',
    'nav.maps': 'Maps', 'nav.misc': 'Divers', 'nav.upload': 'Upload',
    'nav.login': 'Se connecter', 'nav.contact': 'Contact',
    'marquee': 'Bienvenue sur ELIOUSH GAMING • Mods Euro Truck Simulator 2 • Téléchargements gratuits • Nouveaux mods régulièrement • Bienvenue sur ELIOUSH GAMING • Mods Euro Truck Simulator 2 • Téléchargements gratuits • Nouveaux mods régulièrement •',
    'search.placeholder': '🔍 Rechercher un mod...',
    'dl.truck': 'Chargement...', 'dl.mediafire': 'Télécharger', 'dl.routesync': 'RouteSync',
    'comments.title': 'Commentaires', 'comments.none': 'Aucun commentaire. Soyez le premier !',
    'comments.leave': 'Laisser un commentaire',
    'comments.sub': 'Votre adresse e-mail ne sera pas publiée. <strong>Seuls les commentaires respectueux sont acceptés.</strong>',
    'comments.placeholder': 'Ajouter un commentaire...',
    'comments.name': 'Nom *', 'comments.email': 'E-mail *',
    'comments.save': 'Enregistrez mon nom et e-mail dans ce navigateur pour mon prochain commentaire.',
    'comments.submit': 'Publier un commentaire',
    'login.title': 'Se connecter', 'login.sub': 'Nouveau ?',
    'login.create': 'Créer un compte', 'login.login': 'Se connecter',
    'login.registerTitle': 'Créer un compte', 'login.register': 'Créer un compte',
    'login.accountText': 'Nouveau ?', 'login.already': 'Déjà inscrit ?',
    'login.email': 'E-mail',
    'login.password': 'Mot de passe', 'login.confirmPassword': 'Confirmer le mot de passe',
    'login.steamId': 'Steam ID (optionnel)', 'login.steamIdHint': 'Entrez votre Steam ID ou utilisez le bouton Steam.',
    'login.forgot': 'Mot de passe oublié ?',
    'login.remember': 'Se souvenir de moi', 'login.btn': 'Connexion',
    'login.or': 'OU', 'login.steam': 'Continuer avec Steam',
    'login.steamNote': 'Uniquement pour les membres avec un compte Steam lié',
    'login.discord': 'Rejoindre et vérifier via Discord',
    'login.discordNote': 'Rejoignez le serveur Discord pour activer votre compte',
    'status.pending': '⏳ Votre mod est en cours d\'analyse. Restez à l\'écoute !',
    'status.approved': '✅ Votre mod a été <strong>approuvé</strong> et est maintenant publié !',
    'status.refused': '❌ Votre mod a été <strong>refusé</strong>. Contactez l\'admin pour plus d\'informations.',
    'status.review': '🔄 Votre mod nécessite des modifications : ',
    'pub.date': 'Publié le', 'pub.author': 'Auteur',
    'pg.of': 'sur',
    'upload.title': '📤 Soumettre un Mod',
    'contact.title': 'Nous contacter',
    'contact.sub': 'Une question, un mod à proposer, un bug à signaler ? Écrivez-nous directement.',
  },
  en: {
    'nav.all': 'All', 'nav.vehicles': 'Vehicles', 'nav.paints': 'Paints',
    'nav.maps': 'Maps', 'nav.misc': 'Misc', 'nav.upload': 'Upload',
    'nav.login': 'Sign In', 'nav.contact': 'Contact',
    'marquee': 'Welcome to ELIOUSH GAMING • Euro Truck Simulator 2 Mods • Free Downloads • New mods regularly • Welcome to ELIOUSH GAMING • Euro Truck Simulator 2 Mods • Free Downloads • New mods regularly •',
    'search.placeholder': '🔍 Search a mod...',
    'dl.truck': 'Loading...', 'dl.mediafire': 'Download', 'dl.routesync': 'RouteSync',
    'comments.title': 'Comments', 'comments.none': 'No comments yet. Be the first!',
    'comments.leave': 'Leave a comment',
    'comments.sub': 'Your email won\'t be published. <strong>Respectful comments only.</strong>',
    'comments.placeholder': 'Add a comment...',
    'comments.name': 'Name *', 'comments.email': 'Email *',
    'comments.save': 'Save my name and email for next time.',
    'comments.submit': 'Post comment',
    'login.title': 'Sign In', 'login.sub': 'New here?',
    'login.create': 'Create an account', 'login.login': 'Sign In',
    'login.registerTitle': 'Create an account', 'login.register': 'Create an account',
    'login.accountText': 'New here?', 'login.already': 'Already registered?',
    'login.email': 'Email',
    'login.password': 'Password', 'login.confirmPassword': 'Confirm password',
    'login.steamId': 'Steam ID (optional)', 'login.steamIdHint': 'Enter your Steam ID or use the Steam button.',
    'login.forgot': 'Forgot Password?',
    'login.remember': 'Remember me', 'login.btn': 'Login',
    'login.or': 'OR', 'login.steam': 'Continue with Steam',
    'login.steamNote': 'Only for members with a linked Steam account',
    'login.discord': 'Join and verify via Discord',
    'login.discordNote': 'Join the Discord server to activate your account',
    'status.pending': '⏳ Your mod is under review. Stay tuned!',
    'status.approved': '✅ Your mod has been <strong>approved</strong> and is now live!',
    'status.refused': '❌ Your mod was <strong>refused</strong>. Contact admin for more info.',
    'status.review': '🔄 Your mod needs changes: ',
    'pub.date': 'Published', 'pub.author': 'Author',
    'pg.of': 'of',
    'upload.title': '📤 Submit a Mod',
    'contact.title': 'Contact us',
    'contact.sub': 'A question, a mod to suggest, a bug to report? Write to us directly.',
  }
};

let currentLang = localStorage.getItem('eg_lang') || 'fr';
let loginMode = 'login';

function t(key) { return (i18n[currentLang] || i18n.fr)[key] || key; }

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[currentLang][key]) el.innerHTML = i18n[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === currentLang);
  });
  document.documentElement.lang = currentLang;
}

// Language switch buttons
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      localStorage.setItem('eg_lang', currentLang);
      applyTranslations();
      // Re-render showcase if on index
      if (typeof updateShowcase === 'function') updateShowcase();
      if (typeof updateLoginMode === 'function') updateLoginMode(loginMode);
    });
  });
  applyTranslations();
  const loginTitle = document.querySelector('.login-title');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const submitButton = document.querySelector('.login-btn-submit');
  const confirmPasswordField = document.querySelector('.register-only');

  function updateLoginMode(mode) {
    loginMode = mode;
    if (!loginTitle || !tabLogin || !tabRegister || !submitButton) return;

    tabLogin.classList.toggle('active', mode === 'login');
    tabLogin.setAttribute('aria-selected', mode === 'login');
    tabRegister.classList.toggle('active', mode === 'register');
    tabRegister.setAttribute('aria-selected', mode === 'register');

    if (mode === 'register') {
      loginTitle.textContent = t('login.registerTitle');
      submitButton.textContent = t('login.register');
      confirmPasswordField?.classList.remove('hidden');
    } else {
      loginTitle.textContent = t('login.title');
      submitButton.textContent = t('login.btn');
      confirmPasswordField?.classList.add('hidden');
    }
  }

  tabLogin?.addEventListener('click', () => updateLoginMode('login'));
  tabRegister?.addEventListener('click', () => updateLoginMode('register'));

  updateLoginMode('login');
});

// ===================================================
// THEME
// ===================================================
const toggleEl = document.getElementById("themeToggle");

function autoTheme() {
  const h = new Date().getHours();
  const isDark = h >= 18 || h < 6;
  document.body.classList.toggle("dark", isDark);
  if (toggleEl) toggleEl.checked = isDark;
}

if (toggleEl) {
  toggleEl.addEventListener("change", () => document.body.classList.toggle("dark"));
}
autoTheme();

// ===================================================
// HAMBURGER
// ===================================================
const hamburger = document.getElementById("hamburger");
const mainNav = document.getElementById("mainNav");
if (hamburger && mainNav) {
  hamburger.addEventListener("click", () => mainNav.classList.toggle("open"));
  // Referme le menu déroulant dès qu'un lien/bouton de navigation est utilisé,
  // sinon sur mobile il reste ouvert par-dessus la page après un clic.
  mainNav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => mainNav.classList.remove('open'));
  });
}

// ===================================================
// PAGE TRANSITION
// ===================================================
window.transitionTo = function(url) {
  const ov = document.createElement('div');
  ov.className = 'page-transition-overlay out-start';
  document.body.appendChild(ov);
  void ov.offsetWidth;
  ov.classList.add('out-end');
  setTimeout(() => { window.location.href = url; }, 560);
};

window.addEventListener('DOMContentLoaded', () => {
  const ov = document.createElement('div');
  ov.className = 'page-transition-overlay in-start';
  document.body.appendChild(ov);
  void ov.offsetWidth;
  ov.classList.add('in-end');
  setTimeout(() => ov.remove(), 560);
  loadComponents();
  initETSBackground();
});

// ===================================================
// ETS2 STYLE HIGHWAY BACKGROUND ANIMATION
// ===================================================
function initETSBackground() {
  const canvas = document.createElement('canvas');
  canvas.id = 'ets-bg-canvas';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let animationFrameId;

  // Star definitions (for night mode)
  const stars = [];
  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.42, // only in sky
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        blinkSpeed: Math.random() * 0.02 + 0.005
      });
    }
  }

  // Cloud definitions (for day mode)
  const clouds = [];
  function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < 4; i++) {
      clouds.push({
        x: Math.random() * 1.5 - 0.25,
        y: Math.random() * 0.2,
        scale: Math.random() * 0.8 + 0.4,
        speed: Math.random() * 0.0002 + 0.0001
      });
    }
  }

  // Traffic vehicles
  const vehicles = [];
  function spawnVehicle() {
    const isDark = document.body.classList.contains('dark');
    const type = Math.random() > 0.4 ? 'oncoming' : 'outgoing'; // Oncoming vs Outgoing
    
    // Oncoming on left lane, outgoing on right lane
    const xLat = type === 'oncoming' ? -0.25 : 0.25;
    const speed = type === 'oncoming' ? 0.18 : 0.04;
    
    vehicles.push({
      z: 20.0,
      xLat,
      type,
      speed,
      color: type === 'oncoming' 
        ? (Math.random() > 0.2 ? '#ffffff' : '#ffeaad') // White or warm headlight
        : '#ff2200' // Red taillights
    });
  }

  // Handle resizing
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
    initClouds();
  }
  window.addEventListener('resize', resize);
  resize();

  let offset = 0;
  const speed = 0.08; // road scroll speed
  let lastTime = 0;

  // Pre-populate some traffic
  for (let i = 0; i < 3; i++) {
    const type = Math.random() > 0.5 ? 'oncoming' : 'outgoing';
    vehicles.push({
      z: Math.random() * 15 + 3,
      xLat: type === 'oncoming' ? -0.25 : 0.25,
      type,
      speed: type === 'oncoming' ? 0.18 : 0.04,
      color: type === 'oncoming' ? '#ffffff' : '#ff2200'
    });
  }

  // Dashboard gauge needle angles
  let rpmNeedle = -120;
  let speedNeedle = -100;
  let rpmDirection = 1;
  let speedDirection = 1;

  function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(50, timestamp - lastTime) / 16.67; // normalize to 60fps
    lastTime = timestamp;

    const isDark = document.body.classList.contains('dark');

    // Update road speed
    offset = (offset + speed * dt) % 2.0;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const Yh = H * 0.45; // Horizon height
    const R_w = Math.min(W * 0.85, 1000); // Max road width at bottom

    // 1. SKY GRADIENT
    const skyGrad = ctx.createLinearGradient(0, 0, 0, Yh);
    if (isDark) {
      skyGrad.addColorStop(0, '#040712');
      skyGrad.addColorStop(1, '#0e1424');
    } else {
      skyGrad.addColorStop(0, '#82b1ff');
      skyGrad.addColorStop(1, '#e3f2fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, Yh);

    // 2. STARS (Dark) OR CLOUDS (Light)
    if (isDark) {
      stars.forEach(s => {
        s.alpha += s.blinkSpeed;
        if (s.alpha > 1 || s.alpha < 0.2) s.blinkSpeed = -s.blinkSpeed;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * Yh, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > 1.2) c.x = -0.2;
        
        ctx.beginPath();
        const cx = c.x * W;
        const cy = c.y * Yh;
        const scale = c.scale * (W / 1200);
        ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 25 * scale, cy - 10 * scale, 35 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 50 * scale, cy, 30 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 25 * scale, cy + 10 * scale, 25 * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 3. HORIZON SILHOUETTE (Mountains / Hills)
    ctx.beginPath();
    ctx.moveTo(0, Yh);
    ctx.fillStyle = isDark ? '#080c16' : '#9bb4c4';
    for (let x = 0; x <= W; x += 20) {
      const hill1 = Math.sin(x * 0.003) * 15;
      const hill2 = Math.cos(x * 0.007) * 8;
      ctx.lineTo(x, Yh - 10 + hill1 + hill2);
    }
    ctx.lineTo(W, Yh);
    ctx.closePath();
    ctx.fill();

    // 4. GROUND (Lower half)
    ctx.fillStyle = isDark ? '#0b0f19' : '#5c7a5c';
    ctx.fillRect(0, Yh, W, H - Yh);

    // Perspective projection helper
    function project(xLat, z) {
      const y = Yh + (H - Yh) / z;
      const x = W / 2 + xLat * (R_w / z);
      return { x, y };
    }

    // 5. ROAD SURFACE (Trapezoid)
    const roadTL = project(-0.5, 20.0);
    const roadTR = project(0.5, 20.0);
    const roadBR = project(0.5, 1.0);
    const roadBL = project(-0.5, 1.0);

    ctx.fillStyle = isDark ? '#141822' : '#454a54';
    ctx.beginPath();
    ctx.moveTo(roadTL.x, roadTL.y);
    ctx.lineTo(roadTR.x, roadTR.y);
    ctx.lineTo(roadBR.x, roadBR.y);
    ctx.lineTo(roadBL.x, roadBL.y);
    ctx.closePath();
    ctx.fill();

    // 6. ROAD SHOULDERS
    // Left shoulder (Solid Yellow in Dark, White in Light)
    ctx.strokeStyle = isDark ? '#ffbb00' : '#ffffff';
    ctx.beginPath();
    const lShoulderFar = project(-0.5, 20.0);
    const lShoulderNear = project(-0.5, 1.0);
    ctx.moveTo(lShoulderFar.x, lShoulderFar.y);
    ctx.lineTo(lShoulderNear.x, lShoulderNear.y);
    ctx.lineWidth = Math.max(1.5, R_w * 0.008);
    ctx.stroke();

    // Right shoulder (Solid White)
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    const rShoulderFar = project(0.5, 20.0);
    const rShoulderNear = project(0.5, 1.0);
    ctx.moveTo(rShoulderFar.x, rShoulderFar.y);
    ctx.lineTo(rShoulderNear.x, rShoulderNear.y);
    ctx.lineWidth = Math.max(1.5, R_w * 0.008);
    ctx.stroke();

    // 7. CENTER DIVISION LINES (Dashed White)
    ctx.strokeStyle = '#ffffff';
    const cycleLength = 2.0;
    const dashLength = 0.9;
    for (let i = 0; i < 15; i++) {
      const zStart = i * cycleLength - offset;
      const zEnd = zStart + dashLength;
      if (zEnd < 1.0 || zStart > 20.0) continue;
      const zS = Math.max(1.0, zStart);
      const zE = Math.min(20.0, zEnd);

      const pt1 = project(0.0, zS);
      const pt2 = project(0.0, zE);

      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y);
      ctx.lineTo(pt2.x, pt2.y);
      ctx.lineWidth = Math.max(1, (R_w * 0.006) / ((zS + zE) / 2));
      ctx.stroke();
    }

    // 8. STREET LIGHTS (Poles, light cones, lamps)
    const poleSpacing = 4.0;
    for (let i = 0; i < 8; i++) {
      const z = i * poleSpacing - (offset * (poleSpacing / 2.0));
      if (z < 1.0 || z > 20.0) continue;

      const xLatPole = 0.58; // right-side shoulder placement
      const poleHeight = 1.35;
      const basePt = project(xLatPole, z);
      const topPt = { x: basePt.x, y: basePt.y - (poleHeight * H * 0.22) / z };
      const lampPt = { x: topPt.x - (0.12 * W) / z, y: topPt.y };

      // Draw pole structure
      ctx.strokeStyle = isDark ? '#232a3d' : '#718096';
      ctx.lineWidth = Math.max(1, 4 / z);
      ctx.beginPath();
      ctx.moveTo(basePt.x, basePt.y);
      ctx.lineTo(topPt.x, topPt.y);
      ctx.lineTo(lampPt.x, lampPt.y);
      ctx.stroke();

      if (isDark) {
        // Draw ambient lighting cone
        const coneWidth = 0.35;
        const bottomL = project(xLatPole - 0.25, z);
        const bottomR = project(xLatPole + 0.15, z);

        const coneGrad = ctx.createLinearGradient(lampPt.x, lampPt.y, lampPt.x, basePt.y);
        coneGrad.addColorStop(0, 'rgba(255, 200, 80, 0.22)');
        coneGrad.addColorStop(0.8, 'rgba(255, 200, 80, 0.03)');
        coneGrad.addColorStop(1, 'rgba(255, 200, 80, 0)');
        
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lampPt.x, lampPt.y);
        ctx.lineTo(bottomL.x, bottomL.y);
        ctx.lineTo(bottomR.x, bottomR.y);
        ctx.closePath();
        ctx.fill();

        // Draw streetlight bulb glow
        const glowRad = Math.max(3, 10 / z);
        const bulbGrad = ctx.createRadialGradient(lampPt.x, lampPt.y, 0, lampPt.x, lampPt.y, glowRad);
        bulbGrad.addColorStop(0, '#ffffff');
        bulbGrad.addColorStop(0.3, '#ffdd77');
        bulbGrad.addColorStop(1, 'rgba(255, 221, 119, 0)');
        ctx.fillStyle = bulbGrad;
        ctx.beginPath();
        ctx.arc(lampPt.x, lampPt.y, glowRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 9. HIGHWAY TRAFFIC PARTICLES (Passing vehicles)
    if (Math.random() < 0.015 && vehicles.length < 8) {
      spawnVehicle();
    }

    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      v.z -= v.speed * dt;

      if (v.z < 1.0) {
        vehicles.splice(i, 1);
        continue;
      }

      // Draw vehicle bounding box silhouette
      const ptCenter = project(v.xLat, v.z);
      const carW = 0.06; 
      
      const ptL = project(v.xLat - carW, v.z);
      const ptR = project(v.xLat + carW, v.z);
      const scrW = Math.abs(ptR.x - ptL.x);
      const scrH = scrW * 0.65;

      ctx.fillStyle = isDark ? 'rgba(8, 10, 15, 0.95)' : 'rgba(70, 75, 85, 0.85)';
      ctx.beginPath();
      // roundRect helper
      ctx.roundRect(ptCenter.x - scrW/2, ptCenter.y - scrH, scrW, scrH, Math.max(1, 4 / v.z));
      ctx.fill();

      // Lights configuration
      const lightOffset = scrW * 0.32;
      const lX = ptCenter.x - lightOffset;
      const rX = ptCenter.x + lightOffset;
      const lightY = ptCenter.y - scrH * 0.35;
      const lightRad = Math.max(2, (v.type === 'oncoming' ? 12 : 7) / v.z);

      if (isDark) {
        // Left Light Glow
        const glowL = ctx.createRadialGradient(lX, lightY, 0, lX, lightY, lightRad * 1.8);
        glowL.addColorStop(0, v.color);
        glowL.addColorStop(0.3, v.color);
        glowL.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowL;
        ctx.beginPath();
        ctx.arc(lX, lightY, lightRad * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Right Light Glow
        const glowR = ctx.createRadialGradient(rX, lightY, 0, rX, lightY, lightRad * 1.8);
        glowR.addColorStop(0, v.color);
        glowR.addColorStop(0.3, v.color);
        glowR.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowR;
        ctx.beginPath();
        ctx.arc(rX, lightY, lightRad * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Light trails projecting forward for oncoming headlights
        if (v.type === 'oncoming') {
          ctx.fillStyle = 'rgba(255, 255, 230, 0.04)';
          ctx.beginPath();
          ctx.moveTo(lX, lightY);
          ctx.lineTo(lX - scrW * 2, H);
          ctx.lineTo(lX + scrW * 0.5, H);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(rX, lightY);
          ctx.lineTo(rX - scrW * 0.5, H);
          ctx.lineTo(rX + scrW * 2, H);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Day mode tiny indicator bulbs
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(lX, lightY, Math.max(1, 3/v.z), 0, Math.PI * 2);
        ctx.arc(rX, lightY, Math.max(1, 3/v.z), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 10. TRUCK COCKPIT / DASHBOARD SILHOUETTE
    // Draw Scania driver cabin dashboard border overlay at the bottom
    const dashH = H * 0.16; 
    const dashTopY = H - dashH;
    
    ctx.fillStyle = '#07090f'; 
    ctx.strokeStyle = '#101726';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - dashH * 0.4);
    ctx.bezierCurveTo(W * 0.1, H - dashH * 0.55, W * 0.15, H - dashH * 1.1, W * 0.35, H - dashH * 1.1);
    ctx.bezierCurveTo(W * 0.45, H - dashH * 1.1, W * 0.5, H - dashH * 0.5, W * 0.65, H - dashH * 0.5);
    ctx.bezierCurveTo(W * 0.75, H - dashH * 0.45, W * 0.9, H - dashH * 0.4, W, H - dashH * 0.3);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 11. GLOWING ETS2 INSTRUMENTS (Dashboard Gauge Console)
    const clusterX = W * 0.28;
    const clusterY = H - dashH * 0.6;
    const gaugeRadius = Math.max(15, dashH * 0.28);

    // Animate needles slightly
    rpmNeedle += rpmDirection * (Math.random() * 0.8 + 0.1);
    if (rpmNeedle > -20 || rpmNeedle < -130) rpmDirection = -rpmDirection;

    speedNeedle += speedDirection * (Math.random() * 0.6 + 0.1);
    if (speedNeedle > -10 || speedNeedle < -110) speedDirection = -speedDirection;

    function drawGauge(cx, cy, r, valAngle) {
      // Background ring
      ctx.strokeStyle = isDark ? 'rgba(255, 120, 0, 0.25)' : '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -140 * Math.PI / 180, -40 * Math.PI / 180);
      ctx.stroke();

      // Glowing amber dial markings
      ctx.strokeStyle = isDark ? '#ff6600' : '#475569';
      ctx.lineWidth = 1;
      for (let angle = -140; angle <= -40; angle += 20) {
        const rad = angle * Math.PI / 180;
        const x1 = cx + (r - 4) * Math.cos(rad);
        const y1 = cy + (r - 4) * Math.sin(rad);
        const x2 = cx + r * Math.cos(rad);
        const y2 = cy + r * Math.sin(rad);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Indicator needle
      const needleRad = valAngle * Math.PI / 180;
      const needleX = cx + (r - 3) * Math.cos(needleRad);
      const needleY = cy + (r - 3) * Math.sin(needleRad);
      
      ctx.strokeStyle = isDark ? '#ff3300' : '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(needleX, needleY);
      ctx.stroke();

      // Needle center cap
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left dial: RPM
    drawGauge(clusterX - gaugeRadius * 1.3, clusterY, gaugeRadius);
    // Right dial: Speed
    drawGauge(clusterX + gaugeRadius * 1.3, clusterY, gaugeRadius);

    // Central digital onboard computer screen
    if (isDark) {
      ctx.fillStyle = 'rgba(255, 102, 0, 0.7)';
      ctx.font = 'bold 9px Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText("90 km/h", clusterX, clusterY - 5);
      ctx.fillStyle = 'rgba(255, 102, 0, 0.4)';
      ctx.fillText("Gear D12", clusterX, clusterY + 8);
    }

    // 12. STEERING WHEEL OUTLINE
    ctx.strokeStyle = '#040508';
    ctx.lineWidth = Math.max(12, dashH * 0.32);
    ctx.beginPath();
    ctx.arc(clusterX, H + dashH * 0.1, gaugeRadius * 2.8, -120 * Math.PI / 180, -60 * Math.PI / 180);
    ctx.stroke();

    animationFrameId = requestAnimationFrame(animate);
  }

  // Start the background loop
  animationFrameId = requestAnimationFrame(animate);
}

// ===================================================
// COMPONENTS
// ===================================================
function loadComponents() {
  const w = document.getElementById("widget");
  const f = document.getElementById("footer");
  if (w) fetch("./components/widget.html").then(r => r.text()).then(d => { w.innerHTML = d; }).catch(() => { });
  if (f) fetch("./components/footer.html").then(r => r.text()).then(d => { f.innerHTML = d; }).catch(() => { });
}

window.toggleSocial = function () {
  const m = document.getElementById("socialMenu");
  if (m) m.classList.toggle("active");
};

// ===================================================
// LIGHTBOX
// ===================================================
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");

function openLightbox(src) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });

// ===================================================
// SHOWCASE (index.html)
// ===================================================
const showcaseImages = document.getElementById("showcaseImages");
const showcaseInfo = document.getElementById("showcaseInfo");
const paginationBar = document.getElementById("paginationBar");
const commentsSection = document.getElementById("commentsSection");

let filteredMods = [];
let currentPage = 0;

async function getAllMods() {
  if (typeof DB !== 'undefined') return await DB.getApprovedMods();
  if (typeof SEED_MODS !== 'undefined') return SEED_MODS;
  return [];
}

function getTypeIcon(type) {
  const m = { mediafire: 'fa-fire', sharemods: 'fa-share-alt', routesync: 'fa-rotate', autre: 'fa-download' };
  return `<i class="fa ${m[type] || m.autre}"></i>`;
}

async function renderShowcase(mod) {
  if (!showcaseImages || !showcaseInfo) return;

  // Images strip
  const imgs = (mod.images || []).slice(0, 4);
  showcaseImages.innerHTML = imgs.map(src =>
    `<img src="${src}" alt="${mod.title}" loading="lazy" title="Cliquer pour agrandir">`
  ).join('');
  showcaseImages.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
  });

  // Download buttons
  const links = (mod.links || []).slice(0, 2);
  const dlBtnsHtml = links.map((lnk, i) => {
    const cls = i === 0 ? 'dl-btn dl-btn-primary' : 'dl-btn dl-btn-secondary';
    const label = lnk.type === 'routesync' ? t('dl.routesync') : t('dl.mediafire');
    return `<button class="${cls}" data-url="${lnk.url}" data-mod-id="${mod.id}">
      <span class="btn-label">${getTypeIcon(lnk.type)} ${label}</span>
      <span class="truck-anim"><span class="truck-icon">🚛</span><span class="truck-progress"></span></span>
    </button>`;
  }).join('');

  const dlCount = typeof DB !== 'undefined' ? await DB.getDownloads(mod.id) : 0;
  const pubDate = mod.date ? `<span class="pub-date"><i class="fa fa-calendar"></i> ${t('pub.date')} ${mod.date}</span>` : '';
  const author = mod.author ? `<span class="pub-date"><i class="fa fa-user"></i> ${t('pub.author')} : ${mod.author}</span>` : '';

  showcaseInfo.innerHTML = `
    <div class="showcase-meta">
      <span class="cat-badge">${mod.cat}</span>
      <span class="dl-count"><i class="fa fa-download"></i> <span id="dlCounter_${mod.id}">${dlCount}</span></span>
      ${pubDate}
      ${author}
    </div>
    <h2 class="showcase-title">${mod.title}</h2>
    <p class="showcase-desc">${mod.desc}</p>
    <div class="download-buttons">${dlBtnsHtml}</div>
  `;

  // Truck animation on click
  showcaseInfo.querySelectorAll('.dl-btn[data-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      const id = btn.getAttribute('data-mod-id');
      if (url === '#' || !url) return;
      btn.classList.add('animating');
      try {
        const n = await incrementDownload(id);
        const counter = document.getElementById(`dlCounter_${id}`);
        if (counter) counter.textContent = n;
      } catch (e) { /* fallback silent */ }
      setTimeout(() => {
        btn.classList.remove('animating');
        window.open(url, '_blank');
      }, 1900);
    });
  });

  // Render comments
  renderComments(mod.id);
}

function renderPagination() {
  if (!paginationBar) return;
  const total = filteredMods.length;
  paginationBar.innerHTML = '';
  if (total === 0) return;

  const wheels = filteredMods.map((_, i) =>
    `<button class="pg-wheel${i === currentPage ? ' active' : ''}" data-idx="${i}" data-num="${i + 1}"></button>`
  ).join('');

  paginationBar.innerHTML = `
    <button class="pg-arrow" id="pgPrev" ${currentPage === 0 ? 'disabled' : ''}>&#8592;</button>
    <div class="pg-wheels">${wheels}</div>
    <span class="pg-info">${currentPage + 1} ${t('pg.of')} ${total}</span>
    <button class="pg-arrow" id="pgNext" ${currentPage === total - 1 ? 'disabled' : ''}>&#8594;</button>
  `;

  document.getElementById('pgPrev')?.addEventListener('click', () => { if (currentPage > 0) { currentPage--; updateShowcase(); } });
  document.getElementById('pgNext')?.addEventListener('click', () => { if (currentPage < filteredMods.length - 1) { currentPage++; updateShowcase(); } });
  paginationBar.querySelectorAll('.pg-wheel').forEach(w => {
    w.addEventListener('click', () => { currentPage = parseInt(w.dataset.idx); updateShowcase(); });
  });
}

async function updateShowcase() {
  if (!showcaseImages) return;
  if (filteredMods.length === 0) {
    showcaseImages.innerHTML = '';
    if (showcaseInfo) showcaseInfo.innerHTML = `<div class="no-results"><i class="fa fa-search"></i><br>${currentLang === 'fr' ? 'Aucun mod trouvé.' : 'No mods found.'}</div>`;
    if (commentsSection) commentsSection.style.display = 'none';
    renderPagination();
    return;
  }
  await renderShowcase(filteredMods[currentPage]);
  renderPagination();
}

async function filterMods(cat, keyword) {
  const all = await getAllMods();
  filteredMods = all.filter(m => {
    const matchCat = cat === 'tous' || cat === 'all' || m.cat === cat;
    const kw = (keyword || '').toLowerCase();
    const matchKw = !kw || m.title.toLowerCase().includes(kw);
    return matchCat && matchKw;
  });
  currentPage = 0;
  updateShowcase();
}

// Search
const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchDropdown");
async function renderSearchPreview(keyword) {
  if (!searchDropdown) return;
  const q = (keyword || '').trim().toLowerCase();
  if (!q) {
    searchDropdown.innerHTML = '';
    searchDropdown.classList.remove('visible');
    return;
  }

  const all = await getAllMods();
  const results = all
    .filter(m => m.title?.toLowerCase().includes(q))
    .slice(0, 5);

  if (results.length === 0) {
    searchDropdown.innerHTML = `<div class="search-empty">${currentLang === 'fr' ? 'Aucun mod ne correspond à votre recherche.' : 'No mods match your search.'}</div>`;
    searchDropdown.classList.remove('hidden');
    searchDropdown.classList.add('visible');
    return;
  }

  searchDropdown.innerHTML = results.map(mod => {
    const thumb = mod.images?.[0] || 'https://via.placeholder.com/120x120?text=Mod';
    return `
      <div class="search-item" data-id="${encodeURIComponent(mod.id)}">
        <img class="search-item-thumb" src="${thumb}" alt="${mod.title}">
        <div>
          <div class="search-item-title">${mod.title}</div>
          <div class="search-item-cat">${mod.cat || ''}</div>
        </div>
      </div>
    `;
  }).join('');
  searchDropdown.classList.remove('hidden');
  searchDropdown.classList.add('visible');
  searchDropdown.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = decodeURIComponent(item.dataset.id || '');
      if (!id) return;
      searchDropdown.classList.remove('visible');
      // Toujours naviguer directement vers la fiche du mod via son id,
      // comme le fait la preview de recherche d'anime-sama.
      transitionTo(`index.html?id=${encodeURIComponent(id)}`);
    });
  });
}

// Init showcase on index.html
if (showcaseImages) {
  const urlParams = new URLSearchParams(window.location.search);
  const initCat = urlParams.get('cat') || 'tous';
  const initQuery = urlParams.get('q') || '';
  const initId = urlParams.get('id');

  if (searchInput && initQuery) {
    searchInput.value = initQuery;
  }

  document.querySelectorAll('.nav-btn[data-cat]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === initCat);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.history.pushState({}, '', '?cat=' + btn.dataset.cat);
      filterMods(btn.dataset.cat, document.getElementById('searchInput')?.value || '');
    });
  });

  if (initId !== null) {
    getAllMods().then(all => {
      const target = all.find(m => String(m.id) === String(initId));
      if (target) {
        filteredMods = all.filter(m => m.cat === target.cat);
        const pg = filteredMods.findIndex(m => String(m.id) === String(initId));
        currentPage = pg >= 0 ? pg : 0;
      } else {
        // Id inconnu (mod supprimé, lien obsolète...) : on retombe sur la liste complète.
        filteredMods = all;
        currentPage = 0;
      }
      updateShowcase();
    });
  } else {
    filterMods(initCat, initQuery);
  }
}

if (searchInput) {
  searchInput.addEventListener("input", async () => {
    const cat = document.querySelector('.nav-btn.active')?.dataset.cat || 'tous';
    filterMods(cat, searchInput.value);
    await renderSearchPreview(searchInput.value);
  });
  searchInput.addEventListener('focus', async () => {
    await renderSearchPreview(searchInput.value);
  });
  document.addEventListener('click', e => {
    if (!searchDropdown || !searchInput) return;
    if (e.target !== searchInput && !searchDropdown.contains(e.target)) {
      searchDropdown.classList.remove('visible');
    }
  });
}

// ===================================================
// COMMENTS
// ===================================================
async function renderComments(modId) {
  if (!commentsSection) return;
  commentsSection.style.display = 'block';

  const comments = typeof DB !== 'undefined' ? await DB.getComments(modId) : [];
  const saved = JSON.parse(localStorage.getItem('eg_comment_info') || '{}');

  const commentsListHtml = comments.length === 0
    ? `<p class="no-comments">${t('comments.none')}</p>`
    : comments.map(c => `
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-avatar">${c.avatar || c.author.charAt(0).toUpperCase()}</div>
            <span class="comment-author">${c.author}</span>
            <span class="comment-date">${c.date}</span>
          </div>
          <p class="comment-body">${c.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>`).join('');

  commentsSection.innerHTML = `
    <h3><i class="fa fa-comments"></i> ${t('comments.title')}</h3>
    <p class="comments-count">${comments.length} commentaire${comments.length !== 1 ? 's' : ''}</p>
    <div class="comments-list">${commentsListHtml}</div>

    <div class="comment-form-title">${t('comments.leave')}</div>
    <p class="comment-form-sub">${t('comments.sub')}</p>
    <div id="commentMsg" class="comment-msg" style="display:none;"></div>

    <textarea class="comment-textarea" id="commentBody" placeholder="${t('comments.placeholder')}"></textarea>
    <div class="comment-fields">
      <input type="text" id="commentAuthor" placeholder="${t('comments.name')}" value="${saved.author || ''}">
      <input type="email" id="commentEmail" placeholder="${t('comments.email')}" value="${saved.email || ''}">
    </div>
    <div class="comment-save-row">
      <input type="checkbox" id="saveCommentInfo">
      <label class="comment-save-label" for="saveCommentInfo">${t('comments.save')}</label>
    </div>
    <button class="comment-submit-btn" id="commentSubmit" data-mod-id="${modId}">
      <i class="fa fa-paper-plane"></i> ${t('comments.submit')}
    </button>
  `;

  document.getElementById('commentSubmit')?.addEventListener('click', async () => {
    const body = document.getElementById('commentBody')?.value.trim();
    const author = document.getElementById('commentAuthor')?.value.trim();
    const email = document.getElementById('commentEmail')?.value.trim();
    const save = document.getElementById('saveCommentInfo')?.checked;
    const msg = document.getElementById('commentMsg');

    if (!body || !author || !email) {
      if (msg) { msg.style.display = 'block'; msg.className = 'comment-msg error'; msg.textContent = currentLang === 'fr' ? 'Veuillez remplir tous les champs.' : 'Please fill all fields.'; }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (msg) { msg.style.display = 'block'; msg.className = 'comment-msg error'; msg.textContent = currentLang === 'fr' ? 'Email invalide.' : 'Invalid email.'; }
      return;
    }

    if (save) localStorage.setItem('eg_comment_info', JSON.stringify({ author, email }));

    try { await addComment(modId, { author, email, body }); } catch (e) { /* silent */ }

    if (msg) { msg.style.display = 'block'; msg.className = 'comment-msg success'; msg.textContent = currentLang === 'fr' ? '✅ Commentaire publié !' : '✅ Comment posted!'; }
    setTimeout(() => renderComments(modId), 800);
  });
}

// ===================================================
// STATUS POLLING — Check mod submission status
// ===================================================
async function checkModStatus(email, sub) {
  if (!sub && typeof DB !== 'undefined') sub = await DB.getSubmissionStatus(email);
  if (!sub) return;
  const statusEl = document.getElementById('submissionStatus');
  if (!statusEl) return;

  if (sub.status === 'pending') {
    statusEl.className = 'submission-status pending';
    statusEl.innerHTML = t('status.pending');
  } else if (sub.status === 'approved') {
    statusEl.className = 'submission-status approved';
    statusEl.innerHTML = t('status.approved');
  } else if (sub.status === 'refused') {
    statusEl.className = 'submission-status refused';
    statusEl.innerHTML = t('status.refused');
  } else if (sub.status === 'review') {
    statusEl.className = 'submission-status review';
    statusEl.innerHTML = t('status.review') + '<br>' + (sub.statusMsg || '');
  }
  statusEl.style.display = 'block';
}

// Admin keyword simulation —
// In production this would be triggered by a webhook from the email/WhatsApp gateway.
// For now: the admin opens the URL: ?admin_action=approuvé&email=user@email.com
(async function checkAdminAction() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('admin_action');
  const email = params.get('email');
  if (action && email && typeof DB !== 'undefined') {
    const result = await DB.processAdminKeyword(action, email);
    if (result) {
      // Remove params from URL
      window.history.replaceState({}, '', window.location.pathname);
      if (result.status === 'approved') {
        alert(`✅ Mod "${result.title}" approuvé et publié automatiquement !`);
      }
    }
  }
})();

// ===================================================
// UPLOAD FORM (upload.html)
// ===================================================
const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {
  // Title counter
  const modTitleInput = document.getElementById("modTitle");
  const titleCount = document.getElementById("titleCount");
  modTitleInput?.addEventListener("input", () => {
    if (titleCount) titleCount.textContent = modTitleInput.value.length;
  });

  // Image inputs (max 4)
  let imageCount = 1;
  const addImageBtn = document.getElementById("addImageBtn");
  const imageInputs = document.getElementById("imageInputs");

  addImageBtn?.addEventListener("click", () => {
    if (imageCount >= 4) return;
    imageCount++;
    const row = document.createElement("div");
    row.className = "image-input-row";
    row.innerHTML = `<input type="url" class="mod-image-input" placeholder="https://...">
      <button type="button" class="add-image-btn remove-img-btn"><i class="fa fa-minus"></i></button>`;
    row.querySelector(".remove-img-btn").addEventListener("click", () => {
      row.remove(); imageCount--;
      if (addImageBtn) addImageBtn.disabled = false;
    });
    imageInputs?.appendChild(row);
    if (imageCount >= 4 && addImageBtn) addImageBtn.disabled = true;
  });

  // Second DL link
  const addLinkBtn = document.getElementById("addLinkBtn");
  const dlRow2 = document.getElementById("dlRow2");
  addLinkBtn?.addEventListener("click", () => {
    if (dlRow2) dlRow2.style.display = "flex";
    if (addLinkBtn) addLinkBtn.style.display = "none";
  });

  function validateField(id, errorId, check, msg) {
    const el = document.getElementById(id);
    const er = document.getElementById(errorId);
    if (!el || !er) return true;
    if (!check(el.value)) { er.textContent = msg; el.style.borderColor = "#e53935"; return false; }
    er.textContent = ""; el.style.borderColor = ""; return true;
  }

  uploadForm.addEventListener("submit", async e => {
    e.preventDefault();
    let valid = true;

    valid &= validateField("modTitle", "modTitleError", v => v.trim().length >= 3, currentLang === 'fr' ? "Titre trop court." : "Title too short.");
    valid &= validateField("modAuthor", "modAuthorError", v => v.trim().length >= 2, currentLang === 'fr' ? "Entrez votre pseudo." : "Enter your name.");
    valid &= validateField("modEmail", "modEmailError", v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), currentLang === 'fr' ? "Email invalide." : "Invalid email.");
    valid &= validateField("modCat", "modCatError", v => v !== "", currentLang === 'fr' ? "Choisissez une catégorie." : "Choose a category.");
    valid &= validateField("modVersion", "modVersionError", v => v.trim().length >= 2, currentLang === 'fr' ? "Indiquez la version ETS2." : "Enter ETS2 version.");
    valid &= validateField("modDesc", "modDescError", v => v.trim().length >= 30, currentLang === 'fr' ? "Description trop courte (30 car. min)." : "Description too short (30 chars min).");
    valid &= validateField("dlLink1", "dlLinkError", v => v.startsWith("http"), currentLang === 'fr' ? "Lien invalide." : "Invalid link.");

    const imgInputs = document.querySelectorAll(".mod-image-input");
    const imgError = document.getElementById("modImagesError");
    const validImgs = Array.from(imgInputs).filter(i => i.value.trim().startsWith("http"));
    if (validImgs.length === 0) {
      if (imgError) imgError.textContent = currentLang === 'fr' ? "Ajoutez au moins une image valide." : "Add at least one valid image.";
      valid = false;
    } else { if (imgError) imgError.textContent = ""; }

    const terms = document.getElementById("acceptTerms");
    const termsErr = document.getElementById("termsError");
    if (terms && !terms.checked) {
      if (termsErr) termsErr.textContent = currentLang === 'fr' ? "Acceptez les conditions." : "Accept the terms.";
      valid = false;
    } else { if (termsErr) termsErr.textContent = ""; }

    if (!valid) return;

    // Gather values
    const title = document.getElementById("modTitle").value.trim();
    const author = document.getElementById("modAuthor").value.trim();
    const email = document.getElementById("modEmail").value.trim();
    const cat = document.getElementById("modCat").value;
    const version = document.getElementById("modVersion").value.trim();
    const desc = document.getElementById("modDesc").value.trim();
    const images = validImgs.map(i => i.value.trim());
    const dl1Type = document.getElementById("dlType1")?.value || "mediafire";
    const dl1Link = document.getElementById("dlLink1").value.trim();
    const dl2Type = document.getElementById("dlType2")?.value || "";
    const dl2Link = document.getElementById("dlLink2")?.value.trim() || "";
    const date = new Date().toLocaleDateString("fr-FR");

    // Save as pending submission in DB
    const submissionData = { title, author, email, cat, version, desc, images, dl1Type, dl1Link, dl2Type, dl2Link };
    if (typeof DB !== 'undefined') await DB.addPendingSubmission(submissionData);

    // CSV content
    const csvContent = `Date,Titre,Auteur,Email,Catégorie,Version ETS2,Description,Images,Lien DL 1,Lien DL 2\n"${date}","${title}","${author}","${email}","${cat}","${version}","${desc.replace(/\n/g, ' | ')}","${images.join(' | ')}","${dl1Type}: ${dl1Link}","${dl2Type}: ${dl2Link}"`;

    const subject = encodeURIComponent(`[ELIOUSH GAMING] Nouveau mod : ${title}`);
    const emailBody = encodeURIComponent(
      `Bonjour Admin,

Nouveau mod soumis sur ELIOUSH GAMING.

=== INFORMATIONS ===
Titre     : ${title}
Auteur    : ${author}
Email     : ${email}
Catégorie : ${cat}
Version   : ${version}
Date      : ${date}

Description :
${desc}

Images :
${images.join('\n')}

Liens :
1. ${dl1Type} → ${dl1Link}
${dl2Link ? `2. ${dl2Type} → ${dl2Link}` : ''}

=== CSV ===
${csvContent}

---
INSTRUCTIONS ADMIN :
Répondez à l'email de l'auteur (${email}) avec l'un de ces mots EXACTEMENT :
  • approuvé   → publie le mod automatiquement
  • refusé     → notifie l'auteur du refus
  • A revoir : [vos précisions] → indique les points à corriger

Ou via WhatsApp, envoyez le même mot clé avec l'email : ${email}
---
Elioush Gaming Bot`
    );

    const waText = encodeURIComponent(`[ELIOUSH GAMING] Nouveau mod: *${title}*\nAuteur: ${author} (${email})\nCatégorie: ${cat} | ETS2 ${version}\nDL: ${dl1Link}\n\nRépondez: "approuvé", "refusé" ou "A revoir : [précisions]"\n(Include email: ${email})`);
    const waLink = `https://wa.me/+2250170184563?text=${waText}`;
    const mailtoLink = `mailto:van272581@gmail.com?subject=${subject}&body=${emailBody}`;

    const formMessage = document.getElementById("formMessage");
    if (formMessage) {
      formMessage.style.display = "block";
      formMessage.className = "form-message success";
      formMessage.innerHTML = `
        <p>✅ <strong>${currentLang === 'fr' ? 'Formulaire validé !' : 'Form validated!'}</strong>
        ${currentLang === 'fr'
          ? `Votre mod <strong>"${title}"</strong> est en cours d'analyse. Restez à l'écoute sur votre mail <em>${email}</em>.`
          : `Your mod <strong>"${title}"</strong> is under review. Watch your inbox at <em>${email}</em>.`}
        </p>
        <div id="submissionStatus" class="submission-status pending" style="margin-top:10px;">
          ⏳ ${currentLang === 'fr' ? 'Statut : En attente de validation...' : 'Status: Awaiting validation...'}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
          <a href="${mailtoLink}" class="dl-btn dl-btn-primary" style="font-size:14px;padding:11px 20px;min-width:0;">
            <i class="fa fa-envelope"></i> ${currentLang === 'fr' ? 'Envoyer par Email' : 'Send by Email'}
          </a>
          <a href="${waLink}" target="_blank" class="dl-btn dl-btn-secondary" style="font-size:14px;padding:11px 20px;min-width:0;">
            <i class="fa-brands fa-whatsapp"></i> ${currentLang === 'fr' ? 'Envoyer via WhatsApp' : 'Send via WhatsApp'}
          </a>
        </div>
      `;
      // Real-time status listener via Firebase (or polling fallback)
      if (typeof DB !== 'undefined') {
        DB.listenSubmissionStatus(email, (sub) => {
          checkModStatus(email, sub);
          if (sub.status === 'approved') {
            if (typeof filterMods === 'function') filterMods('tous', '');
          }
        });
      }
    }

    uploadForm.reset();
    imageCount = 1;
    if (titleCount) titleCount.textContent = "0";
    if (dlRow2) dlRow2.style.display = "none";
    if (addLinkBtn) addLinkBtn.style.display = "";
    if (addImageBtn) addImageBtn.disabled = false;
    document.querySelectorAll(".remove-img-btn").forEach(b => b.closest(".image-input-row")?.remove());
    formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  uploadForm.querySelectorAll("input, select, textarea").forEach(el => {
    el.addEventListener("input", () => { el.style.borderColor = ""; });
  });

  const resetBtn = document.getElementById("resetBtn");
  resetBtn?.addEventListener("click", () => {
    const fm = document.getElementById("formMessage");
    if (fm) { fm.style.display = "none"; fm.innerHTML = ""; }
    imageCount = 1;
    if (titleCount) titleCount.textContent = "0";
    if (dlRow2) dlRow2.style.display = "none";
    if (addLinkBtn) addLinkBtn.style.display = "";
    if (addImageBtn) addImageBtn.disabled = false;
    document.querySelectorAll(".remove-img-btn").forEach(b => b.closest(".image-input-row")?.remove());
  });
}

// ===================================================
// LOGIN PAGE
// ===================================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const confirmPassword = document.getElementById("loginConfirmPassword")?.value;
    const steamId = document.getElementById("loginSteamId")?.value.trim();
    const status = document.getElementById("loginStatus");

    if (!email || !password) return;

    if (typeof DB === 'undefined') return;

    if (status) {
      status.style.display = 'block';
      status.className = 'login-status info';
      status.textContent = currentLang === 'fr' ? '⏳ Traitement en cours...' : '⏳ Processing...';
    }

    try {
      if (loginMode === 'register') {
        if (!confirmPassword || confirmPassword !== password) {
          throw new Error(currentLang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
        }

        await DB.registerUser(email, password, email.split('@')[0], steamId || null);

        if (status) {
          status.className = 'login-status success';
          status.textContent = currentLang === 'fr'
            ? '✅ Compte créé avec succès ! Redirection...'
            : '✅ Account created successfully! Redirecting...';
        }
      } else {
        const user = await DB.loginUser(email, password);
        if (steamId && user) {
          await DB.linkSteamIdToCurrentUser(steamId);
        }

        if (status) {
          status.className = 'login-status success';
          status.textContent = currentLang === 'fr'
            ? '✅ Connexion réussie ! Redirection...'
            : '✅ Login successful! Redirecting...';
        }
      }

      setTimeout(() => transitionTo('index.html'), 1200);
    } catch (error) {
      if (status) {
        status.className = 'login-status error';
        status.textContent = error.message || (currentLang === 'fr' ? 'Erreur de connexion.' : 'Login error.');
      }
    }
  });

  // Discord button — check join then verify
  document.getElementById("discordBtn")?.addEventListener("click", e => {
    e.preventDefault();
    window.open("https://discord.gg/CM7JNnd3Uc", "_blank");
    const status = document.getElementById("loginStatus");
    if (status) {
      status.style.display = 'block';
      status.className = 'login-status info';
      status.innerHTML = currentLang === 'fr'
        ? '🔗 Rejoignez le serveur Discord puis revenez ici. Une fois membre, votre accès sera activé.'
        : '🔗 Join the Discord server then come back. Once a member, your access will be activated.';
    }
  });
}
