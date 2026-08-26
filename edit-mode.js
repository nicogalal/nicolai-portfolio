/* edit-mode.js v3.2 — mini-CMS for nicolaigalal.com. Localhost only.
   Tools: Swap · Crop · Add · Remove · Vimeo · Undo (Cmd/Ctrl+Z)
   Every mutation is undoable this session; originals backed up to .ng-backups/ */
(function(){
  if(!["localhost","127.0.0.1"].includes(location.hostname)) return;
  if(!window.showDirectoryPicker) return;

  const VID=["mp4","mov","webm"];
  const ext=p=>p.split(".").pop().toLowerCase().split("?")[0];
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const page=(location.pathname.split("/").pop()||"index.html");
  let root=null, mode=null, history=[];

  /* ---------------- UI ---------------- */
  const css=document.createElement("style");
  css.textContent=`
  #ng-bar{position:fixed;left:18px;bottom:18px;z-index:99990;display:flex;gap:6px;font:600 12.5px 'Instrument Sans',sans-serif}
  #ng-bar button{background:#0B0B0C;color:#fff;border:0;padding:10px 14px;cursor:pointer;letter-spacing:.03em}
  #ng-bar button.act{background:#3D3BF3}
  #ng-bar button:disabled{opacity:.4;cursor:default}
  .ng-hover{outline:2px dashed #3D3BF3 !important;outline-offset:-2px;cursor:copy}
  .ng-del{outline:2px solid #C0392B !important;outline-offset:-2px;cursor:not-allowed}
  #ng-log{position:fixed;right:18px;bottom:18px;z-index:99990;width:min(400px,90vw);max-height:36vh;overflow:auto;background:#0B0B0C;color:#EDEDEF;font:12px/1.7 'Instrument Sans',sans-serif;padding:12px 15px;display:none}
  #ng-log.show{display:block}#ng-log b{color:#8B8AFB}
  #ng-crop{position:fixed;inset:0;z-index:99995;background:rgba(11,11,12,.85);display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px}
  #ng-crop .stage{position:relative;background:#222;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  #ng-crop .stage img,#ng-crop .stage video{width:100%;height:100%;object-fit:cover;display:block}
  #ng-crop .dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#3D3BF3;border:2px solid #fff;transform:translate(-50%,-50%);cursor:grab}
  #ng-crop .row{display:flex;gap:8px}
  #ng-crop button{font:600 13px 'Instrument Sans',sans-serif;border:0;padding:11px 18px;cursor:pointer;background:#fff}
  #ng-crop button.primary{background:#3D3BF3;color:#fff}
  #ng-crop .hint{color:#bbb;font:12px 'Instrument Sans',sans-serif}`;
  document.head.appendChild(css);

  const bar=document.createElement("div"); bar.id="ng-bar";
  bar.innerHTML=`<button data-m="off">✎ Edit</button>
    <button data-m="swap" hidden>Swap</button><button data-m="crop" hidden>Crop</button>
    <button data-m="add" hidden>Add</button><button data-m="remove" hidden>Remove</button>
    <button data-m="vimeo" hidden>Vimeo</button><button id="ng-undo" hidden disabled>Undo ⌘Z</button>`;
  document.body.appendChild(bar);
  const log=document.createElement("div"); log.id="ng-log";
  log.innerHTML="<b>Changes</b><div id='ng-li'></div><div style='margin-top:8px;border-top:1px solid rgba(255,255,255,.25);padding-top:8px'>Push when done:<br>git add -A && git commit -m 'media' && git push origin main</div>";
  document.body.appendChild(log);
  const say=t=>{log.classList.add("show");const d=document.createElement("div");d.textContent="· "+t;document.getElementById("ng-li").appendChild(d);log.scrollTop=1e6;};
  addEventListener("dragover",e=>e.preventDefault()); addEventListener("drop",e=>e.preventDefault());

  /* ---------------- FS ---------------- */
  const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open("ng-edit",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
  const kv=async(k,v)=>{const db=await idb();return new Promise(res=>{const s=db.transaction("kv",v!==undefined?"readwrite":"readonly").objectStore("kv");const t=v!==undefined?s.put(v,k):s.get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>res(null);});};
  async function connect(){
    let h=await kv("root");
    if(h && await h.queryPermission({mode:"readwrite"})!=="granted" && await h.requestPermission({mode:"readwrite"})!=="granted") h=null;
    if(!h){h=await showDirectoryPicker({mode:"readwrite"});await kv("root",h);}
    try{await h.getFileHandle("index.html");}catch(e){alert("Pick the Portfolio folder itself.");return null;}
    return h;
  }
  async function dirOf(path,create){const p=path.split("/");let d=root;for(let i=0;i<p.length-1;i++)d=await d.getDirectoryHandle(p[i],{create});return [d,p.at(-1)];}
  async function readF(path){try{const [d,n]=await dirOf(path);return await (await d.getFileHandle(n)).getFile();}catch(e){return null;}}
  async function writeF(path,blob){const [d,n]=await dirOf(path,true);const fh=await d.getFileHandle(n,{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();}
  async function delF(path){try{const [d,n]=await dirOf(path);await d.removeEntry(n);}catch(e){}}
  const readPage=async()=>await (await (await root.getFileHandle(page)).getFile()).text();
  const writePage=async t=>writeF(page,new Blob([t],{type:"text/html"}));

  /* ---------------- history / undo ---------------- */
  async function snapshot(assetPaths){
    const entry={html:await readPage(),assets:[]};
    for(const p of assetPaths||[]){
      const f=await readF(p);
      if(f){ if(f.size<80*1024*1024){await writeF(".ng-backups/"+p,f); entry.assets.push({p,backup:true});}
             else entry.assets.push({p,backup:false,big:true}); }
      else entry.assets.push({p,created:true});
    }
    history.push(entry); document.getElementById("ng-undo").disabled=false;
  }
  async function undo(){
    const e=history.pop(); if(!e){say("nothing to undo");return;}
    await writePage(e.html);
    for(const a of e.assets){
      if(a.created) await delF(a.p);
      else if(a.backup){const b=await readF(".ng-backups/"+a.p); if(b) await writeF(a.p,b);}
      else if(a.big) say("note: "+a.p+" was too large to back up, restore it via git if needed");
    }
    document.getElementById("ng-undo").disabled=!history.length;
    say("undone, reloading"); setTimeout(()=>location.reload(),400);
  }
  addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"&&mode){e.preventDefault();undo();}});
  document.addEventListener("click",e=>{if(e.target.id==="ng-undo")undo();});

  /* ---------------- source helpers ---------------- */
  const relSrc=el=>{const d=el.dataset&&el.dataset.ngPath;if(d)return d;
    const a=el.tagName==="VIDEO"?(el.querySelector("source")?.getAttribute("src")||el.getAttribute("src")):el.getAttribute("src");return a&&a.startsWith("assets/")?a:null;};
  const anySrc=el=>el.tagName==="IFRAME"?(el.dataset&&el.dataset.ngPath)||el.getAttribute("src"):relSrc(el);
  const imgTags=(h,s)=>h.match(new RegExp("<img\\b[^>]*src=\""+esc(s)+"\"[^>]*/?>","g"))||[];
  const vidBlocks=(h,s)=>(h.match(/<video\b[\s\S]*?<\/video>/g)||[]).filter(b=>b.includes('"'+s+'"'));
  const ifrTags=(h,s)=>(h.match(/<iframe\b[^>]*>\s*<\/iframe>|<iframe\b[^>]*\/>/g)||[]).filter(t=>t.includes('"'+s+'"'));
  const tagFor=(h,el)=>{const s=anySrc(el);if(!s)return null;
    const list=el.tagName==="IMG"?imgTags(h,s):el.tagName==="VIDEO"?vidBlocks(h,s):ifrTags(h,s);
    return list.length?{tag:list[0],all:list,src:s}:null;};
  const attr=(t,n)=>{const m=t.match(new RegExp(n+'="([^"]*)"'));return m?m[1]:"";};
  const setAttr=(t,n,v)=>{const re=new RegExp('\\s*'+n+'="[^"]*"');
    if(re.test(t)) return t.replace(re, v?` ${n}="${v}"`:"");
    return v? t.replace(/^<(\w+)/,`<$1 ${n}="${v}"`) : t;};
  const assetDir=h=>{const m=h.match(/assets\/[a-z0-9-]+\//g);if(!m)return "assets/";
    const c={};m.forEach(x=>c[x]=(c[x]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];};
  function frameRange(h,src){const i=h.indexOf('"'+src+'"');if(i<0)return null;
    const start=h.lastIndexOf('<div class="frame',i); if(start<0)return null;
    const end=h.indexOf("</div>",i); if(end<0)return null;
    return {start,end:end+6};}

  /* ---------------- operations ---------------- */
  async function opSwap(el,file){
    try{
      const found=tagFor(await readPage(),el);
      const isIfr=el.tagName==="IFRAME";
      if(!found&&!isIfr){say("couldn't locate this slot in source, reload and retry");return;}
      let html=await readPage();
      const src=found?found.src:el.getAttribute("src");
      const oldE=isIfr?null:ext(src), newE=ext(file.name);
      const toVid=VID.includes(newE);
      let newPath;
      if(isIfr){ newPath=assetDir(html)+file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-"); }
      else newPath=(newE===oldE)?src:src.slice(0,-oldE.length)+newE;
      await snapshot([newPath]);
      html=await readPage();
      await writeF(newPath,file);
      if(!isIfr && newE===oldE){ say("saved "+newPath); }
      else{
        const targets=isIfr?ifrTags(html,src):(el.tagName==="IMG"?imgTags(html,src):vidBlocks(html,src));
        if(!targets.length){say("couldn't rewrite source, reload and retry");history.pop();return;}
        for(const t of targets){
          const cls=attr(t,"class"), st=attr(t,"style"), alt=attr(t,"alt")||attr(t,"aria-label");
          const rep=toVid
            ?`<video autoplay muted loop playsinline preload="metadata"${cls?` class="${cls}"`:""}${st?` style="${st}"`:""}${alt?` aria-label="${alt}"`:""}><source src="${newPath}" type="video/mp4"></video>`
            :`<img src="${newPath}"${cls?` class="${cls}"`:""}${st?` style="${st}"`:""} alt="${alt||""}">`;
          html=html.replace(t,rep);
        }
        await writePage(html); say("saved "+newPath+(isIfr?" · embed replaced":" · slot updated"));
      }
      liveReplace(el,file,toVid,newPath);
    }catch(err){say("error: "+err.message);}
  }
  function liveReplace(el,file,toVid,repoPath){
    const u=URL.createObjectURL(file); let n;
    if(toVid){n=document.createElement("video");n.autoplay=n.muted=n.loop=true;n.playsInline=true;n.src=u;}
    else{n=document.createElement("img");n.src=u;}
    if(repoPath)n.dataset.ngPath=repoPath;
    n.className=el.className; n.style.cssText=el.style.cssText;
    if(el.tagName==="IFRAME"&&!n.style.cssText)n.style.cssText="width:100%;height:100%;object-fit:cover;display:block";
    el.replaceWith(n); wireEl(n);
  }

  async function opVimeo(el){
    const url=prompt("Vimeo URL (or full embed src):"); if(!url)return;
    const id=(url.match(/vimeo\.com\/(?:video\/)?(\d+)/)||[])[1];
    const embed=id?`https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1`:url;
    try{
      let html=await readPage();
      const found=tagFor(html,el); if(!found){say("couldn't locate slot, reload and retry");return;}
      await snapshot([]); html=await readPage();
      const cls=attr(found.tag,"class"), st=attr(found.tag,"style");
      const rep=`<iframe src="${embed}"${cls?` class="${cls}"`:""} style="${st||"width:100%;height:100%;border:0"}" allow="autoplay; fullscreen" loading="lazy"></iframe>`;
      for(const t of found.all) html=html.replace(t,rep);
      await writePage(html); say("slot now uses Vimeo "+(id||url));
      const f=document.createElement("iframe"); f.src=embed; f.className=el.className;
      f.style.cssText=el.style.cssText||"width:100%;height:100%;border:0"; f.allow="autoplay; fullscreen";
      el.replaceWith(f); wireEl(f);
    }catch(err){say("error: "+err.message);}
  }

  async function opRemove(el){
    if(!confirm("Remove this visual (and its frame if it's alone in one)?"))return;
    try{
      let html=await readPage();
      const found=tagFor(html,el); if(!found){say("couldn't locate slot, reload and retry");return;}
      await snapshot([]); html=await readPage();
      const fr=el.tagName!=="IFRAME"&&found.src.startsWith("assets/")?frameRange(html,found.src):null;
      if(fr && /class="frame/.test(el.parentElement?.getAttribute("class")||"")){
        html=html.slice(0,fr.start)+html.slice(fr.end);
        el.parentElement.remove(); say("removed frame + visual");
      }else{ html=html.replace(found.tag,""); el.remove(); say("removed visual"); }
      await writePage(html);
    }catch(err){say("error: "+err.message);}
  }

  async function opAdd(frame,file){
    try{
      const media=frame.querySelector("img,video"); const src=media?relSrc(media):null;
      if(!src){say("add next to a frame that has local media");return;}
      let html=await readPage();
      const fr=frameRange(html,src); if(!fr){say("couldn't locate frame, reload and retry");return;}
      const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");
      const newPath=src.split("/").slice(0,-1).join("/")+"/"+clean;
      await snapshot([newPath]); html=await readPage();
      await writeF(newPath,file);
      const isVid=VID.includes(ext(clean));
      const inner=isVid?`<video autoplay muted loop playsinline preload="metadata"><source src="${newPath}" type="video/mp4"></video>`:`<img src="${newPath}" alt="">`;
      const cls=frame.getAttribute("class")||"frame std";
      html=html.slice(0,fr.end)+`\n\n    <div class="${cls}">${inner}</div>`+html.slice(fr.end);
      await writePage(html); say("added "+newPath);
      const el=document.createElement("div"); el.className=cls; el.innerHTML=inner; frame.after(el);
      el.querySelectorAll("img,video").forEach(x=>{x.dataset.ngPath=newPath;x.src=URL.createObjectURL(file);wireEl(x);});
    }catch(err){say("error: "+err.message);}
  }

  /* ---------------- crop: true region selection ---------------- */
  const cropUI=document.createElement("div"); cropUI.id="ng-crop";
  cropUI.innerHTML=`<div class="stage"></div>
    <div class="hint">Drag the box to choose what shows. Drag the corner to resize. The box keeps the frame's shape.</div>
    <div class="row"><button id="ng-crop-save" class="primary">Save crop</button>
    <button id="ng-crop-reset">Reset to full</button><button id="ng-crop-x">Cancel</button></div>`;
  document.body.appendChild(cropUI);
  const cropCss=document.createElement("style");
  cropCss.textContent=`#ng-crop .stage{position:relative;background:#111}
    #ng-crop .stage .media{display:block;opacity:.45}
    #ng-crop .box{position:absolute;border:2px solid #3D3BF3;box-shadow:0 0 0 9999px rgba(11,11,12,.55);cursor:move;overflow:hidden}
    #ng-crop .box .peek{position:absolute;pointer-events:none}
    #ng-crop .grab{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;background:#3D3BF3;border:2px solid #fff;border-radius:50%;cursor:nwse-resize}`;
  document.head.appendChild(cropCss);

  function mediaSize(el,cb){
    if(el.tagName==="IMG"){ if(el.naturalWidth)cb(el.naturalWidth,el.naturalHeight);
      else el.addEventListener("load",()=>cb(el.naturalWidth,el.naturalHeight),{once:true}); }
    else{ if(el.videoWidth)cb(el.videoWidth,el.videoHeight);
      else el.addEventListener("loadedmetadata",()=>cb(el.videoWidth,el.videoHeight),{once:true}); }
  }

  function opCrop(el){
    if(el.tagName==="IFRAME"){say("crop works on local images and videos, not embeds");return;}
    const frame=el.parentElement, fr=el.getBoundingClientRect();
    const aspect=fr.width/fr.height;
    mediaSize(el,(nw,nh)=>{
      const stage=cropUI.querySelector(".stage");
      const maxW=Math.min(760,innerWidth-80), maxH=Math.min(520,innerHeight-220);
      const s=Math.min(maxW/nw,maxH/nh);
      const dw=nw*s, dh=nh*s;
      stage.style.width=dw+"px"; stage.style.height=dh+"px"; stage.innerHTML="";
      const bg=el.cloneNode(true); bg.className="media"; bg.style.cssText="width:100%;height:100%;object-fit:fill";
      if(bg.tagName==="VIDEO"){bg.autoplay=bg.muted=bg.loop=true;bg.playsInline=true;}
      stage.appendChild(bg);
      /* crop box, aspect-locked to the frame */
      let cw=Math.min(dw,dh*aspect), ch=cw/aspect, cx=(dw-cw)/2, cy=(dh-ch)/2;
      /* seed from existing region style if present */
      const st=el.getAttribute("style")||"";
      const mW=st.match(/width:\s*([\d.]+)%/), mL=st.match(/left:\s*(-?[\d.]+)%/), mT=st.match(/top:\s*(-?[\d.]+)%/), mH=st.match(/height:\s*([\d.]+)%/);
      if(mW&&mL&&mT&&mH){const fw=100/parseFloat(mW[1]), fh=100/parseFloat(mH[1]);
        cw=fw*dw; ch=fh*dh; cx=(-parseFloat(mL[1])/100)*fw*dw; cy=(-parseFloat(mT[1])/100)*fh*dh;
        cx=Math.max(0,Math.min(dw-cw,cx)); cy=Math.max(0,Math.min(dh-ch,cy));}
      const box=document.createElement("div"); box.className="box";
      const peek=bg.cloneNode(true); peek.className="peek"; peek.style.opacity="1";
      if(peek.tagName==="VIDEO"){peek.autoplay=peek.muted=peek.loop=true;peek.playsInline=true;}
      box.appendChild(peek);
      const grab=document.createElement("div"); grab.className="grab"; box.appendChild(grab);
      stage.appendChild(box);
      const draw=()=>{Object.assign(box.style,{left:cx+"px",top:cy+"px",width:cw+"px",height:ch+"px"});
        Object.assign(peek.style,{width:dw+"px",height:dh+"px",left:(-cx)+"px",top:(-cy)+"px"});};
      draw(); cropUI.style.display="flex";
      let act=null,ox,oy,ocx,ocy,ocw;
      const down=(e,kind)=>{act=kind;ox=e.clientX;oy=e.clientY;ocx=cx;ocy=cy;ocw=cw;e.preventDefault();e.stopPropagation();};
      box.addEventListener("pointerdown",e=>{if(e.target===grab)return;down(e,"move");box.setPointerCapture(e.pointerId);});
      grab.addEventListener("pointerdown",e=>{down(e,"size");grab.setPointerCapture(e.pointerId);});
      addEventListener("pointermove",e=>{
        if(!act)return;
        if(act==="move"){cx=Math.max(0,Math.min(dw-cw,ocx+e.clientX-ox));cy=Math.max(0,Math.min(dh-ch,ocy+e.clientY-oy));}
        else{cw=Math.max(60,Math.min(Math.min(dw-cx,(dh-cy)*aspect),ocw+e.clientX-ox));ch=cw/aspect;}
        draw();});
      addEventListener("pointerup",()=>act=null);
      cropUI.querySelector("#ng-crop-x").onclick=()=>cropUI.style.display="none";
      cropUI.querySelector("#ng-crop-reset").onclick=()=>persist(null);
      cropUI.querySelector("#ng-crop-save").onclick=()=>{
        const fx=cx/dw, fy=cy/dh, fw=cw/dw, fh=ch/dh;
        persist(`position:absolute;left:${(-fx/fw*100).toFixed(2)}%;top:${(-fy/fh*100).toFixed(2)}%;width:${(100/fw).toFixed(2)}%;height:${(100/fh).toFixed(2)}%;max-width:none;object-fit:fill`);
      };
      async function persist(regionStyle){
        cropUI.style.display="none";
        try{
          let html=await readPage(); const found=tagFor(html,el);
          if(!found){say("couldn't locate slot, reload and retry");return;}
          await snapshot([]); html=await readPage();
          const isVid=el.tagName==="VIDEO";
          const target=isVid?found.tag.match(/<video\b[^>]*>/)[0]:found.tag;
          let stOld=attr(target,"style")
            .replace(/position:[^;]+;?|left:[^;]+;?|top:[^;]+;?|width:[^;]+;?|height:[^;]+;?|max-width:[^;]+;?|object-fit:[^;]+;?|object-position:[^;]+;?/g,"")
            .replace(/^;+|;+$/g,"").trim();
          const stNew=regionStyle?(stOld?stOld+";":"")+regionStyle:stOld;
          let newTag=setAttr(target,"style",stNew);
          html=html.split(target).join(newTag);
          /* ensure the frame clips and positions */
          if(regionStyle&&frame&&found.src.startsWith("assets/")){
            const rng=frameRange(html,found.src);
            if(rng){const open=html.slice(rng.start,html.indexOf(">",rng.start)+1);
              let fst=attr(open,"style").replace(/position:[^;]+;?|overflow:[^;]+;?/g,"").replace(/^;+|;+$/g,"").trim();
              fst=(fst?fst+";":"")+"position:relative;overflow:hidden";
              const openNew=setAttr(open,"style",fst);
              html=html.replace(open,openNew);
              frame.style.position="relative";frame.style.overflow="hidden";}
          }
          await writePage(html);
          el.setAttribute("style",stNew);
          say(regionStyle?"crop saved":"crop reset to full");
        }catch(err){say("error: "+err.message);}
      }
    });
  }

  /* ---------------- wiring & modes ---------------- */
  function wireEl(el){
    if(el.dataset.ngW)return; el.dataset.ngW=1;
    const isMedia=()=>anySrc(el);
    el.addEventListener("dragover",e=>{if(mode!=="swap"||!isMedia())return;e.preventDefault();e.stopPropagation();el.classList.add("ng-hover");});
    el.addEventListener("dragleave",()=>el.classList.remove("ng-hover"));
    el.addEventListener("drop",e=>{if(mode!=="swap"||!isMedia())return;e.preventDefault();e.stopPropagation();el.classList.remove("ng-hover");const f=e.dataTransfer.files[0];f?opSwap(el,f):say("drag from Finder");});
    el.addEventListener("click",e=>{
      if(!mode||!isMedia())return;
      if(["swap","crop","remove","vimeo"].includes(mode)){e.preventDefault();e.stopPropagation();}
      if(mode==="swap"){const i=document.createElement("input");i.type="file";i.accept="image/*,video/mp4,video/quicktime";i.onchange=()=>i.files[0]&&opSwap(el,i.files[0]);i.click();}
      if(mode==="crop") opCrop(el);
      if(mode==="remove") opRemove(el);
      if(mode==="vimeo") opVimeo(el);
    });
    el.addEventListener("mouseenter",()=>{if(!mode||!isMedia())return;el.classList.add(mode==="remove"?"ng-del":"ng-hover");});
    el.addEventListener("mouseleave",()=>el.classList.remove("ng-hover","ng-del"));
  }
  function wireFrame(f){
    if(f.dataset.ngA)return; f.dataset.ngA=1;
    f.addEventListener("click",e=>{
      if(mode!=="add")return;
      e.preventDefault();e.stopPropagation();
      const i=document.createElement("input");i.type="file";i.accept="image/*,video/mp4";
      i.onchange=()=>i.files[0]&&opAdd(f,i.files[0]);i.click();});
    f.addEventListener("dragover",e=>{if(mode!=="add")return;e.preventDefault();f.classList.add("ng-hover");});
    f.addEventListener("dragleave",()=>f.classList.remove("ng-hover"));
    f.addEventListener("drop",e=>{if(mode!=="add")return;e.preventDefault();f.classList.remove("ng-hover");e.dataTransfer.files[0]&&opAdd(f,e.dataTransfer.files[0]);});
  }
  const wireAll=()=>{document.querySelectorAll("img,video,iframe").forEach(wireEl);
    document.querySelectorAll(".frame,.frame-pair > div,.frame-trio > div").forEach(wireFrame);};

  bar.addEventListener("click",async e=>{
    const m=e.target.dataset?.m; if(!m)return;
    if(m==="off"&&!mode){ if(!root){root=await connect();if(!root)return;say("connected");}
      mode="swap"; bar.querySelectorAll("button").forEach(b=>b.hidden=false);
      e.target.textContent="✕ Done"; wireAll(); setMode("swap"); return; }
    if(m==="off"&&mode){ mode=null; bar.querySelectorAll("button[data-m]:not([data-m=off]),#ng-undo").forEach(b=>b.hidden=true);
      e.target.textContent="✎ Edit"; bar.querySelectorAll("button").forEach(b=>b.classList.remove("act")); return; }
    setMode(m);
  });
  function setMode(m){mode=m;bar.querySelectorAll("button[data-m]").forEach(b=>b.classList.toggle("act",b.dataset.m===m));
    say("mode: "+m+(m==="add"?" · click or drop on a frame to add after it":m==="swap"?" · click or drop on any visual":m==="crop"?" · click a visual to set its crop":m==="remove"?" · click a visual to delete it":m==="vimeo"?" · click a slot to point it at a Vimeo URL":""));}
})();
