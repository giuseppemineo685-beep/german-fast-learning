// Cloudflare Pages Function: /api/*
// Bind a D1 database named DB, and configure GOOGLE_CLIENT_ID and SESSION_SECRET.
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
async function hmac(secret){return crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
async function issue(sub,secret){const payload=b64(enc.encode(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+60*60*24*30})));const sig=b64(await crypto.subtle.sign("HMAC",await hmac(secret),enc.encode(payload)));return payload+"."+sig}
async function session(req,secret){const raw=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("gfl_session="));if(!raw||!secret)return null;const token=raw.slice(12);const parts=token.split(".");if(parts.length!==2)return null;try{const valid=await crypto.subtle.verify("HMAC",await hmac(secret),unb64(parts[1]),enc.encode(parts[0]));if(!valid)return null;const p=JSON.parse(new TextDecoder().decode(unb64(parts[0])));return p.exp>Date.now()/1000&&typeof p.sub==="string"?p.sub:null}catch{return null}}
function cookie(value,age){return "gfl_session="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age}
function safeOrigin(req){const origin=req.headers.get("origin");return !origin||origin===new URL(req.url).origin}
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!env.GOOGLE_CLIENT_ID||!env.SESSION_SECRET||!env.DB)return json({error:"Falta configurar GOOGLE_CLIENT_ID, SESSION_SECRET o D1 binding DB en Cloudflare."},503);
 if(!["GET","POST","PUT"].includes(method))return json({error:"Método no permitido"},405);
 if(method!=="GET"&&!safeOrigin(request))return json({error:"Origen no permitido"},403);
 if(path==="/api/config"&&method==="GET")return json({clientId:env.GOOGLE_CLIENT_ID});
 if(path==="/api/auth"&&method==="POST"){
   let body;try{body=await request.json()}catch{return json({error:"JSON inválido"},400)}
   if(typeof body.credential!=="string"||body.credential.length>12000)return json({error:"Credencial inválida"},400);
   const verify=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(body.credential));
   if(!verify.ok)return json({error:"Google no pudo validar la sesión"},401);
   const google=await verify.json();
   if(google.aud!==env.GOOGLE_CLIENT_ID||!["accounts.google.com","https://accounts.google.com"].includes(google.iss)||Number(google.exp)<=Date.now()/1000||!google.sub||google.email_verified!=="true")return json({error:"Token de Google no autorizado"},401);
   const token=await issue(google.sub,env.SESSION_SECRET);
   return json({ok:true,name:google.name||google.email||"Estudiante"},200,{"set-cookie":cookie(token,60*60*24*30)});
 }
 if(path==="/api/logout"&&method==="POST")return json({ok:true},200,{"set-cookie":cookie("",0)});
 const sub=await session(request,env.SESSION_SECRET);
 if(!sub)return json({error:"Inicia sesión con Google"},401);
 if(path==="/api/progress"&&method==="GET"){
   const row=await env.DB.prepare("SELECT data FROM progress WHERE user_id=?").bind(sub).first();
   return json({data:row?JSON.parse(row.data):null});
 }
 if(path==="/api/progress"&&method==="PUT"){
   let body;try{body=await request.json()}catch{return json({error:"JSON inválido"},400)}
   if(!body||!Array.isArray(body.done)||body.done.length>84||body.done.some(n=>!Number.isInteger(n)||n<1||n>84)||typeof body.notes!=="string"||body.notes.length>50000||typeof body.scores!=="string"||body.scores.length>50000)return json({error:"Datos inválidos"},400);
   const data=JSON.stringify({done:[...new Set(body.done)],notes:body.notes,scores:body.scores});
   await env.DB.prepare("INSERT INTO progress(user_id,data,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(sub,data).run();
   return json({ok:true});
 }
 return json({error:"Ruta no encontrada"},404);
}
