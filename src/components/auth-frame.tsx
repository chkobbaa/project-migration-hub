import type { ReactNode } from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { Brand } from './workspace-shell';
import { fr } from '@/lib/fr';
import studioAsset from '@/assets/creative-studio.jpg.asset.json';
const studio = studioAsset.url;

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <header className="auth-header"><Brand /><span className="auth-tag"><LockKeyhole size={14} />{fr.authFoot}</span></header>
      <main className="auth-main">
        <div className="auth-form-area">
          <div className="auth-eyebrow"><span className="online-dot" />{fr.welcome}</div>
          <h1>{title}<span className="brand-dot">.</span></h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
        <div className="auth-visual">
          <img src={studio} alt="Carnet créatif et thé dans un atelier lumineux" />
          <div className="auth-visual-copy"><span><Sparkles size={19} />{fr.brand}</span><h2>Les petites idées font<br />les grandes découvertes.</h2><p>{fr.studioSubtitle}</p></div>
          <div className="visual-caption">CRÉER · PARTAGER · INSPIRER</div>
        </div>
      </main>
      <footer className="auth-footer">© 2026 CreativeScroll<span>{fr.authFoot}</span></footer>
    </div>
  );
}
