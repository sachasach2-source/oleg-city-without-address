(function(root){
'use strict';
// Original procedural arrangements. Character inspiration is not a claim about canon tastes.
const profiles={
 nika:{label:'Постпанк · бас и холодное эхо',base:73.416,steps:16,roots:[0,0,-2,5],chords:[[0,3,7],[0,3,10],[0,4,7],[0,3,7]],pad:'triangle',padLevel:.025,cutoff:1700,echo:.22,voice:'guitar',bass:'picked',bassAt:[0,2,3,6,8,10,11,14],bassNotes:[0,0,12,7,0,0,10,7],melody:[12,null,7,null,10,null,7,null,12,null,15,null,10,null,7,null],kick:[0,6,8],snare:[4,12],hat:[2,6,10,14],air:.024},
 lera:{label:'Ночной хаус · тёплый грув',base:65.406,steps:16,roots:[0,8,3,10],chords:[[0,3,7,10],[0,4,7,11],[0,4,7,9],[0,4,7,10]],pad:'sine',padLevel:.038,cutoff:2700,echo:.16,voice:'keys',bass:'round',bassAt:[2,6,10,14],bassNotes:[0,7,0,10],melody:[null,null,12,null,null,null,15,null,null,null,19,null,null,null,15,null],stabs:[2,6,10,14],kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],air:.022},
 asya:{label:'Камерный вальс · клавиши и струнные',base:174.614,steps:12,roots:[0,5,-2,7],chords:[[0,4,7,9],[0,4,7,11],[0,4,7,9],[0,3,7,10]],pad:'sawtooth',padLevel:.023,cutoff:850,echo:.12,voice:'piano',bass:'bow',bassAt:[0],bassNotes:[0],melody:[0,null,7,null,12,null,16,null,14,null,7,null],stabs:[4,8],kick:[],snare:[],hat:[],air:.012},
 marta:{label:'Сумеречный фолк · арфа и колокольчики',base:146.832,steps:12,roots:[0,-2,5,7],chords:[[0,3,7],[0,4,7],[0,3,7],[0,4,7]],pad:'sine',padLevel:.035,cutoff:2200,echo:.32,voice:'bell',bass:'harp',bassAt:[0,6],bassNotes:[0,7],melody:[0,null,7,null,12,null,15,null,12,null,7,null],stabs:[],kick:[],snare:[],hat:[0,6],air:.016},
 zhenya:{label:'Эмо-рок · томы и открытые аккорды',base:82.407,steps:16,roots:[0,-4,3,-2],chords:[[0,7,12],[0,7,12],[0,7,12],[0,7,12]],pad:'triangle',padLevel:.022,cutoff:2300,echo:.09,voice:'guitar',bass:'picked',bassAt:[0,3,6,8,11,14],bassNotes:[0,0,7,0,0,12],melody:[null,null,12,null,null,null,7,null,null,null,19,null,null,null,12,null],stabs:[0,6,8,14],kick:[0,3,8,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14],toms:[14,15],air:.07},
 ulya:{label:'Игривая электроника · стекло и глитч',base:130.813,steps:20,roots:[0,7,2,9],chords:[[0,4,7,14],[0,5,7,12],[0,3,7,14],[0,3,7,10]],pad:'sine',padLevel:.028,cutoff:3200,echo:.25,voice:'fm',bass:'round',bassAt:[0,7,12,17],bassNotes:[0,12,7,14],melody:[12,null,19,null,null,14,null,24,null,21,null,null,19,null,14,null,24,null,null,12],stabs:[],kick:[0,8,12],snare:[6,16],hat:[3,7,11,15,19],air:.027}
};
const mod=(v,n)=>(v%n+n)%n;
class WaveMusic{
 constructor(c,out,character){
  this.c=c;this.character=character;this.profile=profiles[character]||profiles.nika;this.last=null;this.chord=null;this.active=new Set();this.disposed=false;
  const p=this.profile;this.bus=c.createGain();this.bus.gain.value=.85;this.bus.connect(out);this.out=this.bus;
  this.delay=c.createDelay(1);this.delay.delayTime.value=.24;this.feedback=c.createGain();this.feedback.gain.value=p.echo;this.wet=c.createGain();this.wet.gain.value=p.echo*.65;this.bus.connect(this.delay);this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.wet);this.wet.connect(out);
  this.pad=c.createGain();this.pad.gain.value=0;this.padFilter=c.createBiquadFilter();this.padFilter.type='lowpass';this.padFilter.frequency.value=p.cutoff;this.pad.connect(this.padFilter);this.padFilter.connect(this.bus);
  this.voices=[0,1,2].map(i=>{const o=c.createOscillator(),g=c.createGain();o.type=p.pad;o.detune.value=i===1?3:i===2?-3:0;g.gain.value=[.50,.27,.23][i];o.connect(g);g.connect(this.pad);o.start();return{o,g};});
  const b=c.createBuffer(1,c.sampleRate,c.sampleRate),data=b.getChannelData(0);let seed=94;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1)*.6;}this.noise=b;
  this.air=c.createBufferSource();this.air.buffer=b;this.air.loop=true;this.filter=c.createBiquadFilter();this.filter.type='bandpass';this.filter.frequency.value=750;this.filter.Q.value=.6;this.airGain=c.createGain();this.airGain.gain.value=0;this.air.connect(this.filter);this.filter.connect(this.airGain);this.airGain.connect(this.bus);this.air.start();
 }
 reset(){this.last=null;this.chord=null;}
 track(source,nodes,end){this.active.add(source);source.onended=()=>{this.active.delete(source);for(const n of nodes)n.disconnect();};source.stop(end);}
 note(f,t,volume,duration=.4,voice='keys'){
  if(this.disposed)return;const c=this.c,o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();
  const waves={guitar:'sawtooth',picked:'sawtooth',round:'sine',bow:'triangle',harp:'triangle',piano:'triangle',keys:'triangle',bell:'sine',fm:'sine'};
  o.type=waves[voice]||'sine';o.frequency.value=f;filter.type='lowpass';filter.frequency.setValueAtTime(voice==='picked'?1400:voice==='guitar'?2400:voice==='piano'?3500:6500,t);filter.Q.value=.5;
  const attack=voice==='bow'?.08:voice==='bell'?.003:.009;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(volume,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(filter);filter.connect(g);g.connect(this.bus);o.start(t);this.track(o,[o,filter,g],t+duration+.02);
  if(voice==='bell'||voice==='piano'){const a=c.createOscillator(),ag=c.createGain();a.type='sine';a.frequency.value=f*(voice==='bell'?2.76:2);ag.gain.setValueAtTime(volume*.20,t);ag.gain.exponentialRampToValueAtTime(.0001,t+duration*.55);a.connect(ag);ag.connect(this.bus);a.start(t);this.track(a,[a,ag],t+duration+.02);}
  if(voice==='fm'){const m=c.createOscillator(),mg=c.createGain();m.frequency.value=f*2.01;mg.gain.setValueAtTime(f*.8,t);mg.gain.exponentialRampToValueAtTime(1,t+duration*.7);m.connect(mg);mg.connect(o.frequency);m.start(t);this.track(m,[m,mg],t+duration+.02);}
 }
 hit(kind,t,volume){
  const c=this.c;if(kind==='kick'||kind==='tom'){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(kind==='kick'?130:190,t);o.frequency.exponentialRampToValueAtTime(kind==='kick'?46:84,t+.17);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g);g.connect(this.bus);o.start(t);this.track(o,[o,g],t+.24);return;}
  const o=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();o.buffer=this.noise;f.type=kind==='hat'?'highpass':'bandpass';f.frequency.value=kind==='hat'?6500:1700;f.Q.value=.65;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='hat'?.055:.13));o.connect(f);f.connect(g);g.connect(this.bus);o.start(t);this.track(o,[o,f,g],t+.16);
 }
 update(phase,harmony,motion){
  if(this.disposed||!Number.isFinite(phase)||this.c.state!=='running')return;
  const p=this.profile,c=this.c,t=c.currentTime,h=Math.max(0,Math.min(1,harmony||0)),n=Math.floor(phase*4),bar=Math.floor(n/p.steps),step=mod(n,p.steps),ch=mod(bar,p.roots.length),base=p.base*Math.pow(2,p.roots[ch]/12),chord=p.chords[ch];
  this.pad.gain.setTargetAtTime(.006+h*p.padLevel,t,.3);this.padFilter.frequency.setTargetAtTime(p.cutoff*(.65+h*.55),t,.2);
  if(bar!==this.chord){chord.slice(0,3).forEach((semi,i)=>this.voices[i].o.frequency.setTargetAtTime(base*Math.pow(2,semi/12),t,.18));this.chord=bar;}
  if(this.last!==n){
   this.last=n;const bi=p.bassAt.indexOf(step);if(bi!==-1)this.note(base/2*Math.pow(2,p.bassNotes[bi]/12),t,.07+.06*h,p.bass==='bow'?.85:p.bass==='harp'?.65:.26,p.bass);
   let melody=p.melody[step];if(melody!==null&&melody!==undefined){if(mod(melody,12)===3&&chord.includes(4))melody++;else if(mod(melody,12)===4&&chord.includes(3))melody--;}if(melody!==null&&melody!==undefined)this.note(base*Math.pow(2,melody/12),t,.008+h*h*.065,p.voice==='bell'?.8:p.voice==='piano'?.55:.30,p.voice);
   if(p.stabs?.includes(step))for(const semi of chord)this.note(base*Math.pow(2,semi/12),t,.006+h*.017,p.voice==='guitar'?.24:.45,p.voice==='guitar'?'guitar':'keys');
   if(p.kick.includes(step))this.hit('kick',t,.055+.045*h);if(p.snare.includes(step))this.hit('snare',t,.018+.040*h);if(p.hat.includes(step))this.hit('hat',t,.011+.018*h);if(p.toms?.includes(step))this.hit('tom',t,.026+.04*h);
  }
  const amount=Math.min(1,Math.max(0,motion||0));this.airGain.gain.setTargetAtTime(amount*p.air,t,.06);this.filter.frequency.setTargetAtTime(420+amount*1000,t,.08);
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;for(const n of this.active){try{n.stop();}catch(_){}}for(const v of this.voices){v.o.stop();v.o.disconnect();v.g.disconnect();}this.air.stop();for(const n of [this.air,this.filter,this.airGain,this.pad,this.padFilter,this.bus,this.delay,this.feedback,this.wet])n.disconnect();
 }
}
WaveMusic.profiles=profiles;root.WaveMusic=WaveMusic;
})(typeof globalThis!=='undefined'?globalThis:this);
