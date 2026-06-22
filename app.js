/* NEXT_STEP demo — flow + Supabase data */
(function () {
  "use strict";
  const { SUPABASE_URL, SUPABASE_KEY } = window.NEXTSTEP_CONFIG;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ---- state ----
  const TRACK_LABEL = {
    accepts_sci_math: "วิทย์–คณิต",
    accepts_arts: "ศิลป์",
    accepts_vocational: "เทคนิค / อาชีวะ (ปวช.)",
  };
  const state = {
    paths: loadPaths(),
    currentPath: null,
    track: null,
    faculty: null, // {id, name}
    program: null,
    sort: "tuition-asc",
    programs: [],
  };

  const VIEWS = ["create-path","name-path","track","faculty","programs","cooking","roadmap"];
  const CRUMB = {"create-path":"path","name-path":"ตั้งชื่อ","track":"สาย","faculty":"คณะ","programs":"หลักสูตร","roadmap":"roadmap"};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; };

  function show(view){
    VIEWS.forEach(v => { const s=$(`[data-view="${v}"]`); if(s) s.hidden = v!==view; });
    renderCrumbs(view);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderCrumbs(view){
    const order=["create-path","track","faculty","programs","roadmap"];
    const idx=order.indexOf(view==="name-path"?"create-path":(view==="cooking"?"programs":view));
    $("#crumbs").innerHTML = order.map((v,i)=>`<span class="c ${i<=idx?"on":""}">${CRUMB[v]}</span>`).join('<span class="c">/</span>');
  }
  function toast(msg){
    const t=$("#toast"); t.textContent=msg; t.hidden=false;
    clearTimeout(t._t); t._t=setTimeout(()=>t.hidden=true,2600);
  }
  function loading(container, msg){ container.innerHTML=`<div class="state"><div class="spinner"></div>${msg||"กำลังโหลด…"}</div>`; }
  function errBox(container, msg){ container.innerHTML=`<div class="state">⚠️ ${msg}</div>`; }

  // ---- persistence (local only) ----
  function loadPaths(){ try{ return JSON.parse(localStorage.getItem("nextstep_paths")||"[]"); }catch(e){ return []; } }
  function savePaths(){ try{ localStorage.setItem("nextstep_paths", JSON.stringify(state.paths)); }catch(e){} }

  // ================= 1. CREATE PATH =================
  function renderPaths(){
    const list=$("#pathList"); list.innerHTML="";
    if(!state.paths.length){
      state.paths.push({id:Date.now(), name:"path01"});
      savePaths();
    }
    state.paths.forEach((p,i)=>{
      const card=el("div","path-card"+(i===0?" is-first":""));
      const name=el("input","pc-name"); name.value=p.name; name.maxLength=40;
      name.addEventListener("click",e=>e.stopPropagation());
      name.addEventListener("change",()=>{ p.name=name.value.trim()||p.name; savePaths(); });
      const go=el("span","pc-go","เปิด →");
      card.append(name,go);
      card.addEventListener("click",()=>{ state.currentPath=p; state.track=null; state.faculty=null; show("track"); });
      list.append(card);
    });
  }

  // ================= 3. TRACK =================
  async function chooseTrack(col,label){
    state.track={col,label};
    state.currentPath && (state.currentPath.track=label);
    savePaths();
    show("faculty");
    await loadFaculties();
  }

  // ================= 4a. FACULTIES =================
  async function loadFaculties(){
    const grid=$("#facultyGrid");
    $("#facultySub").textContent = `คณะที่มีหลักสูตรรับสาย “${state.track.label}”`;
    loading(grid,"กำลังหาคณะที่รับสายของคุณ…");
    const { data, error } = await db
      .from("programs")
      .select("faculty_id, faculties(name_th)")
      .eq(state.track.col, true)
      .limit(2000);
    if(error){ errBox(grid, error.message); return; }
    const map=new Map();
    (data||[]).forEach(r=>{
      const id=r.faculty_id, name=r.faculties?.name_th||`คณะ #${id}`;
      if(!map.has(id)) map.set(id,{id,name,count:0});
      map.get(id).count++;
    });
    const faculties=[...map.values()].sort((a,b)=>b.count-a.count);
    grid.innerHTML="";
    if(!faculties.length){ errBox(grid,"ไม่พบคณะสำหรับสายนี้"); return; }
    faculties.forEach(f=>{
      const card=el("div","fac-card");
      card.append(el("div","fc-name",f.name), el("div","fc-count",`${f.count} หลักสูตร`));
      card.addEventListener("click",()=>{ state.faculty=f; openPrograms(); });
      grid.append(card);
    });
  }

  // ================= 4b. PROGRAMS =================
  async function openPrograms(){
    show("programs");
    $("#programHead").textContent=`“${state.faculty.name}”`;
    const list=$("#programList");
    loading(list,"กำลังโหลดหลักสูตร…");
    const { data, error } = await db
      .from("programs")
      .select("id, major_name, tuition_fee, universities(name_th, campus_name, region, logo_url)")
      .eq(state.track.col, true)
      .eq("faculty_id", state.faculty.id)
      .limit(400);
    if(error){ errBox(list, error.message); return; }
    state.programs=(data||[]).map(p=>({
      id:p.id, major:p.major_name||"(ไม่ระบุชื่อสาขา)",
      fee:p.tuition_fee, uni:p.universities?.name_th||"—",
      campus:p.universities?.campus_name||"", region:p.universities?.region||"",
      logo:p.universities?.logo_url||""
    }));
    renderPrograms();
  }
  function renderPrograms(){
    const list=$("#programList");
    let rows=[...state.programs];
    const s=state.sort;
    rows.sort((a,b)=>{
      if(s==="tuition-asc") return fee(a)-fee(b);
      if(s==="tuition-desc") return fee(b)-fee(a);
      if(s==="name") return a.uni.localeCompare(b.uni,"th");
      if(s==="region") return (a.region||"zz").localeCompare(b.region||"zz","th")|| a.uni.localeCompare(b.uni,"th");
      return 0;
    });
    function fee(x){ return x.fee==null ? (s==="tuition-asc"?Infinity:-1) : x.fee; }
    if(!rows.length){ errBox(list,"ยังไม่มีหลักสูตรในคณะนี้สำหรับสายที่เลือก"); return; }
    list.innerHTML="";
    rows.forEach(p=>{
      const card=el("div","prog-card");
      const logo=el("img","prog-logo"); logo.src=p.logo; logo.alt=""; logo.loading="lazy";
      logo.onerror=()=>{ logo.style.visibility="hidden"; };
      const main=el("div","prog-main");
      main.append(el("div","prog-major",escapeHtml(p.major)),
                  el("div","prog-meta",escapeHtml([p.uni,p.campus,p.region].filter(Boolean).join(" · "))));
      const fee=el("div","prog-fee"+(p.fee==null?" none":""));
      fee.innerHTML = p.fee==null ? "ไม่ระบุ" : `${p.fee.toLocaleString("th-TH")}<span class="unit">บาท/เทอม</span>`;
      card.append(logo,main,fee);
      card.addEventListener("click",()=>cook(p));
      list.append(card);
    });
  }

  // ================= 5+6. COOK -> ROADMAP =================
  async function cook(program){
    state.program=program;
    show("cooking");
    const [roadmap] = await Promise.all([
      db.from("program_roadmaps").select("step_number,title,description,target_period").eq("program_id",program.id).order("step_number"),
      sleep(1500),
    ]);
    const rounds = await db.from("program_admission_rounds").select("round_number,round_label,project_name").eq("program_id",program.id);
    renderRoadmap(program, roadmap.data||[], rounds.data||[]);
    show("roadmap");
  }

  function renderRoadmap(program, steps, roundRows){
    $("#roadmapPathName").textContent = (state.currentPath?.name || "PATH").toUpperCase();
    $("#roadmapHead").textContent = "เส้นทางสู่ "+program.uni;
    $("#roadmapSub").textContent = `${program.major} · สาย ${state.track.label}`;

    // rounds grouped 1..4
    const byRound=new Map();
    roundRows.forEach(r=>{
      const n=r.round_number||0;
      if(!byRound.has(n)) byRound.set(n,{label:r.round_label||`รอบ ${n}`, projects:new Set()});
      if(r.project_name) byRound.get(n).projects.add(r.project_name.trim());
    });
    const roundsEl=$("#rounds"); roundsEl.innerHTML="";
    const order=[1,2,3,4].filter(n=>byRound.has(n));
    if(!order.length){ roundsEl.innerHTML=`<div class="round empty"><h3>ยังไม่มีข้อมูลรอบรับสมัคร</h3></div>`; }
    order.forEach(n=>{
      const r=byRound.get(n);
      const box=el("div","round");
      box.append(el("h3",null,escapeHtml(r.label)));
      const projects=[...r.projects].slice(0,4);
      if(projects.length){
        const ul=el("ul");
        projects.forEach(p=>ul.append(el("li",null,escapeHtml(p))));
        if(r.projects.size>4) ul.append(el("li",null,`และอีก ${r.projects.size-4} โครงการ`));
        box.append(ul);
      }
      roundsEl.append(box);
    });

    // timeline
    const tl=$("#timeline"); tl.innerHTML="";
    if(!steps.length){ tl.innerHTML=`<li><div class="tl-title">ยังไม่มีข้อมูลแผนเตรียมตัวสำหรับหลักสูตรนี้</div></li>`; }
    steps.forEach(s=>{
      const li=el("li");
      if(s.target_period) li.append(el("div","tl-period",escapeHtml(s.target_period)));
      li.append(el("div","tl-title",escapeHtml(s.title||"")));
      if(s.description) li.append(el("div","tl-desc",escapeHtml(s.description)));
      tl.append(li);
    });
  }

  // ---- helpers ----
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  // ---- wire up ----
  function init(){
    renderPaths();
    show("create-path");

    $("#addPathBtn").addEventListener("click",()=>{ $("#pathNameInput").value=""; show("name-path"); setTimeout(()=>$("#pathNameInput").focus(),50); });
    $("#savePathBtn").addEventListener("click",saveNewPath);
    $("#pathNameInput").addEventListener("keydown",e=>{ if(e.key==="Enter") saveNewPath(); });

    $$(".track-opt").forEach(b=>b.addEventListener("click",()=>{
      $$(".track-opt").forEach(x=>x.classList.remove("sel")); b.classList.add("sel");
      chooseTrack(b.dataset.track, b.dataset.label);
    }));

    $("#funnelBtn").addEventListener("click",()=>{
      const bar=$("#filterBar"); bar.hidden=!bar.hidden; $("#funnelBtn").classList.toggle("on",!bar.hidden);
    });
    $$("#filterBar .chip").forEach(c=>c.addEventListener("click",()=>{
      $$("#filterBar .chip").forEach(x=>x.classList.remove("active")); c.classList.add("active");
      state.sort=c.dataset.sort; renderPrograms();
    }));

    $$("[data-back]").forEach(b=>b.addEventListener("click",()=>{
      const t=b.dataset.back;
      if(t==="faculty") show("faculty");
      else if(t==="track") show("track");
      else if(t==="programs") show("programs");
      else { renderPaths(); show("create-path"); }
    }));

    $("#restartBtn").addEventListener("click",()=>{ renderPaths(); show("create-path"); });
  }
  function saveNewPath(){
    const v=$("#pathNameInput").value.trim();
    if(!v){ toast("ใส่ชื่อ path ก่อนนะ"); return; }
    const p={id:Date.now(), name:v};
    state.paths.push(p); savePaths();
    state.currentPath=p; state.track=null; state.faculty=null;
    toast("สร้าง path สำเร็จ");
    show("track");
  }

  init();
})();
