import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import AuthPanel from "./AuthPanel";
import { supabase } from "./supabase";

const sections = ["Overview", "Work", "Brand", "Content", "Products", "Team"] as const;
type Section = (typeof sections)[number];

const sectionData: Record<Exclude<Section, "Overview">, { title: string; copy: string; cards: string[] }> = {
  Work: { title: "Keep every project moving.", copy: "Track the work, the owner and the next decision without losing the context.", cards: ["GSN Clubs rollout", "August publishing plan", "Sponsor proposal"] },
  Brand: { title: "One approved brand library.", copy: "Keep logos, colors, templates and guidance ready for every person who creates.", cards: ["Master identity", "Social templates", "Partner lockups"] },
  Content: { title: "Plan before you publish.", copy: "Coordinate the message, channel, deadline and approval in one calm calendar.", cards: ["Matchday carousel", "Player Network story", "Wave weekly lineup"] },
  Products: { title: "Your BrownGlobal toolkit.", copy: "Move between Studio and each connected product while your organization stays consistent.", cards: ["Flow \u00b7 customers", "Reach \u00b7 campaigns", "Wave \u00b7 streaming"] },
  Team: { title: "Right people. Right access.", copy: "Invite collaborators and choose what each person can view, edit or approve.", cards: ["Owner", "Workspace manager", "Contributor"] },
};

const tasks = ["Add your business details", "Upload approved brand assets", "Invite a team member", "Connect a BrownGlobal product"];

export default function App() {
  const [section, setSection] = useState<Section>("Overview");
  const [done, setDone] = useState<number[]>([0]);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("Old Gold SC");
  const [organizationId, setOrganizationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskIds, setTaskIds] = useState<Record<number, string>>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const progress = useMemo(() => Math.round((done.length / tasks.length) * 100), [done]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadWorkspace(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadWorkspace(nextSession);
      else {
        setOrganizationId("");
        setProjectId("");
        setTaskIds({});
        setDone([0]);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function loadWorkspace(activeSession: Session) {
    if (!supabase) return;
    setWorkspaceMessage("Loading your workspace...");
    const { data: existingOrganization } = await supabase
      .from("organizations")
      .select("id,name")
      .eq("owner_id", activeSession.user.id)
      .limit(1)
      .maybeSingle();
    let organization = existingOrganization;
    if (!organization) {
      const fullName = String(activeSession.user.user_metadata.full_name || activeSession.user.email?.split("@")[0] || "My");
      const { data: created, error } = await supabase
        .from("organizations")
        .insert({ name: fullName + "'s workspace", owner_id: activeSession.user.id })
        .select("id,name")
        .single();
      if (error) {
        setWorkspaceMessage(error.message);
        return;
      }
      organization = created;
    }
    setOrganizationId(organization.id);
    setOrganizationName(organization.name);
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", organization.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    let currentProject = existingProject;
    if (!currentProject) {
      const { data: createdProject, error } = await supabase
        .from("projects")
        .insert({ organization_id: organization.id, name: "Business setup", status: "active" })
        .select("id")
        .single();
      if (error) {
        setWorkspaceMessage(error.message);
        return;
      }
      currentProject = createdProject;
    }
    setProjectId(currentProject.id);
    let { data: savedTasks } = await supabase
      .from("tasks")
      .select("id,title,completed")
      .eq("project_id", currentProject.id)
      .order("created_at");
    if (!savedTasks?.length) {
      const { data: createdTasks, error } = await supabase
        .from("tasks")
        .insert(tasks.map(title => ({ project_id: currentProject.id, title })))
        .select("id,title,completed");
      if (error) {
        setWorkspaceMessage(error.message);
        return;
      }
      savedTasks = createdTasks;
    }
    const ids: Record<number, string> = {};
    const completed: number[] = [];
    tasks.forEach((title, index) => {
      const saved = savedTasks?.find(item => item.title === title);
      if (saved) {
        ids[index] = saved.id;
        if (saved.completed) completed.push(index);
      }
    });
    setTaskIds(ids);
    setDone(completed);
    setWorkspaceMessage("Saved automatically to your BrownGlobal account.");
  }

  async function toggleTask(index: number) {
    const completed = !done.includes(index);
    setDone(current => completed ? [...current, index] : current.filter(id => id !== index));
    if (supabase && taskIds[index]) {
      const { error } = await supabase.from("tasks").update({ completed }).eq("id", taskIds[index]);
      if (error) setWorkspaceMessage(error.message);
    } else if (!session) {
      setWorkspaceMessage("This preview is local. Sign up to save your progress.");
    }
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !session || !organizationId) {
      setAuthOpen(true);
      return;
    }
    if (!newProjectName.trim()) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({ organization_id: organizationId, name: newProjectName.trim(), status: "active" })
      .select("id")
      .single();
    if (error) {
      setWorkspaceMessage(error.message);
      return;
    }
    setProjectId(data.id);
    setNewProjectName("");
    setTaskIds({});
    setDone([]);
    setWorkspaceMessage("New project created. Add its first tasks from the Work section.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setWorkspaceMessage("You are signed out.");
  }

  return <main>
    <header className="topbar">
      <a className="wordmark" href="#top"><img src="/studio-logo.svg" alt="BrownGlobal Studio logo"/><span>BrownGlobal <b>Studio</b></span></a>
      <nav><a href="#product">Product</a><a href="#business">Business</a><a href="#plans">Plans</a></nav>
      <div className="account-actions"><a className="button dark small" href="#product">Open Studio <span>&nearr;</span></a><button className={"account-button " + (session ? "signed" : "")} onClick={session ? signOut : () => setAuthOpen(true)}>{session ? "Sign out" : "Sign up"}</button></div>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy"><span className="eyebrow"><i/>Your business, brought together</span><h1>One calm place to <em>run the work.</em></h1><p>Organize projects, content, brand assets and your team&mdash;then move into Flow, Reach and Wave without losing the thread.</p><div className="actions"><a className="button primary" href="#product">See the workspace <span>&darr;</span></a><a className="text-link" href="#business">Explore BrownGlobal Business &rarr;</a></div><div className="audience"><span>Built for</span><b>businesses</b><b>clubs</b><b>media teams</b></div></div>
      <div className="orbit" aria-hidden="true"><div className="ring one"/><div className="ring two"/><div className="core"><img src="/studio-logo.svg" alt=""/><small>STUDIO</small></div><span className="chip plan">Plan</span><span className="chip create">Create</span><span className="chip grow">Grow</span></div>
    </section>

    <section className="product" id="product">
      <div className="section-title"><span className="eyebrow light"><i/>Interactive product preview</span><h2>Clear enough for Monday morning.</h2><p>Select a section and see how Studio holds the business together.</p></div>
      <div className="workspace">
        <aside><div className="mini-brand"><img src="/studio-logo.svg" alt=""/><b>Studio</b></div><div className="org"><span>{organizationName.split(" ").map(word=>word[0]).join("").slice(0,2).toUpperCase()}</span><div><b>{organizationName}</b><small>{session ? "Saved workspace" : "Interactive preview"}</small></div></div><small className="label">Workspace</small>{sections.map(item => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}><span>{item[0]}</span>{item}</button>)}<div className="upgrade"><small>BROWNGLOBAL BUSINESS</small><b>Bring every tool together.</b><a href="#plans">Compare plans &rarr;</a></div></aside>
        <div className="dashboard"><div className="dash-head"><div><small>STUDIO / {section.toUpperCase()}</small><h3>{section === "Overview" ? "Good morning, " + String(session?.user.user_metadata.full_name || "there").split(" ")[0] + "." : section}</h3><span className="workspace-status"><i/>{workspaceMessage || (session ? "Your workspace is connected." : "Preview mode - sign up to save.")}</span></div><span className="avatar">{String(session?.user.user_metadata.full_name || "BG").split(" ").map((part:string)=>part[0]).join("").slice(0,2).toUpperCase()}</span></div>
          {session && <form className="new-project-form" onSubmit={createProject}><input aria-label="New project name" value={newProjectName} onChange={event=>setNewProjectName(event.target.value)} placeholder="Create another project" /><button>Add project</button></form>}
          {section === "Overview" ? <div className="grid">
            <article className="panel setup"><div className="panel-head"><div><small>GET STARTED</small><h4>Build your workspace</h4></div><b>{progress}%</b></div><div className="progress"><i style={{width: `${progress}%`}}/></div>{tasks.map((task, index) => <button className="task" key={task} onClick={() => toggleTask(index)}><span className={done.includes(index) ? "check checked" : "check"}>{done.includes(index) ? "\u2713" : ""}</span><span><b>{task}</b><small>{done.includes(index) ? "Completed" : "Ready"}</small></span><em>&rarr;</em></button>)}</article>
            <article className="panel today"><div className="panel-head"><div><small>TODAY</small><h4>Friday, 31 July</h4></div><b>+</b></div><div className="meeting"><time>10:00</time><span><b>Review training photos</b><small>Content &middot; GSN Clubs</small></span></div><div className="meeting"><time>14:30</time><span><b>Sponsor check-in</b><small>Reach &middot; Campaign</small></span></div><p>Open afternoon <b>3h 30m</b></p></article>
            <article className="panel connected"><div className="panel-head"><div><small>YOUR PRODUCTS</small><h4>Connected to Studio</h4></div></div>{[["F","Flow","Customers & service"],["R","Reach","Campaigns & sponsorships"],["W","Wave","Live & on demand"]].map(product => <div className="product-row" key={product[1]}><span>{product[0]}</span><div><b>{product[1]}</b><small>{product[2]}</small></div><em>Open &nearr;</em></div>)}</article>
            <article className="panel pulse"><div className="panel-head"><div><small>THIS WEEK</small><h4>Business pulse</h4></div><b>&uarr; 18%</b></div><strong>12</strong><p>tasks completed</p><div className="bars">{[35,55,42,72,90,64,28].map((height,i) => <i key={i} style={{height: `${height}%`}}/>)}</div></article>
          </div> : <SectionView section={section}/>} 
        </div>
      </div>
    </section>

    <section className="business" id="business"><div><span className="eyebrow"><i/>BrownGlobal Business</span><h2>Studio is the home.<br/>The products stay powerful.</h2><p>See every subscription, manage your BrownGlobal account and keep your organization together here. Product websites can promote Business, while Studio remains the official subscription home.</p></div><div className="system"><div className="system-center"><img src="/studio-logo.svg" alt=""/><b>Studio</b><small>ORGANIZE</small></div>{[["Flow","SERVE"],["Reach","GROW"],["Wave","STREAM"]].map((item,i)=><div className={`satellite s${i}`} key={item[0]}><span>{item[0][0]}</span><b>{item[0]}</b><small>{item[1]}</small></div>)}</div></section>
    <section className="plans" id="plans"><div className="plans-header"><span className="eyebrow"><i/>Subscriptions and billing</span><h2>One account. One place to subscribe.</h2><p>BrownGlobal Business and the individual subscriptions will be purchased and managed through Studio. After Stripe checkout is added, access will follow the same BrownGlobal account across eligible platforms.</p></div><div className="plan-grid"><article className="plan-card"><small>FREE</small><h3>$0</h3><p>For anyone getting started.</p><ul><li>One BrownGlobal account and Studio workspace</li><li>Core projects, tasks and Reach planning</li><li>Free Wave and Learn experiences</li><li>Standard support</li></ul></article><article className="plan-card business-plan"><small>BROWNGLOBAL BUSINESS</small><h3>$14.99 per user/month</h3><p>$149.99 per user/year. All BrownGlobal premium subscriptions are included at no additional charge.</p><ul><li>Studio Pro and Flow Pro</li><li>Wave Premium and Learn Plus</li><li>Additional Reach planning and reporting benefits</li><li>Central billing, priority support and early access</li></ul></article><article className="plan-card"><small>STANDALONE SUBSCRIPTIONS</small><h3>Choose one product</h3><p>Each product remains available separately.</p><ul><li><b>Studio Pro:</b> $9.99/month or $99.99/year</li><li><b>Flow Pro:</b> $9.99/month or $99.99/year</li><li><b>Wave Premium:</b> $4.99/month or $49.99/year</li><li><b>Learn Plus:</b> $4.99/month or $49.99/year</li></ul></article><article className="plan-card"><small>BROWNGLOBAL REACH</small><h3>No subscription</h3><p>Reach is free to access because advertising, sponsorships and campaign services are priced separately.</p><ul><li>Free campaign planning and requests</li><li>Business adds priority planning and unified reporting</li><li>Advertising spend is never included in Business</li><li>No guaranteed placements or campaign results</li></ul></article></div><p>Payments are not active yet. Stripe checkout will be added in Studio before subscriptions go on sale.</p></section>
    <section className="access" id="access"><span className="eyebrow light"><i/>Early access</span><h2>Build the system before the noise.</h2><p>Studio is being prepared as the operating home for BrownGlobal businesses, partners and approved teams.</p><a className="button primary" href="mailto:admin@brownglobal.app?subject=BrownGlobal%20Studio%20early%20access">Request early access <span>&rarr;</span></a></section>
    <footer><a className="wordmark" href="#top"><img src="/studio-logo.svg" alt="BrownGlobal Studio logo"/><span>BrownGlobal <b>Studio</b></span></a><p>Organize the business. Keep the work moving.</p><div><a href="mailto:admin@brownglobal.app">admin@brownglobal.app</a><span>&copy; 2026 BrownGlobal Holdings LLC</span></div></footer>
    <AuthPanel open={authOpen} onClose={()=>setAuthOpen(false)} product="Studio" />
  </main>;
}

function SectionView({ section }: { section: Exclude<Section, "Overview"> }) {
  const data = sectionData[section];
  return <div className="section-view"><div><small>WORKSPACE</small><h4>{data.title}</h4><p>{data.copy}</p><button>+ Add new</button></div><div className="view-cards">{data.cards.map((card,index)=><article key={card}><span>0{index+1}</span><h5>{card}</h5><p>{index === 0 ? "In progress" : index === 1 ? "Ready for review" : "Planned"}</p><button>Open &rarr;</button></article>)}</div></div>;
}

