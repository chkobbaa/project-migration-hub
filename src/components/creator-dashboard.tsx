import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Bell, CheckCircle2, XCircle, EyeOff, RotateCcw, Flag, LayoutGrid, Clock, ArrowUpRight, Play, Plus, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import { ContentCover, StatusBadge } from './content-cover';
import { notificationsQuery, workspaceQuery, type CreatorNotification } from '@/lib/queries';
import { fr } from '@/lib/fr';

const SEEN_KEY = 'creativescroll-notifications-seen';
const ago = (date: string) => { const d = new Date(date); return Date.now() - d.getTime() < 60_000 ? fr.justNow : formatDistanceToNowStrict(d, { addSuffix: true, locale: frLocale }); };

function notifMeta(n: CreatorNotification) {
  if (n.kind === 'REPORT') return { icon: Flag, tone: 'warn', text: fr.notifReport, detail: fr.notifReportHelp };
  const map = { ACCEPTED: { icon: CheckCircle2, tone: 'ok' }, REJECTED: { icon: XCircle, tone: 'bad' }, REMOVED: { icon: EyeOff, tone: 'bad' }, RESTORED: { icon: RotateCcw, tone: 'ok' } } as const;
  const key = (n.decision in map ? n.decision : 'ACCEPTED') as keyof typeof map;
  return { ...map[key], text: fr.notifDecision[key], detail: n.reason };
}

function NotificationsPanel() {
  const { data: items } = useSuspenseQuery(notificationsQuery());
  const [seen, setSeen] = useState<number | null>(null);
  useEffect(() => { setSeen(Number(localStorage.getItem(SEEN_KEY) ?? 0)); }, []);
  const unread = seen === null ? 0 : items.filter(n => new Date(n.created_at).getTime() > seen).length;
  const markRead = () => { const now = Date.now(); localStorage.setItem(SEEN_KEY, String(now)); setSeen(now); };
  return <section className="dash-panel notif-panel" id="notifications" aria-labelledby="notif-title">
    <header className="panel-head"><h2 id="notif-title"><Bell size={17}/>{fr.notifications}{unread > 0 && <span className="unread-pill">{unread}</span>}</h2>{unread > 0 && <button type="button" className="text-action" onClick={markRead}><CheckCheck size={14}/>{fr.markAllRead}</button>}</header>
    {items.length === 0 ? <div className="notif-empty">
      <div className="notif-empty-art" aria-hidden="true"><span className="ring r1"/><span className="ring r2"/><span className="bell"><Bell size={24}/></span></div>
      <h3>{fr.notifEmptyTitle}</h3><p>{fr.notifEmptySubtitle}</p>
      <Button asChild variant="outline" size="sm"><Link to="/contents" search={{ nouveau: true }}><Plus size={15}/>{fr.newContent}</Link></Button>
    </div> : <ul className="notif-list">{items.map(n => { const m = notifMeta(n); const isNew = seen !== null && new Date(n.created_at).getTime() > seen; return <li key={n.id}>
      <Link to="/content/$id" params={{ id: n.content_id }} className={`notif-item ${isNew ? 'is-new' : ''}`}>
        <span className={`notif-icon ${m.tone}`}><m.icon size={16}/></span>
        <span className="notif-text"><span><strong>« {n.content_title} »</strong> {m.text}</span>{m.detail && <small>{m.detail}</small>}</span>
        <span className="notif-time">{isNew && <span className="new-dot" aria-label={fr.newBadge}/>}{ago(n.created_at)}</span>
      </Link></li>; })}</ul>}
  </section>;
}

export function CreatorDashboard() {
  const { data } = useSuspenseQuery(workspaceQuery());
  const own = data.contents.filter(c => c.author_id === data.user.id);
  const rejected = own.filter(c => c.status === 'REJECTED');
  const first = data.name.split(/\s+/)[0] || data.name;
  const stats = [
    { label: fr.total, value: own.length, icon: LayoutGrid },
    { label: fr.pendingStat, value: own.filter(c => c.status === 'PENDING').length, icon: Clock },
    { label: fr.validatedStat, value: own.filter(c => c.status === 'VALIDATED').length, icon: CheckCircle2 },
    { label: fr.rejectedStat, value: rejected.length, icon: RotateCcw },
  ];
  return <>
    <div className="page-heading"><div><p className="greeting">{fr.home}</p><h1>{fr.hello}, {first}</h1><p>{fr.creatorSubtitle}</p></div></div>
    <div className="dash-stats">{stats.map(s => <Link to="/contents" key={s.label} className="dash-stat"><span className="dash-stat-label"><s.icon size={14}/>{s.label}</span><strong>{s.value}</strong></Link>)}</div>
    <div className="dash-grid">
      <NotificationsPanel/>
      <div className="dash-side">
        {rejected.length > 0 && <section className="dash-panel todo-panel"><header className="panel-head"><h2><RotateCcw size={17}/>{fr.todoTitle}</h2></header><p className="panel-sub">{fr.todoSubtitle}</p><ul className="mini-list">{rejected.slice(0, 3).map(c => <li key={c.id}><Link to="/content/$id" params={{ id: c.id }} className="mini-item"><span className="mini-thumb"><ContentCover content={c}/></span><span className="mini-text"><strong>{c.title}</strong><small>{c.rejection_reason || fr.statuses.REJECTED}</small></span><ArrowUpRight size={15}/></Link></li>)}</ul></section>}
        <section className="dash-panel">
          <header className="panel-head"><h2><LayoutGrid size={17}/>{fr.recentContents}</h2><Link to="/contents" className="text-action">{fr.seeAll}<ArrowUpRight size={14}/></Link></header>
          {own.length ? <ul className="mini-list">{own.slice(0, 3).map(c => <li key={c.id}><Link to="/content/$id" params={{ id: c.id }} className="mini-item"><span className="mini-thumb"><ContentCover content={c}/></span><span className="mini-text"><strong>{c.title}</strong><small>{fr.types[c.content_type]} · {c.categories?.name}</small></span><StatusBadge status={c.status}/></Link></li>)}</ul>
            : <div className="mini-empty"><p>{fr.homeEmptySubtitle}</p><Button asChild size="sm"><Link to="/contents" search={{ nouveau: true }}><Plus size={15}/>{fr.newContent}</Link></Button></div>}
        </section>
        <Link to="/scroll" className="scroll-teaser"><span className="teaser-icon"><Play size={18}/></span><span><strong>{fr.scroll}</strong><small>{fr.scrollTitle}</small></span><span className="soon-chip">{fr.scrollBadge}</span></Link>
      </div>
    </div>
  </>;
}
