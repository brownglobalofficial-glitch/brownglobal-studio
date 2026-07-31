import { useMemo, useState } from "react";

const sections = ["Overview", "Work", "Brand", "Content", "Products", "Team"] as const;
type Section = (typeof sections)[number];

const sectionData: Record<Exclude<Section, "Overview">, { title: string; copy: string; cards: string[] }> = {
  Work: { title: "Keep every project moving.", copy: "Track the work, the owner and the next decision without losing the context.", cards: ["GSN Clubs rollout", "August publishing plan", "Sponsor proposal"] },
  Brand: { title: "One approved brand library.", copy: "Keep logos, colors, templates and guidance ready for every person who creates.", cards: ["Master identity", "Social templates", "Partner lockups"] },
  Content: { title: "Plan before you publish.", copy: "Coordinate the message, channel, deadline and approval in one calm calendar.", cards: ["Matchday carousel", "Player Network story", "Wave weekly lineup"] },
  Products: { title: "Your BrownGlobal toolkit.", copy: "Move between Studio and each connected product while your organization stays consistent.", cards: ["Flow Â· customers", "Reach Â· campaigns", "Wave Â· streaming"] },
  Team: { title: "Right people. Right access.", copy: "Invite collaborators and choose what each person can view, edit or approve.", cards: ["Owner", "Workspace manager", "Contributor"] },
};

const tasks = ["Add your business details", "Upload approved brand assets", "Invite a team member", "Connect a BrownGlobal product"];

export default function App() {
  const [section, setSection] = useState<Section>("Overview");
  const [done, setDone] = useState<number[]>([0]);
  const progress = useMemo(() => Math.round((done.length / tasks.length) * 100), [done]);

  return <main>
    <header className="topbar">
      <a className="wordmark" href="#top"><img src="/brownglobal-icon.png" alt=""/><span>BrownGlobal <b>Studio</b></span></a>
      <nav><a href="#product">Product</a><a href="#business">Business</a><a href="#access">Access</a></nav>
      <a className="button dark small" href="mailto:admin@brownglobal.app?subject=BrownGlobal%20Studio%20early%20access">Request access <span>â†—</span></a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><span className="eyebrow"><i/>Your business, brought together</span><h1>One calm place to <em>run the work.</em></h1><p>Organize projects, content, brand assets and your teamâ€”then move into Flow, Reach and Wave without losing the thread.</p><div className="actions"><a className="button primary" href="#product">See the workspace <span>â†“</span></a><a className="text-link" href="#business">Explore BrownGlobal Business â†’</a></div><div className="audience"><span>Built for</span><b>businesses</b><b>clubs</b><b>media teams</b></div></div>
      <div className="orbit" aria-hidden="true"><div className="ring one"/><div className="ring two"/><div className="core"><img src="/brownglobal-icon.png" alt=""/><small>STUDIO</small></div><span className="chip plan">Plan</span><span className="chip create">Create</span><span className="chip grow">Grow</span></div>
    </section>

    <section className="product" id="product">
      <div className="section-title"><span className="eyebrow light"><i/>Interactive product preview</span><h2>Clear enough for Monday morning.</h2><p>Select a section and see how Studio holds the business together.</p></div>
      <div className="workspace">
        <aside><div className="mini-brand"><img src="/brownglobal-icon.png" alt=""/><b>Studio</b></div><div className="org"><span>OG</span><div><b>Old Gold SC</b><small>Business workspace</small></div></div><small className="label">Workspace</small>{sections.map(item => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}><span>{item[0]}</span>{item}</button>)}<div className="upgrade"><small>BROWNGLOBAL BUSINESS</small><b>Bring every tool together.</b><a href="#business">Learn more â†’</a></div></aside>
        <div className="dashboard"><div className="dash-head"><div><small>STUDIO / {section.toUpperCase()}</small><h3>{section === "Overview" ? "Good morning, Austin." : section}</h3></div><span className="avatar">AB</span></div>
          {section === "Overview" ? <div className="grid">
            <article className="panel setup"><div className="panel-head"><div><small>GET STARTED</small><h4>Build your workspace</h4></div><b>{progress}%</b></div><div className="progress"><i style={{width: `${progress}%`}}/></div>{tasks.map((task, index) => <button className="task" key={task} onClick={() => setDone(current => current.includes(index) ? current.filter(id => id !== index) : [...current, index])}><span className={done.includes(index) ? "check checked" : "check"}>{done.includes(index) ? "âœ“" : ""}</span><span><b>{task}</b><small>{done.includes(index) ? "Completed" : "Ready"}</small></span><em>â†’</em></button>)}</article>
            <article className="panel today"><div className="panel-head"><div><small>TODAY</small><h4>Tuesday, 31 July</h4></div><b>+</b></div><div className="meeting"><time>10:00</time><span><b>Review training photos</b><small>Content Â· GSN Clubs</small></span></div><div className="meeting"><time>14:30</time><span><b>Sponsor check-in</b><small>Reach Â· Campaign</small></span></div><p>Open afternoon <b>3h 30m</b></p></article>
            <article className="panel connected"><div className="panel-head"><div><small>YOUR PRODUCTS</small><h4>Connected to Studio</h4></div></div>{[["F","Flow","Customers & service"],["R","Reach","Campaigns & sponsorships"],["W","Wave","Live & on demand"]].map(product => <div className="product-row" key={product[1]}><span>{product[0]}</span><div><b>{product[1]}</b><small>{product[2]}</small></div><em>Open â†—</em></div>)}</article>
            <article className="panel pulse"><div className="panel-head"><div><small>THIS WEEK</small><h4>Business pulse</h4></div><b>â†‘ 18%</b></div><strong>12</strong><p>tasks completed</p><div className="bars">{[35,55,42,72,90,64,28].map((height,i) => <i key={i} style={{height: `${height}%`}}/>)}</div></article>
          </div> : <SectionView section={section}/>} 
        </div>
      </div>
    </section>

    <section className="business" id="business"><div><span className="eyebrow"><i/>BrownGlobal Business</span><h2>Studio is the home.<br/>The products stay powerful.</h2><p>Use each platform separately or bring eligible BrownGlobal tools together under one organization, one account and one business membership.</p></div><div className="system"><div className="system-center"><img src="/brownglobal-icon.png" alt=""/><b>Studio</b><small>ORGANIZE</small></div>{[["Flow","SERVE"],["Reach","GROW"],["Wave","STREAM"]].map((item,i)=><div className={`satellite s${i}`} key={item[0]}><span>{item[0][0]}</span><b>{item[0]}</b><small>{item[1]}</small></div>)}</div></section>
    <section className="access" id="access"><span className="eyebrow light"><i/>Early access</span><h2>Build the system before the noise.</h2><p>Studio is being prepared as the operating home for BrownGlobal businesses, partners and approved teams.</p><a className="button primary" href="mailto:admin@brownglobal.app?subject=BrownGlobal%20Studio%20early%20access">Request early access <span>â†’</span></a></section>
    <footer><a className="wordmark" href="#top"><img src="/brownglobal-icon.png" alt=""/><span>BrownGlobal <b>Studio</b></span></a><p>Organize the business. Keep the work moving.</p><div><a href="mailto:admin@brownglobal.app">admin@brownglobal.app</a><span>Â© 2026 BrownGlobal Holdings LLC</span></div></footer>
  </main>;
}

function SectionView({ section }: { section: Exclude<Section, "Overview"> }) {
  const data = sectionData[section];
  return <div className="section-view"><div><small>WORKSPACE</small><h4>{data.title}</h4><p>{data.copy}</p><button>ï¼‹ Add new</button></div><div className="view-cards">{data.cards.map((card,index)=><article key={card}><span>0{index+1}</span><h5>{card}</h5><p>{index === 0 ? "In progress" : index === 1 ? "Ready for review" : "Planned"}</p><button>Open â†’</button></article>)}</div></div>;
}

