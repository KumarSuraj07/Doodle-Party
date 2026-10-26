const WORDS="apple,banana,castle,dragon,rocket,guitar,pizza,robot,island,bridge,camera,candle,cloud,diamond,elephant,flower,ghost,hammer,igloo,jellyfish,kangaroo,lighthouse,mountain,ninja,octopus,penguin,rainbow,sandwich,tiger,umbrella,volcano,waterfall,zombie,bicycle,balloon,cactus,donut,eagle,fireworks,giraffe,helicopter,ice cream,jungle,key,ladder,mermaid,notebook,owl,pirate,queen,rabbit,snowman,telescope,unicorn,vampire,windmill,spider,skateboard,treasure,submarine,toothbrush,campfire,butterfly,crown,dinosaur,fox,headphones,lightning,moon,pyramid,scarecrow,sunglasses,tornado,whale,backpack,clock,popcorn,sword,tent,train,wizard,airplane,anchor,angel,ant,arrow,axe,baby,beard,bed,bell,bird,book,boot,bottle,brain,bus,cake,car,cat,chair,cheese,chess,chicken,church,circle,clown,coffee,coin,compass,computer,cookie,cow,crab,cup,deer,desk,dog,door,dress,drum,duck,ear,egg,eye,face,fan,feather,fence,fire,fish,flag,fly,foot,fork,frog,glasses,glove,goat,grape,grass,hand,hat,heart,horse,house,kite,knife,lamp,leaf,leg,lion,lips,lock,map,mask,medal,mirror,monkey,mouse,mouth,mushroom,nail,nose,nurse,paint,pan,panda,paper,parrot,pencil,phone,pig,pillow,pipe,plane,plate,plug,pocket,police,potato,pumpkin,ring,river,road,rope,rose,ruler,shark,sheep,shell,ship,shoe,sign,skull,snake,sock,sofa,spoon,star,stone,sun,table,tank,tape,thumb,ticket,tie,tiger,toilet,tomato,tooth,torch,towel,tree,truck,trumpet,turtle,vase,violin,wall,watch,wave,web,well,wheel,window,wing,wolf,worm,zebra".split(",");
const COLORS=["#ffffff","#000000","#ef5350","#ff7043","#ffd600","#66bb6a","#26c6da","#42a5f5","#7e57c2","#ec407a","#8d6e63","#bdbdbd","#e53935","#e65100","#f9a825","#2e7d32","#00838f","#1565c0","#4527a0","#ad1457","#3e2723","#212121"];
const SIZES=[{w:3,d:4},{w:6,d:8},{w:12,d:14},{w:20,d:22}];
const AVC=["#e53935","#8e24aa","#1e88e5","#00897b","#f4511e","#fdd835","#43a047","#00acc1"];
const AVS="🦊 🐼 🐸 🐙 🦄 🐯 🐧 🦉 🐳 🐲 👻 🤖 🍕 🌵 🚀 🎩 🐻 🦁 🐨 🐵 🦋 🐬 🦅 🎃".split(" ");
const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const me={id:Math.random().toString(36).slice(2,8),name:"",av:AVS[Math.floor(Math.random()*AVS.length)]};
const fresh=(o={})=>({phase:"lobby",round:1,rounds:o.rounds||3,time:o.time||80,drawer:"",hint:"",endsAt:0,scores:{},ok:[],last:"",reveal:"",hostId:""});
let R=null,code="",players=[],S=fresh(),W={word:"",opts:[],shown:"",cw:""};
let hist=[],strokeId="",sn=0,known=new Set();
let word="",tool={c:"#000000",w:6,erase:false,fill:false},drawing=false,buf=[];
const cv=document.getElementById("cv"),ctx=cv.getContext("2d");
ctx.lineCap=ctx.lineJoin="round";

function logMsg(h,cls){
  const l=$("#log"),d=document.createElement("div");
  d.className="msg-row"+(cls?" "+cls:"");
  d.innerHTML=h;l.appendChild(d);l.scrollTop=1e9;
}

const nameOf=id=>(players.find(p=>p.id===id)||{}).name||"Someone";
const amDrawer=()=>S.drawer===me.id&&(S.phase==="choose"||S.phase==="draw");
const hostId=()=>S.hostId||(players.map(p=>p.id).sort()[0]||me.id);
const isHost=()=>hostId()===me.id;

// avatar picker
$("#avs").innerHTML=AVS.map(a=>`<button data-a="${a}">${a}</button>`).join("");
const pickAv=()=>$("#avs").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.a===me.av));
$("#avs").onclick=e=>{const a=e.target.dataset&&e.target.dataset.a;if(a){me.av=a;pickAv()}};pickAv();
if(location.hash.length>1)$("#code").value=location.hash.slice(1,7);

function connect(room){return new Promise((res,rej)=>{
  const ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host);
  const H={},PH=[];let pres={};
  const send=o=>ws.readyState===1&&ws.send(JSON.stringify(o));
  const api={
    emit:(topic,data)=>{send({t:"emit",topic,data})},
    on:(tp,f)=>{(H[tp]=H[tp]||[]).push(f)},
    presence:p=>{pres={...pres,...p};send({t:"pres",data:pres})},
    onPeers:f=>{PH.push(f)}
  };
  ws.onopen=()=>{send({t:"join",room});res(api)};
  ws.onerror=()=>rej();
  ws.onclose=()=>logMsg("Disconnected. Refresh to rejoin.","sys");
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.t==="emit")(H[m.topic]||[]).forEach(f=>f({topic:m.topic,data:m.data}));
    if(m.t==="peers")PH.forEach(f=>f(m));
  };
});}

$("#go").onclick=async()=>{
  me.name=$("#name").value.trim().slice(0,14);
  if(!me.name)return $("#lerr").textContent="Enter your name first.";
  const typed=$("#code").value.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
  code=typed||Math.random().toString(36).slice(2,6);
  $("#go").disabled=true;$("#lerr").textContent="Connecting…";
  try{R=await connect("dp-"+code)}
  catch(e){$("#go").disabled=false;return $("#lerr").textContent="Couldn't connect. Try again.";}
  players=[{id:me.id,name:me.name,av:me.av}];
  S.hostId=me.id;
  $("#lobby").classList.add("hide");$("#game").classList.remove("hide");
  resizeCanvas();wire();render();
  logMsg("Room <b>"+code.toUpperCase()+"</b> · Share with friends","sys");
  setInterval(hostTick,500);
  // persistent delegated handler on #ov - survives innerHTML rebuilds
  document.getElementById("ov").addEventListener("click",function(e){
    const t=e.target;
    if(t.id==="st"){startGame();return;}
    if(t.dataset.r){S.rounds=+t.dataset.r;bcast();return;}
    if(t.dataset.t){S.time=+t.dataset.t;bcast();return;}
    if(t.id==="iv"){
      const u=location.href.split("#")[0]+"#"+code;
      const msg="Join my Doodle Party! "+u+" (code: "+code.toUpperCase()+")";
      (navigator.clipboard?navigator.clipboard.writeText(msg):Promise.reject())
        .then(()=>logMsg("Invite link copied!","sys")).catch(()=>logMsg(esc(msg),"sys"));
    }
  });
};
$("#name").onkeydown=$("#code").onkeydown=e=>{if(e.key==="Enter")$("#go").click()};

function wire(){
  R.on("state",m=>{
    if(isHost())return;
    const d=m.data;
    if(d.phase==="choose"||d.drawer!==S.drawer)word="";
    S=d;S.endsAt=Date.now()+Math.max(0,d.left||0);render();
  });
  R.on("word",m=>{
    if(m.data.to!==me.id)return;
    if(m.data.opts){showOpts(m.data.opts);return;}
    word=m.data.w;
    // ensure overlay is hidden so drawer can draw immediately
    document.getElementById("ov").classList.add("hide");
    render();
  });
  R.on("pick",m=>{
    if(isHost()&&m.data.id===S.drawer&&S.phase==="choose"&&W.opts.includes(m.data.w))startDraw(m.data.w);
  });
  R.on("guess",m=>{if(isHost())onGuess(m.data)});
  R.on("chat",m=>{
    const d=m.data;
    if(d.k==="win")logMsg("🎉 <b>"+esc(d.n)+"</b> guessed it!","win");
    else if(d.k==="sys")logMsg(esc(d.t),"sys");
    else if(d.k==="close")logMsg("🔥 <b>"+esc(d.n)+"</b>: "+esc(d.t)+" <i>(so close!)</i>","close");
    else logMsg("<b>"+esc(d.n)+"</b>: "+esc(d.t));
  });
  R.on("seg",m=>{
    const d=m.data;
    let s=hist[hist.length-1];
    if(!s||s.s!==d.s){s={s:d.s,segs:[]};hist.push(s);if(hist.length>200)hist.shift();}
    s.segs.push(d);
    if(d.id!==me.id)paint(d);
  });
  R.on("fill",m=>{if(m.data.id!==me.id)floodFill(Math.round(m.data.x*800),Math.round(m.data.y*500),m.data.c)});
  R.on("sync",m=>{
    const d=m.data;if(d.to!==me.id)return;
    d.st.forEach(o=>{
      const h=hist.find(x=>x.s===o.s);if(h&&!h.sy)return;
      const pts=[];for(let i=0;i<o.p.length;i+=2)pts.push([o.p[i],o.p[i+1]]);
      const g={id:"sync",s:o.s,c:o.c,w:o.w,e:o.e,p:pts};
      if(h)h.segs.push(g);else hist.push({s:o.s,sy:1,segs:[g]});paint(g);
    });
  });
  R.on("undo",()=>{hist.pop();redraw()});
  R.on("clear",()=>{hist=[];ctx.clearRect(0,0,800,500)});
  R.onPeers(ch=>{
    players=ch.peers.map(p=>p.presence).filter(p=>p&&p.id)
      .map(p=>({id:p.id,name:String(p.name||"?").slice(0,14),av:String(p.av||"🙂").slice(0,4)}));
    if(!players.find(p=>p.id===me.id))players.push({id:me.id,name:me.name,av:me.av});
    const fr=players.filter(p=>p.id!==me.id&&!known.has(p.id));fr.forEach(p=>known.add(p.id));
    const playing=S.phase!=="lobby"&&S.phase!=="over";
    if(playing&&S.hostId&&!players.find(p=>p.id===S.hostId)){
      S=fresh({rounds:S.rounds,time:S.time});logMsg("Host left. Back to lobby.","sys");
    } else if(isHost()){
      if(playing&&(S.phase==="choose"||S.phase==="draw")&&!players.find(p=>p.id===S.drawer))endRound("Drawer left");
      else if(fr.length){bcast();fr.forEach(p=>sendSync(p.id));}
    }
    render();
  });
  R.presence({id:me.id,name:me.name,av:me.av});
}

const say=(k,n,t)=>R.emit("chat",{k,n,t});
function bcast(){R.emit("state",{...S,left:S.endsAt-Date.now()});render();}

function startGame(){
  const cw=(W.cw||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,60);
  W.pool=cw.length>=3?cw:WORDS.concat(cw);
  S={...S,phase:"choose",round:1,drawer:"",ok:[],last:"",reveal:"",turn:-1,
     order:[...players].map(p=>p.id),hostId:me.id,scores:{}};
  players.forEach(p=>S.scores[p.id]=0);
  nextTurn();
}

function nextTurn(){
  do{
    S.turn++;
    if(S.turn>=S.order.length){S.turn=0;S.round++;}
    if(S.round>S.rounds){S.phase="over";S.drawer="";S.hint="";return bcast();}
  }while(!players.find(p=>p.id===S.order[S.turn]));
  S.drawer=S.order[S.turn];S.phase="choose";S.ok=[];S.hint="";S.reveal="";word="";
  S.endsAt=Date.now()+15000;
  W.opts=[...(W.pool||WORDS)].sort(()=>Math.random()-.5).slice(0,3);W.word="";
  R.emit("clear");bcast();
  R.emit("word",{to:S.drawer,opts:W.opts});
  if(S.drawer===me.id)showOpts(W.opts);
}

function startDraw(w){
  W.word=w;W.shown=w.replace(/[^ \-]/g,"_");W.h1=W.h2=0;
  S.phase="draw";S.endsAt=Date.now()+S.time*1000;S.hint=W.shown;
  R.emit("word",{to:S.drawer,w});bcast();
}

function hostTick(){
  if(!isHost())return;
  const left=S.endsAt-Date.now();
  if(S.phase==="choose"&&left<=0)return startDraw(W.opts[0]);
  if(S.phase==="draw"){
    const f=1-left/(S.time*1000);
    [["h1",.35],["h2",.65]].forEach(([k,t])=>{
      if(f>t&&!W[k]){W[k]=1;
        const idx=[...W.word].map((c,i)=>/[^ \-]/.test(c)&&W.shown[i]==="_"?i:-1).filter(i=>i>=0);
        if(idx.length>1){const i=idx[Math.floor(Math.random()*idx.length)];
          W.shown=W.shown.slice(0,i)+W.word[i]+W.shown.slice(i+1);S.hint=W.shown;bcast();}
      }
    });
    if(left<=0)endRound("Time's up!");
  }
  if(S.phase==="reveal"&&left<=0)nextTurn();
}

function onGuess({id,t}){
  if(S.phase!=="draw"||id===S.drawer||S.ok.includes(id))return say("chat",nameOf(id),t);
  const guess=t.trim().toLowerCase(),ans=W.word;
  if(guess===ans){
    const f=Math.max(0,(S.endsAt-Date.now())/(S.time*1000));
    S.scores[id]=(S.scores[id]||0)+Math.round(50+f*150);
    S.scores[S.drawer]=(S.scores[S.drawer]||0)+Math.round(20+f*30);
    S.ok.push(id);say("win",nameOf(id),"");
    if(S.ok.length>=players.length-1)endRound("Everyone guessed it!");else bcast();
  } else {
    // close guess: edit distance <= 1
    if(ans.length>3&&editDist(guess,ans)<=1)say("close",nameOf(id),t);
    else say("chat",nameOf(id),t);
  }
}

function editDist(a,b){
  const m=a.length,n=b.length;if(Math.abs(m-n)>1)return 99;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i||j));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
    dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function endRound(why){
  S.phase="reveal";S.reveal=W.word||"?";S.hint=S.reveal;S.endsAt=Date.now()+5000;S.last=why;
  say("sys","","The word was \u201c"+S.reveal+"\u201d");bcast();
}

// ── DRAWING ──
function resizeCanvas(){
  const stage=document.getElementById("stage");
  const sw=stage.clientWidth,sh=stage.clientHeight;
  const wrap=document.getElementById("cv-wrap");
  // on narrow screens fill full width, let height follow ratio
  if(sw<=600){
    const w=sw,h=Math.floor(sw*500/800);
    wrap.style.width=w+"px";wrap.style.height=h+"px";
    cv.style.width=w+"px";cv.style.height=h+"px";
  } else {
    const scale=Math.min(sw/800,(sh-4)/500);
    const w=Math.floor(800*scale),h=Math.floor(500*scale);
    wrap.style.width=w+"px";wrap.style.height=h+"px";
    cv.style.width=w+"px";cv.style.height=h+"px";
  }
}
window.addEventListener("resize",resizeCanvas);

function pos(e){
  const r=cv.getBoundingClientRect();
  return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];
}

function paint(d){
  ctx.globalCompositeOperation=d.e?"destination-out":"source-over";
  ctx.strokeStyle=d.c;ctx.lineWidth=d.w;
  ctx.beginPath();const p=d.p;
  ctx.moveTo(p[0][0]*800,p[0][1]*500);
  if(p.length===1)ctx.lineTo(p[0][0]*800+.1,p[0][1]*500);
  for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0]*800,p[i][1]*500);
  ctx.stroke();ctx.globalCompositeOperation="source-over";
}

function floodFill(sx,sy,fillColor){
  const img=ctx.getImageData(0,0,800,500);
  const data=img.data;
  const idx=(x,y)=>(y*800+x)*4;
  const ti=idx(sx,sy);
  const tr=data[ti],tg=data[ti+1],tb=data[ti+2],ta=data[ti+3];
  const fc=fillColor.replace("#","");
  const fr=parseInt(fc.slice(0,2),16),fg=parseInt(fc.slice(2,4),16),fb=parseInt(fc.slice(4,6),16);
  if(tr===fr&&tg===fg&&tb===fb&&ta===255)return;
  const stack=[[sx,sy]];const visited=new Uint8Array(800*500);
  while(stack.length){
    const [x,y]=stack.pop();
    if(x<0||x>=800||y<0||y>=500)continue;
    const i=idx(x,y);const vi=y*800+x;
    if(visited[vi])continue;visited[vi]=1;
    if(data[i]!==tr||data[i+1]!==tg||data[i+2]!==tb||data[i+3]!==ta)continue;
    data[i]=fr;data[i+1]=fg;data[i+2]=fb;data[i+3]=255;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(img,0,0);
}

function sendSync(to){
  if(!hist.length)return;let ch=[],len=0;
  const out=()=>{if(ch.length)R.emit("sync",{to,st:ch});ch=[];len=0;};
  hist.forEach(s=>{
    const p=[];
    s.segs.forEach((g,i)=>g.p.forEach((q,j)=>{if(i&&!j)return;p.push(Math.round(q[0]*1e3)/1e3,Math.round(q[1]*1e3)/1e3);}));
    const g=s.segs[0];
    for(let i=0;i<p.length;i+=198){
      const o={s:s.s,c:g.c,w:g.w,e:g.e,p:p.slice(i,i+200)},l=JSON.stringify(o).length;
      if(len+l>3000)out();ch.push(o);len+=l;
    }
  });out();
}

function redraw(){ctx.clearRect(0,0,800,500);hist.forEach(s=>s.segs.forEach(paint));}

function flush(){
  if(buf.length){
    const d={id:me.id,s:strokeId,c:tool.c,w:tool.w,e:tool.erase,p:buf};
    paint(d);R.emit("seg",d);buf=[buf[buf.length-1]];
  }
}

cv.onpointerdown=e=>{
  if(!(amDrawer()&&S.phase==="draw"))return;
  const p=pos(e);
  if(tool.fill){
    floodFill(Math.round(p[0]*800),Math.round(p[1]*500),tool.c);
    R.emit("fill",{id:me.id,x:p[0],y:p[1],c:tool.c});
    return;
  }
  strokeId=me.id+(++sn);drawing=true;cv.setPointerCapture(e.pointerId);buf=[p];flush();
};
cv.onpointermove=e=>{if(drawing){buf.push(pos(e));if(buf.length>5)flush();}};
cv.onpointerup=cv.onpointercancel=()=>{if(drawing){drawing=false;flush();buf=[];}};

// ── UI ──
function showOpts(opts){
  const ov=$("#ov");ov.classList.remove("hide");
  ov.innerHTML=`<h2>Choose a word to draw</h2><div class="sub2">You have 15 seconds</div><div class="word-opts"></div>`;
  opts.forEach(w=>{
    const b=document.createElement("button");b.className="word-btn";b.textContent=w;
    b.onclick=()=>{word=w;ov.classList.add("hide");if(isHost())startDraw(w);else{R.emit("pick",{id:me.id,w});render();}};
    ov.lastChild.appendChild(b);
  });
}

function render(){
  if(!R)return;
  const sc=S.scores||{};
  const sorted=[...players].sort((a,b)=>(sc[b.id]||0)-(sc[a.id]||0));
  $("#players").innerHTML=sorted.map((p,i)=>{
    const ci=[...p.id].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length;
    const drawing=p.id===S.drawer&&S.phase==="draw";
    const guessed=(S.ok||[]).includes(p.id);
    return `<div class="pl${drawing?" drawing":""}${guessed?" guessed":""}">
      <div class="rank">${i+1}</div>
      <div class="av" style="background:${AVC[ci]}">${esc(p.av||"🙂")}</div>
      <div class="pl-info"><b>${esc(p.name)}${p.id===me.id?" <span style='color:#ffd600;font-size:10px'>(you)</span>":""}</b>
      <small>${sc[p.id]||0} pts</small></div></div>`;
  }).join("");

  $("#rinfo").textContent=S.phase==="lobby"?"Lobby · "+code.toUpperCase():
    S.phase==="over"?"Game Over":
    "Round "+Math.min(S.round,S.rounds)+" / "+S.rounds;

  // hint display: show blanks with spaces between chars
  const hintText=(amDrawer()&&word)?word:(S.hint||"");
  $("#hint").textContent=hintText.split("").join(" ");

  const ov=$("#ov"),host=isHost();

  if(S.phase==="lobby"||S.phase==="over"){
    let h="";
    if(S.phase==="over"){
      h=`<h2>🏆 Game Over!</h2>`;
      sorted.forEach((p,i)=>{
        h+=`<div class="score-row${i===0?" first":""}">
          <div class="pos">${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
          <div class="sav">${esc(p.av)}</div>
          <div class="sname">${esc(p.name)}</div>
          <div class="spts">${sc[p.id]||0} pts</div></div>`;
      });
    } else {
      h=`<h2>Waiting for players…</h2>
        <div class="sub2">Room code: <b style="color:#ffd600;letter-spacing:3px;font-size:18px">${code.toUpperCase()}</b> · ${players.length} player${players.length!==1?"s":""}</div>
        <button class="word-btn" id="iv" style="font-size:13px;padding:8px 16px">📋 Copy invite link</button>`;
    }
    if(host){
      h+=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;margin-top:4px">
        <span style="color:#90caf9;font-size:13px">Rounds:</span>
        ${[2,3,5].map(n=>`<button class="tbtn${S.rounds===n?" on":""}" data-r="${n}">${n}</button>`).join("")}
        <span style="color:#90caf9;font-size:13px;margin-left:8px">Seconds:</span>
        ${[60,80,120].map(n=>`<button class="tbtn${S.time===n?" on":""}" data-t="${n}">${n}</button>`).join("")}
      </div>
      <input type="text" id="cw" placeholder="Custom words, comma separated (3+ to use only yours)" maxlength="400"
        style="padding:8px 12px;border:2px solid #2a3a5c;border-radius:8px;background:#0d1b2a;color:#fff;outline:none;width:100%;max-width:360px;font-size:13px"
        value="${esc(W.cw||"")}">
      <button class="pbtn green" id="st" style="max-width:240px">${S.phase==="over"?"▶ Play Again":"▶ Start Game"}</button>
      ${players.length<2?`<div style="color:#556;font-size:12px">Invite friends with the room code above</div>`:""}`;
    } else {
      h+=`<div style="color:#556;font-size:13px;margin-top:8px">${esc(nameOf(hostId()))} will start the game</div>`;
    }
    ov.classList.remove("hide");ov.innerHTML=h;
    const cw=$("#cw");if(cw)cw.oninput=e=>W.cw=e.target.value;
  } else if(S.phase==="choose"){
    if(S.drawer!==me.id){
      ov.classList.remove("hide");
      ov.innerHTML=`<h2>${esc(nameOf(S.drawer))} is choosing a word…</h2><div class="sub2">Get ready to guess!</div>`;
    }
    // if we ARE the drawer, don't touch ov - showOpts manages it
  } else if(S.phase==="reveal"){
    ov.classList.remove("hide");
    ov.innerHTML=`<h2>${esc(S.last)}</h2><div class="sub2">The word was <b style="color:#ffd600;font-size:20px">${esc(S.reveal)}</b></div>`;
  } else {
    ov.classList.add("hide");
  }

  // tools
  const t=$("#tools");
  if(amDrawer()&&S.phase==="draw"){
    t.classList.remove("hide");
    t.innerHTML=`<div class="colors">${COLORS.map(c=>`<button class="sw${tool.c===c&&!tool.erase&&!tool.fill?" on":""}" data-c="${c}" style="background:${c};${c==="#ffffff"?"border:2px solid #444":""}"></button>`).join("")}</div>
    <div class="tsep"></div>
    <div class="sizes">${SIZES.map(s=>`<button class="sz${tool.w===s.w&&!tool.erase?" on":""}" data-w="${s.w}"><span style="width:${s.d}px;height:${s.d}px"></span></button>`).join("")}</div>
    <div class="tsep"></div>
    <button class="tbtn${tool.fill?" on":""}" id="tfill">🪣 Fill</button>
    <button class="tbtn${tool.erase?" on":""}" id="ter">⌫ Eraser</button>
    <button class="tbtn" id="tun">↩ Undo</button>
    <button class="tbtn" id="tcl">🗑 Clear</button>`;
    t.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{tool.c=b.dataset.c;tool.erase=false;tool.fill=false;render();});
    t.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{tool.w=+b.dataset.w;tool.erase=false;render();});
    $("#tfill").onclick=()=>{tool.fill=!tool.fill;tool.erase=false;render();};
    $("#ter").onclick=()=>{tool.erase=!tool.erase;tool.fill=false;render();};
    $("#tcl").onclick=()=>R.emit("clear");
    $("#tun").onclick=()=>R.emit("undo");
  } else {
    t.classList.add("hide");
  }

  const dis=amDrawer()&&S.phase==="draw";
  $("#msg").disabled=dis;
  $("#msg").placeholder=dis?"You are drawing! 🎨":"Type your guess…";
}

// timer
setInterval(()=>{
  const l=Math.ceil((S.endsAt-Date.now())/1000);
  const show=["choose","draw","reveal"].includes(S.phase)&&l>=0;
  $("#timer").textContent=show?l:"–";
  $("#timer").className=l<=10?"danger":l<=20?"warn":"";
},250);

// chat
function sendMsg(){
  const t=$("#msg").value.trim();if(!t||!R)return;
  if(S.phase==="draw"&&!amDrawer()&&!(S.ok||[]).includes(me.id)){
    R.emit("guess",{id:me.id,t:t.slice(0,60)});
    logMsg("<b class='me'>"+esc(me.name)+"</b>: "+esc(t),"me");
  } else {
    R.emit("chat",{k:"chat",n:me.name,t:t.slice(0,60)});
    logMsg("<b>"+esc(me.name)+"</b>: "+esc(t),"me");
  }
  $("#msg").value="";
}
$("#msg").onkeydown=e=>{if(e.key==="Enter")sendMsg();};
$("#send").onclick=sendMsg;

if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js");
