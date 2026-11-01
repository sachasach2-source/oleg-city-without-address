(function(){
 'use strict';
 const $=id=>document.getElementById(id),V=window.VinylEngine,canvas=$('scene'),ctx=canvas.getContext('2d'),audio=new window.VinylSound();
 const image=new Image();image.src='assets/vinyl-record.png';
 const colours={left:'#e3ad85',right:'#b9a5de'};
 const storagePrefix=new URLSearchParams(location.search).get('qa')==='1'?'oleg_lera_vinyl_qa_v7':'oleg_lera_vinyl_v7';
 let raf=0;function wake(){if(!raf&&!document.hidden){lastFrame=performance.now();raf=requestAnimationFrame(frame);}}
 let session=null,mode='intro',lastFrame=performance.now(),idleTime=0,displayScore=0,lastHud=0,pointer=null,velocity=0,lastMove=0,keys=new Set(),pausedForHelp=false;
 let layout={},best=0,toast='';
 try{best=Number(localStorage.getItem(storagePrefix+'_best'))||0;audio.muted=localStorage.getItem(storagePrefix+'_muted')==='true';}catch(_){}
 function soundLabel(){const live=audio.ctx?.state==='running'&&mode==='playing';$('sound').textContent=audio.muted?'Звук выключен':audio.ctx&&!live&&mode==='playing'?'Включить звук':'Звук включён';$('sound').setAttribute('aria-pressed',String(audio.muted));$('sound').dataset.audioState=audio.ctx?.state||'ready';$('start').innerHTML=(audio.muted?'Начать без звука':'Начать со звуком')+' <span>↗</span>';}
 soundLabel();
 function setMode(next){mode=next;document.body.dataset.state=next;$('intro').hidden=next!=='intro';$('pause-panel').hidden=next!=='paused';$('result').hidden=next!=='result';$('live').hidden=next==='intro'||next==='result';$('pause').hidden=next==='intro'||next==='result';$('pause').textContent=next==='paused'?'Продолжить':'Пауза';soundLabel();}
 async function start(practice=false){
  setMode('loading');
  try{if(image.complete&&!image.naturalWidth)image.src=image.src;await image.decode();}
  catch(_){setMode('intro');$('start').textContent='Повторить загрузку';$('announcement').textContent='Не удалось загрузить пластинку. Повтори загрузку или выбери шары.';return;}
  window.rhythmResult=null;session=new V.Session({practice:practice===true});displayScore=0;velocity=0;pointer=null;keys.clear();lastFrame=performance.now();setMode('loading');
  try{const ok=await audio.start();if(!ok)toast='Можно играть без звука.';}catch(_){toast='Звук недоступен. Движение остаётся видно.';}
  setMode('playing');wake();lastFrame=performance.now();$('practice-round').hidden=!session.practice;soundLabel();$('announcement').textContent='Игра началась. Управляй левой пластинкой движением влево-вправо.';hud();
 }
 function pause(help=false){
  if(mode!=='playing')return;
  pausedForHelp=help;velocity=0;pointer=null;keys.clear();setMode('paused');audio.pause().then(soundLabel);
  $('pause-label').textContent=help?'ДВИЖЕНИЕ':'ПАУЗА';$('pause-title').textContent=help?'Веди. Слушай. Подхватывай.':'Ритм подождёт.';
  $('pause-copy').textContent=help?'Зажми свою пластинку и двигай мышь влево-вправо. Следи за поворотами второй: подхватывай её темп и размах. Не торопись: темп меняется плавно, резких остановок нет. Стрелки ← → делают тот же жест.':'Продолжим с того же движения.';
 }
 async function resume(){if(mode!=='paused')return;lastFrame=performance.now();setMode('playing');await audio.start();wake();soundLabel();}
 function finish(){
  const r=session.result();window.rhythmResult={...r,skipped:false};audio.finish();setMode('result');
  const titles={together:'Поймали общий грув.',searching:'Нашли несколько общих тактов.',different:'Ритмы пока расходились.'};
  const after={together:'Лера притягивает край одеяла: «Не включай пока свет».',searching:'«Подвинься. Я к тебе». Лера устраивается ближе.',different:'«Воду будешь?» — спрашивает Лера из темноты. «Я тоже хочу».'};
  $('result-title').textContent=titles[r.tier];$('result-score').textContent=r.score;$('flow-time').textContent=r.flowTime.toFixed(1)+' с';$('flow-best').textContent=r.bestFlow.toFixed(1)+' с';$('after').textContent=after[r.tier];
  const previous=best;best=Math.max(best,r.score);try{localStorage.setItem(storagePrefix+'_best',String(best));}catch(_){}
  $('record').textContent=r.score>previous?'Твой новый лучший результат':'Лучший результат · '+best;$('announcement').textContent=titles[r.tier]+' '+r.score+' очков.';
  displayScore=session.score;hud();
 }
 function resize(){
  const narrow=window.innerWidth<520;canvas.width=narrow?760:1400;canvas.height=narrow?1080:740;
  layout=narrow?{w:760,h:1080,r:184,user:{x:380,y:765},partner:{x:380,y:290},vertical:true}:{w:1400,h:740,r:220,user:{x:390,y:345},partner:{x:1010,y:345},vertical:false};
  $('position-name').textContent=narrow?'нижнюю пластинку':'левую пластинку';$('partner-position').textContent=narrow?'Верхняя':'Правая';$('footer-position').textContent=narrow?'Тяни нижнюю пластинку ↔':'Тяни левую пластинку ↔';canvas.setAttribute('aria-label',narrow?'Нижняя пластинка — твоя, верхняя отвечает. Зажми нижнюю и двигай влево-вправо.':'Слева твоя пластинка, справа отвечающая. Зажми левую и двигай влево-вправо.');
 }
 new ResizeObserver(()=>{resize();wake();}).observe(canvas);resize();
 function point(event){const b=canvas.getBoundingClientRect();return {x:(event.clientX-b.left)*canvas.width/b.width,y:(event.clientY-b.top)*canvas.height/b.height};}
 canvas.addEventListener('pointerdown',event=>{
  if(mode!=='playing'||pointer!==null)return;const p=point(event),u=positions().user;
  if(Math.hypot(p.x-u.x,p.y-u.y)>layout.r*1.08)return;
  pointer={id:event.pointerId,x:p.x,time:performance.now()};lastMove=pointer.time;velocity=0;canvas.setPointerCapture(event.pointerId);event.preventDefault();
 });
 canvas.addEventListener('pointermove',event=>{
  if(!pointer||event.pointerId!==pointer.id||mode!=='playing')return;const p=point(event),now=performance.now(),dt=Math.max(.008,(now-pointer.time)/1000);
  velocity=V.clamp((p.x-pointer.x)/layout.r/dt,-8,8);pointer.x=p.x;pointer.time=now;lastMove=now;event.preventDefault();
 });
 function release(event){if(pointer&&event.pointerId===pointer.id){pointer=null;velocity=0;}}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 window.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight'].includes(event.key)&&mode==='playing'){keys.add(event.key);event.preventDefault();}
  if(event.key==='Escape'&&!event.repeat){if(mode==='playing')pause();else if(mode==='paused')resume();}
 });
 window.addEventListener('keyup',event=>keys.delete(event.key));
 window.addEventListener('blur',()=>{if(mode==='playing')pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
 $('practice').onclick=()=>start(true);$('practice-round').onclick=()=>start(false);$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('resume').onclick=resume;
 $('pause').onclick=()=>mode==='paused'?resume():pause();
 $('help').onclick=()=>{if(mode==='playing')pause(true);else if(mode==='paused'){pausedForHelp=!pausedForHelp;$('pause-copy').textContent='Зажми свою пластинку и веди мышь влево-вправо, подхватывая движение второй. Держи удобный размах, без резких рывков. Можно играть стрелками ← →.';}else if(mode==='result'){setMode('intro');audio.dispose();}else{$('intro').scrollIntoView({block:'center',behavior:'smooth'});$('announcement').textContent='Все движения описаны в карточке перед началом игры.';}};
 $('sound').onclick=async()=>{
  if(audio.ctx?.state!=='running'&&mode==='playing'&&!audio.muted){try{await audio.resume();}catch(_){}soundLabel();return;}
  audio.setMuted(!audio.muted);try{localStorage.setItem(storagePrefix+'_muted',String(audio.muted));}catch(_){}soundLabel();
 };
 function positions(){
  const h=session&&mode!=='intro'?session.harmony:0,shift=36*h;
  return layout.vertical?{user:{x:layout.user.x,y:layout.user.y-shift},partner:{x:layout.partner.x,y:layout.partner.y+shift}}:{user:{x:layout.user.x+shift,y:layout.user.y},partner:{x:layout.partner.x-shift,y:layout.partner.y}};
 }
 function disc(position,angle,colour,energy,held,t){
  const r=layout.r;ctx.save();ctx.translate(position.x,position.y);
  let halo=ctx.createRadialGradient(0,0,r*.65,0,0,r*1.3);halo.addColorStop(0,colour+'00');halo.addColorStop(.65,colour+(held?'24':'12'));halo.addColorStop(1,colour+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,r*1.3,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.rotate(angle);ctx.shadowColor='#000b';ctx.shadowBlur=27;ctx.shadowOffsetY=18;
  if(image.complete&&image.naturalWidth){ctx.drawImage(image,-r,-r,r*2,r*2);}else{
   const g=ctx.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);g.addColorStop(0,'#3c3d49');g.addColorStop(.3,'#14131d');g.addColorStop(.7,'#282735');g.addColorStop(1,'#101018');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*.94,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;for(let i=30;i<r*.93;i+=3){ctx.strokeStyle=i%2?'#82818b21':'#a09aa215';ctx.beginPath();ctx.arc(0,0,i,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#b6a08f';ctx.beginPath();ctx.arc(0,0,r*.22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5a405d';ctx.fillRect(-r*.1,-r*.14,r*.07,r*.2);
  }
  ctx.restore();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  // The asymmetric paper imprint makes direction legible without a target dot.
  ctx.save();ctx.rotate(angle);ctx.strokeStyle=colour;ctx.globalAlpha=.7;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*.275,-.5,.8);ctx.stroke();ctx.restore();
  ctx.strokeStyle=colour;ctx.globalAlpha=.24+energy*.36;ctx.lineWidth=held?4:2;ctx.beginPath();ctx.arc(0,0,r*.98,0,Math.PI*2);ctx.stroke();
  if(energy>.08){const direction=energy===0?1:(held?Math.sign(session?.user||1):Math.sign(session?.partner||1));const a=direction>0?-.8:-2.35,b=a+direction*.66;ctx.globalAlpha=.55;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*1.07,a,b,direction<0);ctx.stroke();const x=Math.cos(b)*r*1.07,y=Math.sin(b)*r*1.07;ctx.save();ctx.translate(x,y);ctx.rotate(b+direction*Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-9,-5);ctx.moveTo(0,0);ctx.lineTo(-9,5);ctx.stroke();ctx.restore();}
  ctx.globalAlpha=1;ctx.fillStyle=colour;ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillText(held?'ТВОЙ РИТМ':'ОТВЕТ',0,r+43);
  if(held&&mode==='playing'&&session.time<7){ctx.font='18px system-ui';ctx.globalAlpha=.55;ctx.fillText('зажми и веди ↔',0,r+69);}
  ctx.restore();
 }
 function connection(p,t){
  const h=session&&mode!=='intro'?session.harmony:.12,dx=p.partner.x-p.user.x,dy=p.partner.y-p.user.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),r=layout.r*.96;
  ctx.save();ctx.translate(p.user.x,p.user.y);ctx.rotate(a);const start=r,end=d-r;
  for(let n=0;n<9;n++){
   const g=ctx.createLinearGradient(start,0,end,0);g.addColorStop(0,'#d9a888');g.addColorStop(1,'#ba9edd');ctx.strokeStyle=g;ctx.globalAlpha=(.035+h*.075)*(1-Math.abs(n-4)*.12);ctx.lineWidth=n===4?1.8:1;
   ctx.beginPath();for(let x=0;x<=1;x+=.025){const envelope=Math.sin(Math.PI*x);const y=Math.sin(x*Math.PI*(4+h*3)-t*2.5+n*.32)*envelope*(14+h*42)+(n-4)*4;const px=start+(end-start)*x;x?ctx.lineTo(px,y):ctx.moveTo(px,y);}ctx.stroke();
  }
  if(h>.45){ctx.globalAlpha=(h-.45)*.65;ctx.shadowColor='#e9bdad';ctx.shadowBlur=18;for(let i=0;i<7;i++){let x=((t*.13+i*.17)%1);const y=Math.sin(x*Math.PI*4-t*2)*Math.sin(Math.PI*x)*25;ctx.fillStyle=i%2?'#dfb293':'#baa8df';ctx.beginPath();ctx.arc(start+(end-start)*x,y,1+h*1.5,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
 }
 function draw(t){
  const {w,h}=layout;ctx.clearRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w*.5,h*.48,0,w*.5,h*.48,w*.62);glow.addColorStop(0,'#31233244');glow.addColorStop(1,'#11121a00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#c49d8620';ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(w*.5,h*.51,w*(.39+i*.018),h*(.35+i*.02),-.1,0,Math.PI*2);ctx.stroke();}
  const p=positions(),playing=session&&mode!=='intro';connection(p,t);
  const ua=playing?session.userAngle:t*.16,pa=playing?session.partnerAngle:-t*.14;
  disc(p.user,ua,colours.left,playing?Math.min(Math.abs(session.user)/3,1):.12,true,t);
  disc(p.partner,pa,colours.right,playing?Math.min(Math.abs(session.partner)/3,1):.12,false,t);
 }
 function hud(){
  if(!session)return;
  $('score').textContent=Math.round(displayScore);$('time').textContent=session.practice?'∞':Math.ceil(Math.max(0,V.DURATION-session.time));$('progress').style.width=(session.practice?0:session.time/V.DURATION*100)+'%';
  const phases=['ПРИСЛУШАТЬСЯ','ПОДХВАТИТЬ','ОСТАТЬСЯ ВМЕСТЕ'];$('phase').textContent=session.practice?'ПРОБА БЕЗ ТАЙМЕРА':phases[session.phase];
  let hint=session.phase===0?'Поймай размах второй пластинки.':session.phase===1?'Она тоже начинает отвечать на твоё движение.':'Держи общий темп: движение меняется плавно.';
  if(session.harmony>.58)hint='Вместе. Продолжай это движение.';
  else if(session.time>5&&session.turns<2)hint='Меняй направление: влево, затем вправо.';
  if(toast)hint=toast;$('hint').textContent=hint;$('live').dataset.phase=session.phase;
 }
 function frame(now){raf=0;
  const dt=Math.min(.08,(now-lastFrame)/1000);lastFrame=now;idleTime+=dt;
  if(mode==='playing'&&session){
   let v=velocity,touch=pointer!==null;
   if(now-lastMove>65)velocity*=Math.exp(-dt*16);
   if(keys.size){v=(keys.has('ArrowRight')?2.6:0)-(keys.has('ArrowLeft')?2.6:0);touch=!!v;}
   session.step(dt,{velocity:v,touching:touch});displayScore=V.approach(displayScore,session.score,dt,8);audio.update(session);
   if(now-lastHud>120){hud();lastHud=now;}if(session.finished)finish();
  }
  draw(idleTime);if(mode==='playing'&&!document.hidden)raf=requestAnimationFrame(frame);
 }
 wake();

window.RhythmGameAPI={configure:settings=>{audio.volume=V.clamp(settings.volume??1);audio.setMuted(!!settings.muted);soundLabel();},snapshot:()=>({model:session,mode,result:window.rhythmResult||null}),pause,result:()=>window.rhythmResult||null,
restore:async saved=>{if(!saved?.model)return;await start(saved.model.practice);Object.assign(session,saved.model);displayScore=session.score;pause();if(saved.result)finish();}};
})();
