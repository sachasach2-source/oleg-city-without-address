(function(){
 'use strict';
 class VinylSound{
  constructor(){this.ctx=null;this.muted=false;this.timer=null;this.nodes=[];this.state=null;this.running=false;}
  async start(){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return false;
   if(!this.ctx)this.ctx=new Audio();
   await this.ctx.resume();this.dispose();
   const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.muted?0:.42*(this.volume??1);
   const compressor=c.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=3.5;compressor.attack.value=.004;compressor.release.value=.11;this.master.connect(compressor);compressor.connect(c.destination);this.nodes.push(this.master,compressor);
   this.music=new WaveMusic(c,this.master,'lera');
   this.slaps=await window.VinylFoley.buffers(c);
   this.scratch=this.makeScratch();this.grains=[];
   for(const pan of [-.42,.42]){
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1600;
    const gain=c.createGain();gain.gain.value=0;const stereo=c.createStereoPanner();stereo.pan.value=pan;
    filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);
    this.grains.push({filter,gain,stereo,source:null,sign:0});this.nodes.push(filter,gain,stereo);
   }
   this.step=0;this.next=c.currentTime+.06;this.running=true;this.timer=setInterval(()=>this.schedule(),25);return true;
  }
  makeScratch(){const c=this.ctx,n=Math.floor(c.sampleRate*.8),f=c.createBuffer(1,n,c.sampleRate),r=c.createBuffer(1,n,c.sampleRate),a=f.getChannelData(0),b=r.getChannelData(0);for(let i=0;i<n;i++){let t=i/c.sampleRate;const env=.5+.5*Math.sin(t*31);a[i]=(.32*Math.sin(2*Math.PI*(190*t+24*t*t))+.12*Math.sin(2*Math.PI*570*t)+.05*Math.sin(2*Math.PI*1270*t))*env;}for(let i=0;i<n;i++)b[i]=a[n-1-i];return [f,r];}
  slap(t,variant,volume,pan,heat=0){
   const c=this.ctx,s=c.createBufferSource(),g=c.createGain(),p=c.createStereoPanner();
   const warmth=c.createBiquadFilter(),edge=c.createBiquadFilter();
   s.buffer=this.slaps[variant%this.slaps.length];s.playbackRate.value=.90+(variant%5)*.018;
   warmth.type='lowshelf';warmth.frequency.value=210;warmth.gain.value=2+heat*2;
   edge.type='lowpass';edge.frequency.value=4900+heat*900;edge.Q.value=.55;
   p.pan.value=pan;g.gain.setValueAtTime(volume,t);
   s.connect(warmth);warmth.connect(edge);edge.connect(g);g.connect(p);p.connect(this.master);s.start(t);
   s.onended=()=>{for(const node of [s,warmth,edge,g,p])node.disconnect();};
  }
  schedule(){
   if(!this.running||!this.ctx||this.ctx.state!=='running')return;
   const c=this.ctx;if(this.next<c.currentTime-.1)this.next=c.currentTime+.03;
   while(this.next<c.currentTime+.12){
    const t=this.next,n=this.step%32,s=this.state||{},h=s.harmony||0;
    if(n%4===0){const pattern=[0,3,1,5,2,4,1,4],hit=Math.floor(this.step/4);this.slap(t,pattern[hit%pattern.length],(.60+h*.22)*(n%8===0?1:.9),n%8===0?-.09:.09,h);}
    if(n%16===14&&h>.65)this.slap(t,5,.12+h*.07,.06,h);
    this.next+=60/(window.VinylEngine.tempo(s.time||0,s.practice)+(s.rateBias||0)*120)/4;this.step++;
   }
  }
  update(s){
   this.state=s;if(!this.running||!this.ctx)return;
   const c=this.ctx,t=c.currentTime;this.music?.update((window.VinylEngine.musicalPhase(s.time,s.practice)+s.phaseOffset)/Math.PI,s.harmony,Math.abs(s.user)/4);
   [s.user,s.partner].forEach((velocity,i)=>{
    const g=this.grains[i],sign=velocity<0?-1:1,amount=Math.abs(velocity);
    if(!g.source||g.sign!==sign){
     const old=g.source;if(old){try{old.stop(t+.015);}catch(_){}old.onended=()=>old.disconnect();}
     const source=c.createBufferSource();source.buffer=this.scratch[sign<0?1:0];source.loop=true;source.loopStart=.1;source.loopEnd=.65;source.playbackRate.value=.4+amount*.55;source.connect(g.filter);source.start(t);g.source=source;g.sign=sign;
    }
    g.source.playbackRate.setTargetAtTime(.35+Math.min(amount,6)*.52,t,.035);
    g.filter.frequency.setTargetAtTime(700+Math.min(amount,6)*340,t,.06);
    g.gain.gain.setTargetAtTime(Math.min(amount/2,1)*(i===0?.06:.025),t,.035);
   });
  }
  setMuted(muted){this.muted=muted;if(this.master)this.master.gain.setTargetAtTime(muted?0:.42*(this.volume??1),this.ctx.currentTime,.04);}
  async pause(){if(this.ctx&&this.ctx.state==='running')await this.ctx.suspend();}
  async resume(){if(this.ctx){await this.ctx.resume();this.next=this.ctx.currentTime+.05;}}
  finish(){if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.18);this.running=false;clearInterval(this.timer);this.timer=null;clearTimeout(this.stopTimer);this.stopTimer=setTimeout(()=>{if(!this.running&&this.ctx?.state==='running')this.ctx.suspend();},650);}
  dispose(){this.music?.dispose();this.music=null;clearInterval(this.timer);clearTimeout(this.stopTimer);this.timer=null;for(const g of this.grains||[]){try{g.source?.stop();}catch(_){}}for(const n of this.nodes){try{n.disconnect();}catch(_){}}this.nodes=[];this.running=false;}
 }
 window.VinylSound=VinylSound;
})();
