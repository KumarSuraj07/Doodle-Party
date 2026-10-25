const http=require("http"),fs=require("fs"),path=require("path");
const {WebSocketServer}=require("ws");
const MIME={".html":"text/html;charset=utf-8",".json":"application/json",".js":"text/javascript;charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon"};
const pub=path.join(__dirname,"public");
const server=http.createServer((q,r)=>{
  const rel=q.url==="/"?"index.html":q.url.replace(/^\//,"").split("?")[0];
  const fp=path.resolve(pub,rel);
  if(!fp.startsWith(pub)){r.writeHead(403);return r.end();}
  fs.readFile(fp,(err,d)=>{
    if(err){r.writeHead(404);return r.end();}
    r.writeHead(200,{"Content-Type":MIME[path.extname(fp)]||"application/octet-stream","Cache-Control":"public,max-age=3600"});
    r.end(d);
  });
});
const wss=new WebSocketServer({server,maxPayload:16384});
const rooms=new Map(); // name -> Set<ws>
function peers(name,joined){
  const set=rooms.get(name);if(!set)return;
  const list=[...set].map(w=>({presence:w.pres||{}}));
  const msg=JSON.stringify({t:"peers",peers:list,joined:joined?[{presence:joined.pres||{}}]:[]});
  set.forEach(w=>w.readyState===1&&w.send(msg));
}
wss.on("connection",ws=>{
  ws.on("message",raw=>{
    let m;try{m=JSON.parse(raw)}catch{return}
    if(m.t==="join"&&!ws.room&&/^dp-[a-z0-9]{1,12}$/.test(m.room)){
      ws.room=m.room;if(!rooms.has(m.room))rooms.set(m.room,new Set());
      rooms.get(m.room).add(ws);
    }else if(m.t==="pres"&&ws.room){
      const first=!ws.pres;ws.pres=m.data;peers(ws.room,first?ws:null);
    }else if(m.t==="emit"&&ws.room&&/^[a-z]{1,10}$/.test(m.topic)){
      const out=JSON.stringify({t:"emit",topic:m.topic,data:m.data});
      rooms.get(ws.room).forEach(w=>w!==ws&&w.readyState===1&&w.send(out));
    }
  });
  ws.on("close",()=>{
    const set=ws.room&&rooms.get(ws.room);if(!set)return;
    set.delete(ws);
    if(set.size)peers(ws.room);else rooms.delete(ws.room);
  });
});
server.listen(process.env.PORT||3000,()=>console.log("Doodle Party on :"+(process.env.PORT||3000)));
