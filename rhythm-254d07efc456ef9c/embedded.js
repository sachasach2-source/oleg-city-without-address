/* The standalone prototypes never send story flags. Only this owned frame can
   return a bounded musical result to the Ren'Py call that opened it. */
(()=>{
 'use strict';
 const token=new URLSearchParams(location.search).get('token');
 if(!token||parent===window)return;
 const api=window.RhythmGameAPI;
 if(!api)return;
 const style=document.createElement('style');
 style.textContent='body[data-state="result"] #help,a,#again,#back,#finish,footer,#after{display:none!important}';document.head.append(style);
 document.querySelectorAll('a, #again, #back, #finish, footer').forEach(e=>e.hidden=true);
 const send=(command='snapshot')=>parent.postMessage({rhythm:1,token,command,snapshot:api.snapshot()},location.origin);
 const finish=document.createElement('button');finish.textContent='Вернуться к истории';finish.className='primary';finish.hidden=true;
 finish.onclick=()=>send('done');document.querySelector('header').append(finish);
 addEventListener('message',async e=>{
  if(e.source!==parent||e.origin!==location.origin||e.data?.token!==token)return;
  if(e.data.command==='restore'){await api.restore(e.data.snapshot);send();}
  if(e.data.command==='configure')api.configure(e.data.settings);
  if(e.data.command==='save'){api.pause();send('save');}
 });
 setInterval(()=>{finish.hidden=!api.result();send();},500);
 addEventListener('pagehide',()=>api.pause());
 send('ready');
})();
