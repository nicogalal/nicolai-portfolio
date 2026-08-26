/* edit-mode.js v2.1 — in-place visual swapping for nicolaigalal.com
   Active ONLY on localhost. Matches slots by asset path against a fresh
   read of the source file on every operation. */
(function(){
  if(!["localhost","127.0.0.1"].includes(location.hostname)) return;
  if(!window.showDirectoryPicker) return;

  const VID_EXT=["mp4","mov","webm"];
  const ext=p=>p.split(".").pop().toLowerCase().split("?")[0];
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const page=(location.pathname.split("/").pop()||"index.html");
  let root=null, editing=false;

  /* ---------- UI ---------- */
  const css=document.createElement("style");
  css.textContent=`
    #ng-pill{position:fixed;left:18px;bottom:18px;z-index:99990;font:600 13px 'Instrument Sans',sans-serif;background:#0B0B0C;color:#fff;padding:11px 16px;cursor:pointer;border:0;letter-spacing:.03em}
    #ng-pill.on{background:#3D3BF3}
    .ng-hover{outline:2px dashed #3D3BF3 !important;outline-offset:-2px;cursor:copy}
    #ng-log{position:fixed;right:18px;bottom:18px;z-index:99990;width:min(400px,90vw);max-height:38vh;overflow:auto;background:#0B0B0C;color:#EDEDEF;font:12px/1.7 'Instrument Sans',sans-serif;padding:12px 15px;display:none}
    #ng-log.show{display:block}#ng-log b{color:#8B8AFB}
    .ng-add{position:absolute;right:10px;top:10px;z-index:99991;font:600 12px 'Instrument Sans',sans-serif;background:#fff;color:#1D1D1F;border:1px solid rgba(29,29,31,.3);padding:5px 10px;cursor:pointer}
    .ng-add:hover{background:#3D3BF3;color:#fff;border-color:#3D3BF3}`;
  document.head.appendChild(css);
  const pill=document.createElement("button"); pill.id="ng-pill"; pill.textContent="✎ Edit visuals";
  const log=document.createElement("div"); log.id="ng-log";
  log.innerHTML="<b>Changes</b><div id='ng-li'></div><div style='margin-top:8px;border-top:1px solid rgba(255,255,255,.25);padding-top:8px'>Push when done:<br>git add -A && git commit -m 'media' && git push origin main</div>";
  document.body.append(pill,log);
  const say=t=>{log.classList.add("show");const d=document.createElement("div");d.textContent="· "+t;document.getElementById("ng-li").appendChild(d);log.scrollTop=1e6;};

  /* Never let a stray drop navigate the tab away */
  addEventListener("dragover",e=>e.preventDefault());
  addEventListener("drop",e=>e.preventDefault());

  /* ---------- folder handle (persisted) ---------- */
  const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open("ng-edit",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
  const kvGet=async k=>{const db=await idb();return new Promise(res=>{const t=db.transaction("kv").objectStore("kv").get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>res(null);});};
  const kvSet=async(k,v)=>{const db=await idb();return new Promise(res=>{const t=db.transaction("kv","readwrite").objectStore("kv").put(v,k);t.onsuccess=res;t.onerror=res;});};
  async function connect(){
    let h=await kvGet("root");
    if(h && await h.queryPermission({mode:"readwrite"})!=="granted" && await h.requestPermission({mode:"readwrite"})!=="granted") h=null;
    if(!h){ h=await showDirectoryPicker({mode:"readwrite"}); await kvSet("root",h); }
    try{ await h.getFileHandle("index.html"); }catch(e){ alert("Pick the Portfolio folder itself (the one containing index.html)."); return null; }
    return h;
  }
  async function fileAt(path,create=false){const p=path.split("/");let d=root;for(let i=0;i<p.length-1;i++)d=await d.getDirectoryHandle(p[i],{create});return d.getFileHandle(p.at(-1),{create});}
  const writeAt=async(path,blob)=>{const fh=await fileAt(path,true);const w=await fh.createWritable();await w.write(blob);await w.close();};
  const readPage=async()=>await (await (await root.getFileHandle(page)).getFile()).text();
  const writePage=async t=>writeAt(page,new Blob([t],{type:"text/html"}));

  /* ---------- source-side helpers (path-based, always fresh) ---------- */
  const imgTagsFor=(html,src)=>html.match(new RegExp("<img\\b[^>]*src=\\\""+esc(src)+"\\\"[^>]*/?>","g"))||[];
  const videoBlocksFor=(html,src)=>(html.match(/<video\b[\s\S]*?<\/video>/g)||[]).filter(b=>b.includes('"'+src+'"'));
  const relSrc=el=>{const a=el.tagName==="VIDEO"?(el.querySelector("source")?.getAttribute("src")||el.getAttribute("src")):el.getAttribute("src");return a&&a.startsWith("assets/")?a:null;};
  const assetDir=html=>{const m=html.match(/assets\/[a-z0-9-]+\//g);if(!m)return "assets/";
    const c={};m.forEach(x=>c[x]=(c[x]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];};
  const iframeTagsFor=(html,url)=>html.match(new RegExp("<iframe\\b[^>]*src=\\\""+esc(url)+"\\\"[^>]*>\\s*</iframe>|<iframe\\b[^>]*src=\\\""+esc(url)+"\\\"[^>]*/>","g"))||[];
  const attr=(tag,n)=>{const m=tag.match(new RegExp(n+'="([^"]*)"'));return m?m[1]:"";};

  /* ---------- swap ---------- */
  async function swap(el,file){
    try{
      const src=relSrc(el); if(!src){say("skipped: not an assets/ path");return;}
      const oldE=ext(src), newE=ext(file.name);
      const toVid=VID_EXT.includes(newE), fromVid=VID_EXT.includes(oldE);
      let html=await readPage();

      if(newE===oldE){                                   /* plain overwrite */
        await writeAt(src,file); say("saved "+src);
      }else{
        const newPath=src.slice(0,-oldE.length)+newE;
        await writeAt(newPath,file);
        if(!fromVid && toVid){                           /* img -> video loop */
          const tags=imgTagsFor(html,src);
          if(!tags.length){say("couldn't find "+src+" in source, reload the page (Cmd+R) and retry");return;}
          for(const t of tags){
            const cls=attr(t,"class"), alt=attr(t,"alt");
            const v=`<video autoplay muted loop playsinline preload="metadata"${cls?` class="${cls}"`:""}${alt?` aria-label="${alt}"`:""}><source src="${newPath}" type="video/mp4"></video>`;
            html=html.replace(t,v);
          }
          say("saved "+newPath+" · "+tags.length+" slot(s) converted to video loop");
        }else if(fromVid && !toVid){                     /* video -> img */
          const blocks=videoBlocksFor(html,src);
          if(!blocks.length){say("couldn't find "+src+" in source, reload the page (Cmd+R) and retry");return;}
          for(const b of blocks){
            const cls=attr(b,"class"), alt=attr(b,"aria-label");
            html=html.replace(b,`<img src="${newPath}"${cls?` class="${cls}"`:""} alt="${alt}">`);
          }
          say("saved "+newPath+" · converted back to image");
        }else{                                           /* same kind, new ext */
          html=html.split('"'+src+'"').join('"'+newPath+'"');
          say("saved "+newPath+" · src updated");
        }
        await writePage(html);
        say("old "+src+" left in repo, clean up whenever");
      }
      /* live preview, rewired, no reload needed */
      const url=URL.createObjectURL(file);
      let fresh;
      if(toVid){fresh=document.createElement("video");fresh.autoplay=fresh.muted=fresh.loop=true;fresh.playsInline=true;fresh.className=el.className;
        const s=document.createElement("source");s.src=url;s.setAttribute("data-ng-src",newE===oldE?src:src.slice(0,-oldE.length)+newE);fresh.appendChild(s);}
      else{fresh=document.createElement("img");fresh.className=el.className;fresh.src=url;fresh.setAttribute("src-live",url);}
      /* keep repo path retrievable for future ops */
      const keep=newE===oldE?src:src.slice(0,-oldE.length)+newE;
      if(fresh.tagName==="IMG") fresh.setAttribute("src",keep), fresh.src=url;
      el.replaceWith(fresh); wireEl(fresh);
      if(fresh.tagName==="IMG") fresh.src=url;  /* show the local preview */
    }catch(err){ say("error: "+err.message); }
  }

  /* ---------- add after a frame ---------- */
  async function addAfter(frame,file){
    try{
      const media=frame.querySelector("img,video");
      const src=media?relSrc(media):null;
      if(!src){say("can't add here (no assets/ media in this frame)");return;}
      let html=await readPage();
      const idx=html.indexOf('"'+src+'"');
      if(idx<0){say("couldn't find "+src+" in source, reload and retry");return;}
      const close=html.indexOf("</div>",idx);
      if(close<0){say("couldn't locate the frame's end, use Claude Code for this one");return;}
      const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");
      const newPath=src.split("/").slice(0,-1).join("/")+"/"+clean;
      await writeAt(newPath,file);
      const isVid=VID_EXT.includes(ext(clean));
      const inner=isVid?`<video autoplay muted loop playsinline preload="metadata"><source src="${newPath}" type="video/mp4"></video>`:`<img src="${newPath}" alt="">`;
      const cls=frame.getAttribute("class")||"frame std";
      const insertAt=close+6;
      html=html.slice(0,insertAt)+`\n\n    <div class="${cls}">${inner}</div>`+html.slice(insertAt);
      await writePage(html);
      say("added "+newPath);
      const el=document.createElement("div"); el.className=cls; el.innerHTML=inner;
      frame.after(el); el.querySelectorAll("img,video").forEach(wireEl); wireFrame(el);
      const v=el.querySelector("video source"); if(v){v.parentElement.src=URL.createObjectURL(file);} 
      const i=el.querySelector("img"); if(i){i.src=URL.createObjectURL(file);}
    }catch(err){ say("error: "+err.message); }
  }

  /* ---------- replace an embed (vimeo/youtube iframe) with self-hosted media ---------- */
  async function swapEmbed(el,file){
    try{
      const url=el.getAttribute("src")||""; if(!url){say("embed has no src");return;}
      let html=await readPage();
      const tags=iframeTagsFor(html,url);
      if(!tags.length){say("couldn't find that embed in source, reload (Cmd+R) and retry");return;}
      const dir=assetDir(html);
      const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");
      const newPath=dir+clean;
      await writeAt(newPath,file);
      const isVid=VID_EXT.includes(ext(clean));
      for(const t of tags){
        const cls=attr(t,"class"), st=attr(t,"style");
        const rep=isVid
          ?`<video autoplay muted loop playsinline preload="metadata"${cls?` class="${cls}"`:""}${st?` style="${st}"`:` style="width:100%;height:100%;object-fit:cover;display:block"`}><source src="${newPath}" type="video/mp4"></video>`
          :`<img src="${newPath}"${cls?` class="${cls}"`:""}${st?` style="${st}"`:` style="width:100%;height:auto;display:block"`} alt="">`;
        html=html.replace(t,rep);
      }
      await writePage(html);
      say("saved "+newPath+" · embed replaced with self-hosted "+(isVid?"video loop":"image"));
      const u=URL.createObjectURL(file); let fresh;
      if(isVid){fresh=document.createElement("video");fresh.autoplay=fresh.muted=fresh.loop=true;fresh.playsInline=true;fresh.src=u;}
      else{fresh=document.createElement("img");fresh.src=u;}
      fresh.className=el.className; fresh.style.cssText=el.style.cssText||"width:100%;height:100%;object-fit:cover;display:block";
      el.replaceWith(fresh); wireEl(fresh);
    }catch(err){ say("error: "+err.message); }
  }

  /* ---------- wiring ---------- */
  function wireEl(el){
    if(el.dataset.ngW) return; el.dataset.ngW=1;
    const ok=()=>editing&&relSrc(el);
    el.addEventListener("dragover",e=>{if(!ok())return;e.preventDefault();e.stopPropagation();el.classList.add("ng-hover");});
    el.addEventListener("dragleave",()=>el.classList.remove("ng-hover"));
    el.addEventListener("drop",e=>{if(!ok())return;e.preventDefault();e.stopPropagation();el.classList.remove("ng-hover");const f=e.dataTransfer.files[0];if(f)swap(el,f);else say("that drag had no file in it, drag from Finder");});
    el.addEventListener("click",e=>{if(!ok())return;e.preventDefault();e.stopPropagation();
      const i=document.createElement("input");i.type="file";i.accept="image/*,video/mp4,video/quicktime";i.onchange=()=>i.files[0]&&swap(el,i.files[0]);i.click();});
    el.addEventListener("mouseenter",()=>{if(ok())el.classList.add("ng-hover");});
    el.addEventListener("mouseleave",()=>el.classList.remove("ng-hover"));
  }
  function wireFrame(f){
    if(f.dataset.ngA) return; f.dataset.ngA=1;
    f.addEventListener("mouseenter",()=>{if(!editing||f.querySelector(".ng-add"))return;
      const b=document.createElement("button");b.className="ng-add";b.textContent="＋ add after";
      if(getComputedStyle(f).position==="static") f.style.position="relative";
      b.onclick=e=>{e.stopPropagation();const i=document.createElement("input");i.type="file";i.accept="image/*,video/mp4";i.onchange=()=>i.files[0]&&addAfter(f,i.files[0]);i.click();};
      f.appendChild(b); f.addEventListener("mouseleave",()=>b.remove(),{once:true});});
  }
  function wireEmbed(el){
    if(el.dataset.ngW) return; el.dataset.ngW=1;
    el.style.pointerEvents="auto";
    const shield=document.createElement("div");
    /* transparent shield so drags reach us instead of the vimeo player */
    const place=()=>{const r=el.getBoundingClientRect();Object.assign(shield.style,{position:"fixed",left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px",zIndex:99989,display:editing?"block":"none"});};
    shield.title="Drop an MP4 or image to replace this embed";
    document.body.appendChild(shield);
    addEventListener("scroll",place,{passive:true}); addEventListener("resize",place); setInterval(place,800);
    shield.addEventListener("dragover",e=>{e.preventDefault();shield.style.outline="2px dashed #3D3BF3";shield.style.outlineOffset="-2px";});
    shield.addEventListener("dragleave",()=>shield.style.outline="");
    shield.addEventListener("drop",e=>{e.preventDefault();shield.style.outline="";const f=e.dataTransfer.files[0];if(f){swapEmbed(el,f);shield.remove();}});
    shield.addEventListener("click",()=>{const i=document.createElement("input");i.type="file";i.accept="image/*,video/mp4,video/quicktime";i.onchange=()=>{if(i.files[0]){swapEmbed(el,i.files[0]);shield.remove();}};i.click();});
  }
  const wireAll=()=>{document.querySelectorAll("img,video").forEach(wireEl);
    document.querySelectorAll("iframe").forEach(wireEmbed);
    document.querySelectorAll(".frame,.frame-pair > div,.frame-trio > div,section.bleed").forEach(wireFrame);};

  pill.onclick=async()=>{
    if(!editing){
      if(!root){root=await connect(); if(!root) return; say("connected to repo");}
      editing=true; pill.classList.add("on"); pill.textContent="✎ Editing · drop or click any visual"; wireAll();
    }else{editing=false; pill.classList.remove("on"); pill.textContent="✎ Edit visuals";}
  };
})();
