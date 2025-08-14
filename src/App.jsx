import { useEffect, useMemo, useState } from "react";
import { Clipboard, ExternalLink, Search, RefreshCcw, Check, ChevronDown, ChevronRight } from "lucide-react";

export default function App(){
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("pv551_tab") || "");
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem("pv551_section") || "");
  const [category, setCategory] = useState(() => localStorage.getItem("pv551_cat") || "");
  const [q, setQ] = useState("");
  const [count, setCount] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(()=>localStorage.setItem("pv551_tab", activeTab),[activeTab]);
  useEffect(()=>localStorage.setItem("pv551_section", activeSection),[activeSection]);
  useEffect(()=>localStorage.setItem("pv551_cat", category),[category]);

  async function loadJson(){
    try{
      const res = await fetch("/prompts.json", { cache:"no-store" });
      const json = await res.json();
      setData(json);
      setCount(json.length);
      if(!activeTab && json.length){
        const t = json[0]?.faner?.[0] || json[0]?.fane || "";
        setActiveTab(t);
      }
    }catch(e){ console.error(e); alert("Kunne ikke læse prompts.json"); }
  }
  useEffect(()=>{ loadJson(); },[]);

  const tabs = useMemo(()=>{
    const set = new Set();
    for(const r of data){
      if(Array.isArray(r.faner)) r.faner.forEach(t=>set.add(t));
      else if(r.fane) set.add(r.fane);
    }
    return Array.from(set).sort();
  }, [data]);

  const tree = useMemo(()=>{
    const map = new Map(); // section => Map(category => count)
    for(const r of data){
      const inTab = Array.isArray(r.faner) ? r.faner.includes(activeTab) : r.fane===activeTab;
      if(!inTab) continue;
      let sec = r.section || "";
      let cat = r.kategori || "";
      if(r.placements && r.placements.length){
        const p = r.placements.find(p=>p.fane===activeTab) || r.placements[0];
        if(p){ sec = p.section || sec; cat = p.kategori || cat; }
      }
      const secKey = sec || "(Uden underkapitel)";
      const catKey = cat || "(Uden kategori)";
      if(!map.has(secKey)) map.set(secKey, new Map());
      const catMap = map.get(secKey);
      catMap.set(catKey, (catMap.get(catKey)||0) + 1);
    }
    const out = [];
    for(const [sec, catMap] of map.entries()){
      out.push([sec, Array.from(catMap.entries()).sort((a,b)=> a[0].localeCompare(b[0]))]);
    }
    out.sort((a,b)=> a[0].localeCompare(b[0]));
    return out;
  }, [data, activeTab]);

  const visiblePrompts = useMemo(()=>{
    const res = [];
    for(const r of data){
      const inTab = Array.isArray(r.faner) ? r.faner.includes(activeTab) : r.fane===activeTab;
      if(!inTab) continue;
      let sec = r.section || "";
      let cat = r.kategori || "";
      if(r.placements && r.placements.length){
        const p = r.placements.find(p=>p.fane===activeTab) || r.placements[0];
        if(p){ sec = p.section || sec; cat = p.kategori || cat; }
      }
      if(activeSection && (sec || "(Uden underkapitel)") !== activeSection) continue;
      if(category && (cat || "(Uden kategori)") !== category) continue;
      const txt = r.prompt || "";
      if(q && !txt.toLowerCase().includes(q.toLowerCase())) continue;
      res.push({ prompt: txt, section: sec, kategori: cat });
    }
    return res;
  }, [data, activeTab, activeSection, category, q]);

  function copyPrompt(p, idx){
    navigator.clipboard?.writeText(p).then(()=>{
      setCopiedIdx(idx);
      setTimeout(()=> setCopiedIdx(null), 1200);
    }).catch(()=>{});
  }
  function openChatGPT(){ window.open("https://chat.openai.com/", "_blank"); }

  const [openSections, setOpenSections] = useState({});
  function toggleSection(sec){
    setOpenSections(s => ({...s, [sec]: !s[sec]}));
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto p-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Prompt Vault v5.5.1</h1>
            <p className="text-xs text-slate-500">{count.toLocaleString()} unikke prompts (sektioner + dublet-rens)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openChatGPT} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white"><ExternalLink className="w-4 h-4"/>Åbn ChatGPT</button>
            <button onClick={loadJson} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100"><RefreshCcw className="w-4 h-4"/>Genindlæs</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 pb-2 flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={()=>{setActiveTab(t); setActiveSection(""); setCategory("");}} className={"px-3 py-1.5 rounded-full border " + (activeTab===t ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300")}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <aside className="sm:col-span-5 lg:col-span-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Søg i prompts…" className="w-full pl-9 rounded-xl border border-slate-300 px-3 py-2"/>
            </div>
            <div className="max-h-[65vh] overflow-auto pr-1">
              <button onClick={()=>{setActiveSection(""); setCategory("");}} className={"w-full text-left px-3 py-2 rounded-lg mb-1 " + (activeSection==="" ? "bg-slate-900 text-white" : "hover:bg-white border border-slate-200")}>
                Alle underkapitler
              </button>
              {tree.map(([sec, cats]) => (
                <div key={sec} className="mb-1">
                  <button onClick={()=>toggleSection(sec)} className={"w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between " + (activeSection===sec ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-100")}>
                    <span className="truncate">{sec}</span>
                    {openSections[sec] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                  </button>
                  {openSections[sec] and (
                    <div className="pl-3 mt-1">
                      {cats.map(([cat, n]) => (
                        <button key={cat} onClick={()=>{setActiveSection(sec); setCategory(cat);}} className={"w-full text-left px-3 py-1.5 rounded-lg mb-1 border " + (category===cat && activeSection===sec ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-100")}>
                          <span className="truncate inline-block max-w-[80%]">{cat}</span>
                          <span className="float-right text-xs opacity-70">{n}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="sm:col-span-7 lg:col-span-8">
          {!!activeSection && <h2 className="text-lg font-semibold mb-1">{activeSection}</h2>}
          {!!category && <h3 className="text-base font-medium mb-3 text-slate-700">{category}</h3>}
          <ul className="space-y-3">
            {visiblePrompts.map((p, idx) => (
              <li key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <pre className="whitespace-pre-wrap text-[15px] leading-relaxed">{p.prompt}</pre>
                <div className="mt-2">
                  <button onClick={()=>copyPrompt(p.prompt, idx)} className={"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border " + (copiedIdx===idx? "bg-green-600 border-green-600 text-white" : "border-slate-300 bg-white")}>
                    {copiedIdx===idx ? <Check className="w-4 h-4"/> : <Clipboard className="w-4 h-4"/>}
                    {copiedIdx===idx ? "Kopieret!" : "Kopiér"}
                  </button>
                </div>
              </li>
            ))}
            {visiblePrompts.length===0 && <li className="text-slate-500">Ingen prompts matcher.</li>}
          </ul>
        </main>
      </div>
    </div>
  );
}
