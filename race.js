// Maximum number of players supported
const MAX_PLAYERS = 5;

// List of bird image paths (place bird images in assets/birds/)
const birdImages = [
  'assets/birds/brown_pelican.png',
  'assets/birds/little_penguin.png',
  'assets/birds/musk_duck.png',
  'assets/birds/american_goldfinch.png',
  'assets/birds/common_raven.png',
  'assets/birds/franklins_gull.png',
  'assets/birds/killdeer.png',
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

// Start with five player input boxes
for (let i = 0; i < MAX_PLAYERS; i++) addInput();

if (startBtn) startBtn.onclick = startRace;

if(title) title.onclick = () => location.reload();

function addInput() {
  if (inputsDiv.children.length >= MAX_PLAYERS) return;
  const inp = document.createElement('input');
  inp.placeholder = 'Player name';
  // not required – players may leave blanks
  inputsDiv.appendChild(inp);
}

function startRace(e) {
  if(e && e.preventDefault) e.preventDefault();

  // prevent multiple
  if (document.body.dataset.raceStarted) return;
  document.body.dataset.raceStarted = 'yes';

  // Collect trimmed non-empty names
  const names = [...inputsDiv.querySelectorAll('input')]
      .map(inp => inp.value.trim())
      .filter(v => v.length);

  if (!names.length) return;

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
    const speedFactor  = gsap.utils.random(0.85, 1.2);
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
     cdText.textContent = nums[idx];
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
     }
  }
  tick();

  const finishOrder = [];
  const FINISH_OFFSET = 30; // px from right edge considered finish
  if (!window._peckingFinishTicker) {
    window._peckingFinishTicker = gsap.ticker.add(() => {
      if (!raceStarted) return;
      for (const r of racers) {
        if(r.finished) continue;
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
            gsap.delayedCall(1, ()=>showResults(finishOrder));
          }
        }
      }
    });
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
       // gentle hover bob after settling
       gsap.to(el, { y:"+=15", duration:1, yoyo:true, repeat:-1, ease:"sine.inOut"});
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
  if(Math.random()<0.4){ // 40% chance
     const delay = gsap.utils.random(2,5); // after 2-5 s
     const newScale = gsap.utils.random(0.6,1.6); // could slow or speed
     gsap.delayedCall(delay, ()=>{
        gsap.to(tween,{ timeScale:newScale, duration:1.5, ease:"sine.inOut" });
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

  // drop to bottom
  const rect = racer.el.getBoundingClientRect();
  const distance = window.innerHeight - rect.bottom + 20; // little extra off-screen
  gsap.to(racer.el, {
    y: `+=${distance}`,
    duration: 1,
    ease: "power2.in",
    onComplete: ()=>{ gsap.killTweensOf(racer.el); }
  });
}

//────────────────────────────
// Results overlay
//────────────────────────────
function showResults(order){
   const list = document.getElementById('resultsCenter');
   if(!list) return;
   list.innerHTML='';
   order.forEach((n,i)=>{
      const li=document.createElement('li');
      li.textContent=`${i+1}. ${n}`;
      list.appendChild(li);
   });
   list.classList.remove('hidden');
   gsap.to(list,{opacity:1,duration:1, delay:0.2});
} 