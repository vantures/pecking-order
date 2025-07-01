// Maximum number of players supported
const MAX_PLAYERS = 5;

// Names of birds that get captured by the swooping eagle – appended to results last
const capturedNames = [];

// List of bird image paths (place bird images in assets/birds/)
const birdImages = [
  'assets/birds/brown_pelican.png',
  'assets/birds/little_penguin.png',
  'assets/birds/musk_duck.png',
  'assets/birds/american_goldfinch.png',
  'assets/birds/common_raven.png',
  'assets/birds/franklins_gull.png',
  'assets/birds/killdeer.png',
  'assets/birds/annas_hummingbird.png',
  'assets/birds/painted_bunting.png',
  'assets/birds/bald_eagle.png',
  'assets/birds/trumpeter_swan.png',
  'assets/birds/california_condor.png',
  'assets/birds/baltimore_oriole.png',
  'assets/birds/kakapo.png',
];

// ───────────────────────────────────────────────────────────
// DOM elements
// ───────────────────────────────────────────────────────────
const inputsDiv = document.getElementById('inputs');
const addBtn    = document.getElementById('add');
const form      = document.getElementById('setup');
const track     = document.getElementById('track');
const startBtn  = document.querySelector('#setup button[type="submit"], #start');
const title     = document.getElementById('title');
const fullBtn   = document.getElementById('fullscreenBtn');
const rotateTip = document.getElementById('rotateTip');
const fsMsg     = document.getElementById('fullscreenMsg');

// ───────────────────────────────────────────────────────────
// Persistent player name storage
// ───────────────────────────────────────────────────────────
const STORAGE_KEY = 'playerNames';

function saveNames() {
  try {
    const names = [...inputsDiv.querySelectorAll('input')].map(inp => inp.value.trim());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch (_) {/* storage unavailable or disabled */}
}

function loadSavedNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    saved.slice(0, MAX_PLAYERS).forEach((name, idx) => {
      if (!inputsDiv.children[idx]) addInput();
      inputsDiv.children[idx].value = name;
    });
  } catch (_) {/* ignore malformed data */}
}

// Start with five player input boxes
for (let i = 0; i < MAX_PLAYERS; i++) addInput();

// Load any saved player names from previous sessions
loadSavedNames();

if (startBtn) startBtn.onclick = handleStartClick;

if(title) title.onclick = () => location.reload();

// Show fullscreen prompt button on mobile portrait
function isChromeAndroid(){
  if(!isMobile()) return false;
  const ua = navigator.userAgent;
  // True Chrome on Android includes "Chrome" but NOT "CriOS" (iOS), Edge, Opera, Samsung
  return /Chrome/i.test(ua) && !/CriOS|Edg|OPR|SamsungBrowser/i.test(ua);
}

function isIOS(){
  const ua = navigator.userAgent;
  const iOSDevice = /iP(hone|od|ad)/i.test(ua);
  // iPadOS 13+ reports MacIntel; detect via touch points
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function updateFsBtnVisibility(){
  const mobilePortrait = isMobile() && window.matchMedia('(orientation: portrait)').matches;
  const chromeAndroid  = isChromeAndroid();

  // Full-screen button only for Chrome on Android (mobile Chrome AND not iOS)
  const showFs = mobilePortrait && chromeAndroid;
  if(fullBtn)   fullBtn.classList.toggle('hidden', !showFs);
  if(fsMsg)     fsMsg.classList.toggle('hidden', !showFs);

  // Rotate tip for any mobile portrait scenario where fullscreen isn't offered
  const showTip = mobilePortrait && !showFs;
  if(rotateTip) rotateTip.classList.toggle('hidden', !showTip);
}

if(fullBtn){
  fullBtn.onclick = async ()=>{
     await attemptFullscreen();
     updateFsBtnVisibility();
  };
  // initial check
  updateFsBtnVisibility();
  // update on orientation change or resize
  window.addEventListener('orientationchange', updateFsBtnVisibility);
  window.addEventListener('resize', updateFsBtnVisibility);
}

function addInput() {
  if (inputsDiv.children.length >= MAX_PLAYERS) return;
  const inp = document.createElement('input');
  inp.placeholder = 'Player name';
  // not required – players may leave blanks
  inputsDiv.appendChild(inp);
  // Persist any changes immediately
  inp.addEventListener('input', saveNames);
}

function startRace(e) {
  if(e && e.preventDefault) e.preventDefault();

  // prevent multiple
  if (document.body.dataset.raceStarted) return;
  document.body.dataset.raceStarted = 'yes';

  // Start background music once per session
  if(bgMusic.paused){
     bgMusic.currentTime = 0;
     bgMusic.volume = 0.5; // moderate level beneath SFX
     bgMusic.play().catch(()=>{});
  }

  // Collect trimmed non-empty names
  const names = [...inputsDiv.querySelectorAll('input')]
      .map(inp => inp.value.trim())
      .filter(v => v.length);

  if (!names.length) return;

  // Persist the latest names list
  saveNames();

  // Hide form, show track
  form.classList.add('hidden');
  document.body.classList.add('no-scroll');
  const noteEl = document.getElementById('landscapeNote');
  if (noteEl) noteEl.style.display = 'none';
  const subEl = document.getElementById('subtitle');
  if(subEl) subEl.style.display='none';
  const imgEl = document.getElementById('landingImage');
  if(imgEl) imgEl.style.display='none';
  track.classList.remove('hidden');

  // Shuffle birds and pick as many as we need
  const birds = shuffle([...birdImages]).slice(0, names.length);

  const finishX = window.innerWidth - 120; // distance to finish line
  let winnerDeclared = false;
  const racers = [];

  // No flipping birds
  const spinIndices = [];

  // dynamic lane spacing so birds fit; tighter stacking
  const usableHeight = window.innerHeight - 60; // track height approximated
  const laneSpacing = Math.min(120, usableHeight / names.length);

  names.forEach((name, idx) => {
    // Create wrapper that will be animated
    const wrapper = document.createElement('div');
    wrapper.className = 'bird-wrapper';
    wrapper.style.top = `${idx * laneSpacing}px`;

    // Label for the player's name
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = name;
    wrapper.appendChild(label);

    // Bird image – size based on lane spacing to fit small screens
    const img = document.createElement('img');
    img.src = birds[idx];
    img.alt = `${name}'s bird`;
    const imgWidth = Math.round(laneSpacing * 1.4); // scale factor – tweak if needed
    img.style.width = `${imgWidth}px`;
    wrapper.appendChild(img);

    // Enable 3D flip effect
    wrapper.style.perspective = '800px';
    img.style.backfaceVisibility = 'hidden';

    // Baseline flight duration with a bit more variability
    const baseDuration = 11;
    const speedFactor  = gsap.utils.random(0.85, 1.1);
    const duration     = baseDuration * speedFactor;

    // Flight styles
    const isCrazy   = Math.random() < 0.1;   // ~10% chance
    const isSwooper = true;                  // all birds still swoop

    // Create tween but keep paused until countdown done
    const travelEase = 'none';
    gsap.set(wrapper,{x:0});
    wrapper._tween = gsap.to(wrapper,{x:finishX,duration,ease:travelEase,paused:true});

    // Motion flair
    if (isSwooper) {
      // Flight path parameters
      const amplitude = isCrazy
        ? gsap.utils.random(1.0 * laneSpacing, 1.6 * laneSpacing)
        : gsap.utils.random(0.4 * laneSpacing, 0.8 * laneSpacing);

      const period = isCrazy
        ? gsap.utils.random(0.5, 0.9) // fast flap for crazy birds
        : 1.0 + Math.random() * 1.2;  // 1-2.2s gentle swoop

      // Vertical sine wave (S-curve)
      wrapper._sine = gsap.to(wrapper, {
        y: `+=${amplitude}`,
        repeat: -1,
        yoyo: true,
        duration: period,
        ease: "sine.inOut",
      });

      // Wing tilt / wobble rotation
      gsap.to(wrapper, {
        rotation: () => gsap.utils.random(isCrazy ? -45 : -20, isCrazy ? 45 : 20),
        repeat: -1,
        yoyo: true,
        duration: period * 0.8,
        ease: "sine.inOut",
      });

      if (isCrazy) {
        // Subtle left-right shimmy for personality (kept gentle)
        const jitter = Math.min(8, laneSpacing * 0.2); // cap at 8px
        gsap.to(wrapper, {
          xPercent: "+=2",          // subtle left/right using percent so it doesn't fight x pixel tween
          yoyo: true,
          repeat: -1,
          duration: 0.55,
          ease: "sine.inOut",
          overwrite: "none",        // keep _tween intact
        });
      }
    }

    // Persist crazy flag for later behaviors
    racers.push({ el: wrapper, name, finished:false, crazy:isCrazy, img, laneSpacing });

    track.appendChild(wrapper);
  });

  // Show countdown
  const cdOverlay = document.getElementById('countdownOverlay');
  const cdText    = document.getElementById('countdownText');
  cdOverlay.classList.remove('hidden');
  cdOverlay.style.opacity = 1;

  const nums = ['3','2','1','Go!'];
  let idx=0;
  function tick(){
     const current = nums[idx];
     cdText.textContent = current;

     // Play countdown sounds: crow for 3,2,1; owl starts half-second before "Go!"
     if(current === 'Go!'){
        // No sound exactly at "Go!" – owl already triggered 0.5 s earlier
     } else {
        // Play crow caw for the visible number
        crowSFX.currentTime = 0;
        crowSFX.play().catch(()=>{});

        // When the last number "1" shows, queue the owl hoot so it begins 0.5 s
        // before the next tick reveals "Go!" (which fires 1 s later)
        if(current === '1'){
           setTimeout(()=>{
              owlSFX.currentTime = 0;
              owlSFX.play().catch(()=>{});
           }, 500);
        }
     }

     idx++;
     if(idx<nums.length){ setTimeout(tick,1000);} else {
        gsap.to(cdOverlay,{opacity:0,duration:0.5,onComplete:()=>cdOverlay.classList.add('hidden')});
        racers.forEach(r=>{
           if(r.el._tween){
              r.el._tween.play();
              maybeAdjustSpeed(r.el._tween);
              if(r.crazy) scheduleLoop(r);
           }
        });
        raceStarted=true;

        // 20% chance the owl swoops in this race
        if(Math.random() < 0.20) {
           scheduleEagle();
        }

        // Start ambience loops after "Go!"
        flappingSFX.currentTime = 0;
        flappingSFX.play().catch(()=>{});
        parrotsSFX.currentTime = 0;
        parrotsSFX.play().catch(()=>{});
        sparrowSFX.currentTime = 0;
        sparrowSFX.play().catch(()=>{});
     }
  }
  tick();

  const finishOrder = [];
  const FINISH_OFFSET = 30; // px from right edge considered finish
  if (!window._peckingFinishTicker) {
    window._peckingFinishTicker = gsap.ticker.add(() => {
      if (!raceStarted) return;
      for (const r of racers) {
        if(r.finished || r.captured) continue;
        const rect = r.el.getBoundingClientRect();
        if (rect.right >= window.innerWidth - FINISH_OFFSET) {
          r.finished=true;
          finishOrder.push(r.name);
          if (!winnerDeclared) {
            winnerDeclared = true;
            announceWinner(r);
          } else {
            dropDead(r);
          }
          // When all birds finished, show results after short delay
          if(finishOrder.length === racers.length){
            // Stop ambience loops
            flappingSFX.pause();
            flappingSFX.currentTime = 0;
            parrotsSFX.pause();
            parrotsSFX.currentTime = 0;
            sparrowSFX.pause();
            sparrowSFX.currentTime = 0;

            gsap.delayedCall(1, ()=>showResults(finishOrder));
          }
        }
      }
    });
  }

  // ───────────────────────────────────────────────────────────
  // Eagle swoop – grabs a random racer mid-flight
  // ───────────────────────────────────────────────────────────
  function scheduleEagle(){
    // Launch the eagle a bit after the race begins (2–4 s)
    const delay = gsap.utils.random(2,4);
    gsap.delayedCall(delay, launchEagle);
  }

  function launchEagle(){
    // Choose a random racer that is still alive and not already captured
    const potentials = racers.filter(r=>!r.finished && !r.captured);
    if(!potentials.length) return;
    const target = potentials[Math.floor(Math.random() * potentials.length)];

    // Create owl image (great horned owl sprite – rendered larger)
    const eagle = document.createElement('img');
    eagle.src = 'assets/predators/great_horned_owl.png';
    eagle.className = 'eagle';
    Object.assign(eagle.style, {
      position: 'fixed',
      left: '0px',   // use transform for movement
      top:  '0px',
      width: '170px',
      zIndex: 9999,
      pointerEvents: 'none',
      transform: 'rotate(20deg)',
    });
    // Start off-screen (top-left) using transform translate
    gsap.set(eagle,{x:-250,y:-250});
    document.body.appendChild(eagle);

    // Calculate where to intercept the bird – position eagle so talons overlap the bird
    const rect = target.el.getBoundingClientRect();
    // Use fixed dimensions (image may not be loaded yet)
    const EAGLE_SIZE = 170; // matches style width

    // Bird center coordinates
    const birdCenterX = rect.left + rect.width/2;
    const birdCenterY = rect.top  + rect.height/2;

    // Measure actual eagle dimensions (after width applied)
    const eagleRect = eagle.getBoundingClientRect();
    const eagleW = eagleRect.width;
    const eagleH = eagleRect.height;

    // Smaller horizontal lead – about 30% of bird width
    const HORIZ_LEAD = rect.width * 0.3;
    const grabX = birdCenterX - eagleW/2 + HORIZ_LEAD;

    // Slightly higher talon alignment – 85% of sprite height, no extra offset
    const TALON_RATIO = 0.85;
    const grabY = birdCenterY - eagleH * TALON_RATIO;

    // Swoop to the grab position
    gsap.to(eagle, {
      x: grabX,
      y: grabY,
      duration: 0.9,
      ease: 'power2.in',
      onComplete: () => grabBird(target, eagle)
    });
  }

  function grabBird(racer, eagleEl){
    if(racer.captured) return;
    racer.captured = true;

    // Stop racer animations
    if(racer.el._tween) racer.el._tween.pause();
    if(racer.el._sine)  racer.el._sine.pause();
    gsap.killTweensOf(racer.el);

    // Feather burst for effect
    const rect = racer.el.getBoundingClientRect();
    spawnFeathersAt(rect.left + rect.width/2, rect.top + rect.height/2);

    // Fly off towards top-right corner carrying the bird
    const destX = window.innerWidth + 300;
    const destY = -200;

    // Calculate deltas for each element so they end together
    const eagleRect = eagleEl.getBoundingClientRect();
    const deltaEagleX = destX - eagleRect.left;
    const deltaEagleY = destY - eagleRect.top;

    const deltaBirdX  = destX - rect.left;
    const deltaBirdY  = destY - rect.top;

    const tl = gsap.timeline({
      onComplete: ()=>{
        // Remove DOM nodes once off-screen
        eagleEl.remove();
        racer.el.remove();

        // Mark as finished and record for results (always last)
        racer.finished = true;
        capturedNames.push(racer.name);

        // Add to finish order (captured birds counted as finished)
        finishOrder.push(racer.name);

        // When all birds finished, show results after short delay
        if(finishOrder.length === racers.length){
          // Stop ambience loops
          flappingSFX.pause();
          flappingSFX.currentTime = 0;
          parrotsSFX.pause();
          parrotsSFX.currentTime = 0;
          sparrowSFX.pause();
          sparrowSFX.currentTime = 0;

          gsap.delayedCall(1, ()=>showResults(finishOrder));
        }
      }
    });

    tl.to(eagleEl, { x:`+=${deltaEagleX}`, y:`+=${deltaEagleY}`, duration:1.4, ease:'power2.in' }, 0)
      .to(racer.el, { x:`+=${deltaBirdX}`,  y:`+=${deltaBirdY}`,  duration:1.4, ease:'power2.in' }, 0);
  }
}

function announceWinner(racer) {
  const name = racer.name;
  // Show overlay
  const overlay = document.getElementById('winnerOverlay');
  const textEl  = document.getElementById('winnerText');
  textEl.textContent = `${name} wins!`;
  overlay.classList.remove('hidden');

  // Text pop animation
  gsap.fromTo(textEl, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(1.7)' });

  // Feather & egg explosion
  spawnParticles();

  // Mark winner flag
  racer.winner = true;

  // Hide the label so only the bird flies to center
  const labelEl = racer.el.querySelector('.label');
  if(labelEl) labelEl.style.display = 'none';

  // Move winning bird beneath announcement
  bringWinnerBird(racer.el);

  // Keep header visible for new races

  // Stop background music
  bgMusic.pause();
  bgMusic.currentTime = 0;

  // Play celebration sound
  successSFX.currentTime = 0;
  successSFX.play().catch(()=>{});
}

function bringWinnerBird(el){
  // Pause main tween
  if(el._tween) el._tween.pause();

  // Kill other tweens to avoid conflicting motions
  gsap.killTweensOf(el);

  const rect = el.getBoundingClientRect();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2 - 140; // above text gracefully

  const deltaX = centerX - (rect.left + rect.width / 2);
  const deltaY = centerY - (rect.top + rect.height / 2);

  // Flip only the image, not the name label
  const img = el.querySelector('img');
  if(img) gsap.set(img, { scaleX: -1 });

  gsap.to(el, {
    x: "+=" + deltaX,
    y: "+=" + deltaY,
    duration: 1.6,
    ease: "power2.inOut",
    overwrite: true,
    onComplete: ()=>{
       // Magnify winner slightly, then start gentle hover bob
       gsap.to(el, {
         scale: 1.50,
         duration: 0.6,
         ease: "back.out(1.6)",
         onComplete: ()=>{
           gsap.to(el, { y:"+=15", duration:1, yoyo:true, repeat:-1, ease:"sine.inOut"});
         }
       });
    }
  });
}

// Generate feather sprites and animate outward
function spawnParticles() {
  const overlay = document.getElementById('winnerOverlay');
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const colors = ['pink','orange','yellow','green','blue','purple'];
  const COUNT = 120; // mix
  for(let i=0;i<COUNT;i++){
     const isFeather=Math.random()<0.6;
     const img=document.createElement('img');
     if(isFeather){img.src='assets/feather.png';img.className='feather';}
     else{const col=colors[Math.floor(Math.random()*colors.length)];img.src=`assets/egg_${col}.png`;img.className='egg';}
     overlay.appendChild(img);
     gsap.set(img,{left:centerX,top:centerY,xPercent:-50,yPercent:-50,scale:0.3,rotation:gsap.utils.random(-40,40)});
     const angle=Math.random()*Math.PI*2;const dist=isFeather?gsap.utils.random(250,600):gsap.utils.random(150,400);
     const dur=isFeather?3:2;
     gsap.to(img,{x:Math.cos(angle)*dist,y:Math.sin(angle)*dist,scale:1+Math.random(),rotation:gsap.utils.random(-720,720),opacity:0,duration:dur,ease:'power4.out',onComplete:()=>img.remove()});
  }
}

// Simple array shuffler (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Smooth speed adjustment: birds may gently speed up or slow down mid-race
function maybeAdjustSpeed(tween){
  // ~50% chance a bird will noticeably speed up or slow down mid-race
  if(Math.random() < 0.5){
     // Trigger somewhere in the first half of the race
     const delay = gsap.utils.random(1.5, 4);

     // Pick a scale between 0.5× and 2×, but ensure it differs from 1 by at least 0.2 (20%).
     let newScale;
     do {
        newScale = gsap.utils.random(0.75, 2.0);
     } while(Math.abs(newScale - 1) < 0.2);

     gsap.delayedCall(delay, () => {
        gsap.to(tween, { timeScale: newScale, duration: 1.2, ease: "sine.inOut" });
     });
  }
}

//────────────────────────────
// Crazy bird loop-the-loop (vertical flip with upward arc)
//────────────────────────────
function scheduleLoop(racer){
  const {el, img, laneSpacing} = racer;
  if(!img || !el) return;
  const mainDur = el._tween?.duration() || 10;
  const delay   = gsap.utils.random(mainDur*0.25, mainDur*0.75);

  const loopHeight = laneSpacing * 1.2; // how high the loop rises

  gsap.delayedCall(delay, ()=>{
       // Pause vertical sine to avoid conflict, resume after loop
       if(el._sine) el._sine.pause();

       const tl = gsap.timeline({onComplete:()=>{ if(el._sine) el._sine.resume(); }});
       // upward arc & spin
       tl.to(el, {y:`-=${loopHeight}`, duration:0.6, ease:"power2.out"});
       tl.to(el, {y:`+=${loopHeight}`, duration:0.6, ease:"power2.in"});

       tl.to(img, {rotation:"-=360", duration:1.2, ease:"power2.inOut"}, 0);
  });
}

//────────────────────────────
// Loser bird drop animation
//────────────────────────────
function dropDead(racer){
  if(racer.deadHandled) return;
  racer.deadHandled = true;

  // Halt existing animations
  if(racer.el._tween) racer.el._tween.pause();
  if(racer.el._sine)  racer.el._sine.pause();
  gsap.killTweensOf(racer.el);

  const img = racer.img;
  if(img) {
     // rotate 180° counter-clockwise
     gsap.to(img,{rotation:"-=180", duration:0.4, ease:"power1.in"});
  }

  // Trigger feathers explosion at impact point (wall)
  const rect = racer.el.getBoundingClientRect();
  spawnFeathersAt(rect.left + rect.width/2, rect.top + rect.height/2);

  // drop to bottom
  const distance = window.innerHeight - rect.bottom + 20; // little extra off-screen
  gsap.to(racer.el, {
    y: `+=${distance}`,
    duration: 1,
    ease: "power2.in",
    onComplete: ()=>{
      gsap.killTweensOf(racer.el);

      // Play thud sound and spawn feathers at landing spot
      thudSFX.currentTime = 0;
      thudSFX.play().catch(()=>{});

      const finalRect = racer.el.getBoundingClientRect();
      spawnFeathersAt(finalRect.left + finalRect.width/2, finalRect.top + finalRect.height/2);
    }
  });
}

// Spawn a small feather burst at a given screen coordinate
function spawnFeathersAt(x,y){
  // Play poof sound
  poofSFX.currentTime = 0;
  poofSFX.play().catch(()=>{});

  const COUNT = 18;
  for(let i=0;i<COUNT;i++){
     const img=document.createElement('img');
     img.src='assets/feather.png';
     img.className='feather';
     document.body.appendChild(img);
     gsap.set(img,{left:x,top:y,xPercent:-50,yPercent:-50,scale:0.25,rotation:gsap.utils.random(-40,40),position:'fixed',pointerEvents:'none'});
     const angle=Math.random()*Math.PI*2;
     const dist=gsap.utils.random(80,180);
     gsap.to(img,{x:Math.cos(angle)*dist,y:Math.sin(angle)*dist,rotation:gsap.utils.random(-360,360),opacity:0,duration:1.2,ease:'power2.out',onComplete:()=>img.remove()});
  }
}

//────────────────────────────
// Results overlay
//────────────────────────────
function showResults(order){
    const list = document.getElementById('resultsCenter');
    if(!list) return;
    list.innerHTML='';
    // Ensure captured birds are placed last
    const finalOrder = order.filter(n=>!capturedNames.includes(n)).concat(capturedNames);
    finalOrder.forEach((n,i)=>{
       const li=document.createElement('li');
       li.textContent=`${i+1}. ${n}`;
       list.appendChild(li);
    });
    list.classList.remove('hidden');
    gsap.to(list,{opacity:1,duration:1, delay:0.2});
 }

// Helper: true = phone/tablet
function isMobile() {
  return (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i).test(
           navigator.userAgent) ||
         window.matchMedia('(pointer:coarse)').matches;
}

// Attempt to enter fullscreen mode (mobile only) and lock to landscape
async function attemptFullscreen(){
  if(!isMobile()) return; // desktop → skip

  const elem = document.documentElement;

  // Helper to request orientation lock if supported
  const lockLandscape = async () => {
    if(screen.orientation && screen.orientation.lock){
       try {
          await screen.orientation.lock('landscape-primary');
       } catch(errPrimary){
          try { await screen.orientation.lock('landscape'); } catch(_err){ /* ignore */ }
       }
    }
  };

  // If already fullscreen, just try orientation lock
  if(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement){
      await lockLandscape();
      return;
  }

  // Request fullscreen with vendor fallbacks
  const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
  if(!req) { await lockLandscape(); return; }

  try {
    const result = req.call(elem);
    await Promise.resolve(result).catch(()=>{});
  } catch(_){}

  // After (attempted) fullscreen, try orientation lock
  await lockLandscape();
}

// ───────────────────────────────────────────────────────────
// Audio SFX for countdown + background
// ───────────────────────────────────────────────────────────
const crowSFX = new Audio('assets/audio/crow.mp3');
crowSFX.preload = 'auto';
const owlSFX  = new Audio('assets/audio/owl.mp3');
owlSFX.preload  = 'auto';

// Background music (loops during race)
const bgMusic = new Audio('assets/audio/bg1.mp3');
bgMusic.preload = 'auto';
bgMusic.loop = true;

// Celebration & ambience sounds
const successSFX = new Audio('assets/audio/complete1.mp3');
successSFX.preload = 'auto';

// Ambience loops during race
const flappingSFX = new Audio('assets/audio/flapping.mp3');
flappingSFX.preload = 'auto';
flappingSFX.loop = true;

const parrotsSFX = new Audio('assets/audio/parrots2.mp3');
parrotsSFX.preload = 'auto';
parrotsSFX.loop = true;

// Additional sparrow ambient sound
const sparrowSFX = new Audio('assets/audio/sparrow1.mp3');
sparrowSFX.preload = 'auto';
sparrowSFX.loop = true;

// Poof sound when a losing bird crashes
const poofSFX = new Audio('assets/audio/poof.mp3');
poofSFX.preload = 'auto';

// Thud sound at ground impact
const thudSFX = new Audio('assets/audio/thud.mp3');
thudSFX.preload = 'auto';

// ───────────────────────────────────────────────────────────
// Asset preloader and click handler (mobile-friendly)
// ───────────────────────────────────────────────────────────

/**
 * Preload critical images & audio. Calls onProgress(0‒100).
 */
async function preloadAssets(onProgress) {
  const manifest = [
    // bird sprites
    ...birdImages.map(src => ({ type: 'img', src })),
    // predator sprite
    { type: 'img', src: 'assets/predators/great_horned_owl.png' },
    // particles
    { type: 'img', src: 'assets/feather.png' },
    { type: 'img', src: 'assets/egg_blue.png' },
    { type: 'img', src: 'assets/egg_green.png' },
    { type: 'img', src: 'assets/egg_orange.png' },
    { type: 'img', src: 'assets/egg_pink.png' },
    { type: 'img', src: 'assets/egg_purple.png' },
    { type: 'img', src: 'assets/egg_yellow.png' },

    // audio clips
    { type: 'audio', src: 'assets/audio/bg1.mp3' },
    { type: 'audio', src: 'assets/audio/crow.mp3' },
    { type: 'audio', src: 'assets/audio/owl.mp3' },
    { type: 'audio', src: 'assets/audio/complete1.mp3' },
    { type: 'audio', src: 'assets/audio/flapping.mp3' },
    { type: 'audio', src: 'assets/audio/parrots2.mp3' },
    { type: 'audio', src: 'assets/audio/sparrow1.mp3' },
    { type: 'audio', src: 'assets/audio/poof.mp3' },
    { type: 'audio', src: 'assets/audio/thud.mp3' },
  ];

  const total = manifest.length;
  let loaded = 0;
  const update = () => {
    if (onProgress) onProgress(Math.round((loaded / total) * 100));
  };
  update();

  await Promise.all(
    manifest.map(item =>
      new Promise(resolve => {
        if (item.type === 'img') {
          const img = new Image();
          img.src = item.src;
          img.onload = img.onerror = () => {
            loaded++; update(); resolve();
          };
        } else {
          const audio = new Audio();
          audio.src = item.src;
          audio.preload = 'auto';
          const done = () => { loaded++; update(); resolve(); };
          audio.oncanplaythrough = done;
          audio.onerror = done; // ignore failures – keep going
        }
      })
    )
  );
}

/**
 * Handles the "Take Flight" button click: shows loader, preloads assets, then starts the race.
 */
async function handleStartClick(e) {
  if (e && e.preventDefault) e.preventDefault();

  // Avoid double-clicks
  if (document.body.dataset.preloading) return;

  // Validate at least one name so we don't wait needlessly
  const names = [...inputsDiv.querySelectorAll('input')]
                  .map(inp => inp.value.trim())
                  .filter(Boolean);
  if (!names.length) return; // early – mirrors original guard

  document.body.dataset.preloading = 'yes';

  const loaderOverlay = document.getElementById('loaderOverlay');
  const loaderText    = document.getElementById('loaderText');
  if (loaderOverlay) loaderOverlay.classList.remove('hidden');

  await preloadAssets(pct => {
    if (loaderText) loaderText.textContent = `Loading ${pct}%`;
  });

  // Hide loader
  if (loaderOverlay) loaderOverlay.classList.add('hidden');
  delete document.body.dataset.preloading;

  // Prime one audio element so subsequent play() calls are allowed
  try {
    await bgMusic.play();
    bgMusic.pause();
    bgMusic.currentTime = 0;
  } catch(_) {/* ignore */}

  // Proceed to the regular flow
  startRace(e);
} 