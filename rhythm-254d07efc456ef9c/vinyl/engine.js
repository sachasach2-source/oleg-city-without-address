(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.VinylEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const approach=(a,b,dt,speed)=>a+(b-a)*(1-Math.exp(-dt*speed));
 const DURATION=42;
 function phrase(t){return t<14?0:t<28?1:2;}
 function tempo(t,practice=false){const p=practice?0:clamp((t-4)/38);return (.64+.24*p*p*(3-2*p))*120;}
 function musicalPhase(t,practice=false){const p=practice?0:clamp((t-4)/38);return (.64*t+.24*38*(p*p*p-.5*p*p*p*p))*Math.PI*2;}
 function lead(t,offset=0,practice=false){const a=musicalPhase(t,practice)+offset;return Math.sin(a)*2.4+Math.sin(a*2+.5)*.18;}
 class Session{
  constructor({practice=false}={}){this.practice=practice;this.duration=practice?1e9:DURATION;this.time=0;this.score=0;this.harmony=0;this.quality=0;this.mismatchTime=0;this.user=0;this.partner=0;this.userAngle=.4;this.partnerAngle=-.7;this.activity=0;this.turns=0;this.flowTime=0;this.bestFlow=0;this.flow=0;this.direction=0;this.directionSince=0;this.lastSign=0;this.lastTurn=-1;this.stroke=0;this.echo=0;this.finished=false;this.phase=0;this.phaseOffset=0;this.phaseCorrection=0;this.interval=.78;this.rateBias=0;this.targetBias=0;}
  step(dt,input={}){
   if(this.finished)return this;
   dt=clamp(Number.isFinite(dt)?dt:0,0,.08);if(!dt)return this;
   const left=this.duration-this.time;dt=Math.min(dt,left);this.time+=dt;this.phase=this.practice?0:phrase(this.time);
   this.rateBias=approach(this.rateBias,this.targetBias,dt,2);
   const correction=approach(0,this.phaseCorrection,dt,4);
   this.phaseCorrection-=correction;
   this.phaseOffset+=this.rateBias*Math.PI*2*dt+correction;
   const velocity=input.touching?clamp(Number.isFinite(input.velocity)?input.velocity:0,-8,8):0;
   this.user=approach(this.user,velocity,dt,12);
   this.activity=approach(this.activity,Math.abs(this.user),dt,4);
   const sign=Math.abs(this.user)>.55?Math.sign(this.user):0;
   if(sign&&sign!==this.direction){this.direction=sign;this.directionSince=this.time;}
   // A recurring sustained stroke is intentional play; high-frequency jitter
   // never holds a direction long enough to earn the correction grace.
   const sustained=clamp((this.time-this.directionSince-.10)/.18);
   this.stroke+=Math.abs(this.user)*dt;
   if(sign&&sign!==this.lastSign&&this.time-this.lastTurn>.18&&this.stroke>.2){
    const interval=this.time-this.lastTurn;
    if(this.lastSign&&interval>.42&&interval<1.3){
     this.interval=this.interval*.75+interval*.25;
     this.targetBias=clamp((1/(2*this.interval)-tempo(this.time,this.practice)/120)*.6,-.13,.13);
     const target=(sign>0?0:Math.PI)+.42,current=musicalPhase(this.time,this.practice)+this.phaseOffset;
     const error=Math.atan2(Math.sin(target-current),Math.cos(target-current));
     // Answer a plausible recurring gesture gradually, rather than demanding
     // that the player discover an invisible absolute phase from the start.
     this.phaseCorrection+=clamp(error*.4,-.6,.6);
    }
    if(this.lastSign)this.turns++;
    this.lastSign=sign;this.lastTurn=this.time;this.stroke=0;
   }
   this.echo=approach(this.echo,this.user,dt,3.2);
   const response=clamp(this.activity/2)*(.18+.22*this.harmony);
   this.partner=approach(this.partner,lead(this.time,this.phaseOffset,this.practice)*(1-response)+this.echo*response,dt,8);
   const difference=Math.abs(this.user-this.partner);
   const closeness=clamp(1-difference/(2.5+Math.abs(this.partner)*.85));
   const moving=clamp(this.activity/.9)*(.2+.8*clamp(this.turns/3));
   const aligned=this.user*this.partner>=0?1:clamp(1-difference/3.6,.28,1);
   const match=closeness*aligned*moving*sustained;
   // Brief reversals and late corrections retain some earned flow. Sustained
   // mismatch still lowers scoring; inactivity cannot keep the grace alive.
   this.mismatchTime=match>=.48?0:this.mismatchTime+dt;
   const settling=match>=this.quality?6:this.mismatchTime<=.45?.8:4;
   this.quality=approach(this.quality,match,dt,settling);
   this.harmony=approach(this.harmony,this.quality,dt,this.quality>this.harmony?2.4:.7);
   if(!this.practice)this.score+=1000/DURATION*this.quality*dt;
   if(this.harmony>.48){this.flowTime+=dt;this.flow+=dt;this.bestFlow=Math.max(this.bestFlow,this.flow);}else this.flow=0;
   this.userAngle+=this.user*dt;
   this.partnerAngle+=this.partner*dt;
   if(this.time>=this.duration-1e-6){this.time=DURATION;this.finished=true;this.score=Math.round(clamp(this.score,0,1000));}
   return this;
  }
  result(){return {score:Math.round(clamp(this.score,0,1000)),flowTime:Math.round(this.flowTime*10)/10,bestFlow:Math.round(this.bestFlow*10)/10,turns:this.turns,tier:this.score>=630?'together':this.score>=330?'searching':'different'};}
 }
 return {Session,lead,phrase,tempo,musicalPhase,DURATION,clamp,approach};
});
