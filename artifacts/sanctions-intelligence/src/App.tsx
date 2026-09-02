import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity, ArrowRight, BookOpen, Building2, ChevronDown, ChevronRight, CircleAlert,
  Database, ExternalLink, FileSearch, Fingerprint, GitBranch, Globe2, Link2, Menu,
  Network, PanelLeft, RefreshCw, Search, ShieldCheck, SlidersHorizontal, UserRound, X
} from 'lucide-react';
import {
  getFindEntityPathQueryKey, getGetDashboardSummaryQueryKey, getGetEntityNetworkQueryKey,
  getGetEntityQueryKey, getSearchEntitiesQueryKey, useFindEntityPath, useGetDashboardSummary,
  useGetEntity, useGetEntityNetwork, useGetSources, useSearchEntities
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function cn(...items: Array<string | false | undefined>) { return items.filter(Boolean).join(' '); }

const navItems = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/search', label: 'Entity search', icon: FileSearch },
  { href: '/paths', label: 'Connection paths', icon: GitBranch },
  { href: '/sources', label: 'Source registry', icon: Globe2 },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3 text-sidebar-accent-foreground">
            <span className="grid h-8 w-8 place-items-center bg-primary text-primary-foreground"><ShieldCheck size={18} strokeWidth={2.5} /></span>
            <span className="font-display text-[23px] leading-none tracking-[-.03em]">Ledgerline</span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation" className="rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground lg:hidden"><X size={18} /></button>
        </div>
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="eyebrow text-sidebar-foreground/45">Research workspace</div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-sidebar-foreground/75"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" /> Public sanctions sources <span className="font-data text-[10px] text-sidebar-foreground/40">SOURCE</span></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Primary navigation">
          <div className="eyebrow mb-3 px-3 text-sidebar-foreground/35">Investigate</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setMobileOpen(false)}
              className={cn('group flex items-center gap-3 border-l-2 px-3 py-3 text-[13px] font-semibold transition-colors',
                active ? 'border-primary bg-sidebar-accent text-sidebar-accent-foreground' : 'border-transparent text-sidebar-foreground/65 hover:border-sidebar-foreground/30 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground')}>
              <Icon size={16} strokeWidth={active ? 2.3 : 1.8} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 bg-primary" />}
            </Link>;
          })}
          <div className="eyebrow mb-3 mt-9 px-3 text-sidebar-foreground/35">Reference</div>
          <div className="mx-3 space-y-3 border-l border-sidebar-border pl-4 text-[11px] leading-relaxed text-sidebar-foreground/50">
            <div><span className="font-data text-primary">01</span><br />Every claim has a source.</div>
            <div><span className="font-data text-primary">02</span><br />Proximity is not proof.</div>
          </div>
        </nav>
        <div className="border-t border-sidebar-border p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-primary">JR</span>
            <div className="min-w-0"><div className="truncate text-xs font-semibold text-sidebar-accent-foreground">J. Research desk</div><div className="font-data text-[9px] uppercase tracking-widest text-sidebar-foreground/40">Editorial access</div></div>
            <PanelLeft size={14} className="ml-auto text-sidebar-foreground/30" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close menu overlay" data-testid="button-menu-overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-sidebar/50 lg:hidden" />}
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b hairline bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <button type="button" aria-label="Open navigation" data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="mr-3 rounded-md p-2 hover:bg-muted lg:hidden"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><span className="font-data text-foreground">OSINT /</span> Sanctions intelligence</div>
          <div className="relative ml-auto flex items-center gap-4">
             <div className="hidden items-center gap-2 border-r hairline pr-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Public feeds</div>
            <button type="button" aria-label="Open search" data-testid="button-header-search" onClick={() => setLocation('/search')} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Search size={18} /></button>
            <button type="button" aria-label="Open profile" data-testid="button-header-profile" className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground">JR</button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 border-b hairline pb-7 sm:flex-row sm:items-end">
    <div><div className="eyebrow mb-3 text-accent">{eyebrow}</div><h1 className="font-display text-[clamp(2rem,4vw,3.15rem)] leading-[.98] tracking-[-.045em]">{title}</h1></div>
    {children}
  </div>;
}

function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" data-testid="status-loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-muted/70" />)}</div>;
}

function ErrorBlock({ message = 'The source service could not be reached.', retry }: { message?: string; retry?: () => void }) {
  return <div className="flex items-center gap-4 border border-destructive/30 bg-destructive/5 p-5" data-testid="status-error"><CircleAlert size={19} className="shrink-0 text-destructive" /><div className="flex-1"><div className="text-sm font-bold">Research feed unavailable</div><div className="mt-1 text-xs text-muted-foreground">{message}</div></div>{retry && <button type="button" onClick={retry} data-testid="button-retry" className="flex items-center gap-2 text-xs font-bold text-destructive hover:underline"><RefreshCw size={13} /> Retry</button>}</div>;
}

function SchemaMark({ schemaType, size = 32 }: { schemaType?: string; size?: number }) {
  const person = (schemaType || '').toLowerCase().includes('person');
  return <span style={{ width: size, height: size }} className={cn('grid shrink-0 place-items-center border', person ? 'border-accent/35 bg-accent/10 text-accent' : 'border-primary/25 bg-primary/10 text-primary')}><>{person ? <UserRound size={size * .45} /> : <Building2 size={size * .45} />}</></span>;
}

function DatasetPill({ children }: { children: ReactNode }) { return <span className="inline-flex items-center border border-border bg-muted/60 px-2 py-1 font-data text-[9px] uppercase tracking-wider text-muted-foreground">{children}</span>; }

function EntityRow({ entity, index }: { entity: any; index?: number }) {
  return <Link href={`/entities/${entity.id}`} data-testid={`link-entity-${entity.id}`} className="group flex items-center gap-4 border-b hairline px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5">
    <span className="font-data w-5 text-[10px] text-muted-foreground/60">{String((index ?? 0) + 1).padStart(2, '0')}</span>
    <SchemaMark schemaType={entity.schemaType} size={34} />
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold group-hover:text-accent">{entity.name}</span><span className="mt-1 block font-data text-[10px] text-muted-foreground">{entity.id}</span></span>
    <span className="hidden max-w-[180px] text-right text-[11px] text-muted-foreground md:block">{entity.country || entity.schemaType}</span>
    <span className="hidden w-16 text-right font-data text-[11px] text-muted-foreground sm:block">{typeof entity.score === 'number' ? `${Math.round(entity.score * 100)}%` : '—'}</span>
    <ChevronRight size={16} className="text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
  </Link>;
}

function Dashboard() {
  const summaryQuery = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const summary: any = summaryQuery.data;
  return <div className="fade-in">
    <PageIntro eyebrow="Overview / morning brief" title="The source desk"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">A current view of the documented sanctions graph. Start with a name, then follow the evidence.</div></PageIntro>
    {summaryQuery.isLoading && <LoadingBlock rows={5} />}
    {summaryQuery.isError && <ErrorBlock retry={() => summaryQuery.refetch()} />}
    {summary && <div className="space-y-8">
      <section className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4" data-testid="section-dashboard-stats">
        {[
          { label: 'Indexed entities', value: summary.totalEntities, icon: Database, note: 'Across all connected lists' },
          { label: 'Documented links', value: summary.totalEdges, icon: Network, note: 'Cited graph relationships' },
          { label: 'Active datasets', value: summary.datasets?.length ?? 0, icon: Globe2, note: 'Public source registries' },
           { label: 'Source status', value: summary.sourceStatus === 'ready' ? 'Ready' : 'Available', icon: RefreshCw, note: summary.sourceStatus === 'ready' ? (summary.cacheUpdatedAt ? `Cache updated ${new Date(summary.cacheUpdatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Live source configured') : 'Free OFAC feeds ready to index' },
        ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="bg-card p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><span className="eyebrow text-muted-foreground">{stat.label}</span><Icon size={16} className="text-accent" /></div><div className="font-data text-[clamp(1.8rem,3vw,2.5rem)] font-medium tracking-[-.05em]">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div><div className="mt-2 text-[11px] text-muted-foreground">{stat.note}</div></div>; })}
      </section>
      <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
        <section className="border border-border bg-card" data-testid="section-recent-entities">
          <div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Recently observed</div><h2 className="mt-1 text-sm font-bold">Entities entering the desk</h2></div><Link href="/search" data-testid="link-view-all-entities" className="flex items-center gap-2 text-xs font-bold text-accent hover:underline">Search all <ArrowRight size={14} /></Link></div>
          {(summary.recentEntities || []).length ? summary.recentEntities.map((entity: any, i: number) => <EntityRow key={entity.id} entity={entity} index={i} />) : <div className="p-8 text-center text-sm text-muted-foreground" data-testid="status-empty-recent">No recent entities in this cache.</div>}
        </section>
        <section className="border border-border bg-card" data-testid="section-datasets">
          <div className="border-b hairline px-5 py-4"><div className="eyebrow text-accent">Coverage map</div><h2 className="mt-1 text-sm font-bold">Connected datasets</h2></div>
          <div className="p-5">{(summary.datasets || []).map((dataset: any, i: number) => <div key={dataset.name} className="mb-5 last:mb-0"><div className="mb-2 flex justify-between gap-4 text-xs"><span className="font-semibold">{dataset.name}</span><span className="font-data text-muted-foreground">{dataset.count.toLocaleString()}</span></div><div className="h-1 bg-muted"><div className="h-full bg-accent" style={{ width: `${Math.max(8, Math.min(100, (dataset.count / Math.max(...summary.datasets.map((d: any) => d.count), 1)) * 100))}%` }} /></div></div>)}</div>
        </section>
      </div>
       <div className="grid items-center gap-5 border border-accent/30 bg-accent/5 p-5 sm:grid-cols-[auto_1fr_auto] sm:p-6"><span className="grid h-10 w-10 place-items-center bg-accent text-accent-foreground"><Fingerprint size={20} /></span><div><div className="text-sm font-bold">{summary.sourceStatus === 'ready' ? 'Keep the chain visible' : 'Start with public sanctions feeds'}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{summary.sourceStatus === 'ready' ? 'Ledgerline only presents relationships attached to a citation. Open a dossier to inspect every source before you write.' : 'Search starts with free OFAC SDN and consolidated feeds. Add OpenSanctions later for broader coverage and relationship expansion. No records are fabricated.'}</p></div><Link href="/search" data-testid="link-start-investigation" className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">{summary.sourceStatus === 'ready' ? 'Start an investigation' : 'Open entity search'} <ArrowRight size={14} /></Link></div>
    </div>}
  </div>;
}

function SearchPage() {
  const [input, setInput] = useState('');
  const [queryText, setQueryText] = useState('');
  const searchQuery = useSearchEntities({ q: queryText, limit: 25 }, { query: { enabled: queryText.length >= 2, queryKey: getSearchEntitiesQueryKey({ q: queryText, limit: 25 }) } });
  const results: any[] = searchQuery.data || [];
  const exact = results.filter((r) => r.score >= .95);
  const likely = results.filter((r) => r.score < .95);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (input.trim().length >= 2) setQueryText(input.trim()); };
  return <div className="fade-in">
    <PageIntro eyebrow="Entity search / sanctions lists" title="Find an entity"><div className="text-right text-xs text-muted-foreground">Exact and likely matches<br /><span className="font-data text-[10px]">MAX 25 RESULTS</span></div></PageIntro>
    <form onSubmit={submit} className="mb-8 flex max-w-3xl border border-primary bg-card focus-within:ring-2 focus-within:ring-accent/30" data-testid="form-entity-search">
      <div className="grid w-12 place-items-center text-accent"><Search size={19} /></div><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name, alias, or identifier" aria-label="Search entities" data-testid="input-entity-search" className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/60" /><button type="submit" data-testid="button-submit-search" className="bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground">Search</button>
    </form>
    {!queryText && <div className="scan-grid flex min-h-[260px] flex-col items-center justify-center border border-dashed border-border bg-card/40 px-6 text-center" data-testid="status-search-empty"><SlidersHorizontal size={22} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Search the registry</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">Use at least two characters. Results are ranked against names and known aliases, never inferred from proximity.</p></div>}
    {queryText && searchQuery.isLoading && <LoadingBlock rows={6} />}
    {queryText && searchQuery.isError && <ErrorBlock message="Search could not be completed. Check the API connection and retry." retry={() => searchQuery.refetch()} />}
    {queryText && !searchQuery.isLoading && !searchQuery.isError && !results.length && <div className="border border-dashed border-border bg-card p-12 text-center" data-testid="status-no-search-results"><Search size={22} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-bold">No documented matches</h2><p className="mt-1 text-xs text-muted-foreground">Try a legal name, alternate spelling, or source identifier.</p></div>}
    {!!results.length && <div className="space-y-8" data-testid="search-results">
      {!!exact.length && <ResultGroup label="Exact matches" results={exact} />}
      {!!likely.length && <ResultGroup label="Likely matches" results={likely} />}
    </div>}
  </div>;
}

function ResultGroup({ label, results }: { label: string; results: any[] }) {
  return <section className="border border-border bg-card"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div className="eyebrow text-accent">{label}</div><span className="font-data text-[10px] text-muted-foreground">{results.length} {results.length === 1 ? 'record' : 'records'}</span></div><div>{results.map((entity, i) => <div key={entity.id} className="relative"><EntityRow entity={entity} index={i} /><div className="absolute right-12 top-1/2 hidden -translate-y-1/2 sm:block"><div className={cn('font-data text-[10px]', entity.score >= .95 ? 'text-accent' : 'text-muted-foreground')}>{Math.round(entity.score * 100)} match</div></div></div>)}</div></section>;
}

function SourcesPage() {
  const sourcesQuery = useGetSources({ query: { queryKey: ['/api/sources'] } });
  const sources: any[] = sourcesQuery.data || [];
  return <div className="fade-in">
    <PageIntro eyebrow="Source registry / public access" title="Know where it came from"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Free public feeds and investigative databases Ledgerline can cite without inventing a unified source.</div></PageIntro>
    {sourcesQuery.isLoading && <LoadingBlock rows={6} />}
    {sourcesQuery.isError && <ErrorBlock message="The source registry could not be loaded." retry={() => sourcesQuery.refetch()} />}
    {!!sources.length && <div className="grid gap-4 lg:grid-cols-2" data-testid="source-registry">
      {sources.map((source) => <article key={source.id} className="border border-border bg-card p-5 sm:p-6" data-testid={`source-card-${source.id}`}>
        <div className="flex items-start justify-between gap-4"><div><div className="eyebrow text-accent">{source.publisher}</div><h2 className="mt-2 font-display text-2xl leading-none tracking-[-.03em]">{source.name}</h2></div><span className={cn('shrink-0 border px-2 py-1 font-data text-[9px] uppercase tracking-wider', source.status === 'indexed' ? 'border-accent/40 bg-accent/10 text-accent' : source.mode === 'automatic' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground')}>{source.status === 'indexed' ? 'Indexed' : source.mode === 'automatic' ? 'Auto feed' : 'Discovery'}</span></div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{source.description}</p>
        <div className="mt-5 flex items-center justify-between gap-4 border-t hairline pt-4"><span className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">{source.format}</span><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline" data-testid={`link-source-registry-${source.id}`}>Official source <ExternalLink size={12} /></a></div>
      </article>)}
    </div>}
    <div className="mt-8 border border-accent/30 bg-accent/5 p-5 text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Source boundary.</span> OFAC feeds are normalized automatically. EU, UN, UK, ICIJ, OCCRP, and state registries remain linked discovery sources until their format, licensing, and update behavior can be validated independently.</div>
  </div>;
}

function EntityPage() {
  const params = useParams<{ id: string }>();
  const id = params.id || '';
  const [depth, setDepth] = useState(1);
  const entityQuery = useGetEntity(id, { query: { enabled: !!id, queryKey: getGetEntityQueryKey(id) } });
  const networkQuery = useGetEntityNetwork(id, { depth }, { query: { enabled: !!id, queryKey: getGetEntityNetworkQueryKey(id, { depth }) } });
  const entity: any = entityQuery.data;
  const graph: any = networkQuery.data;
  const propertyEntries = entity ? Object.entries(entity.properties || {}) : [];
  return <div className="fade-in">
    <div className="mb-6 flex items-center gap-2 text-[11px] text-muted-foreground"><Link href="/search" data-testid="link-back-search" className="hover:text-accent">Entity search</Link><ChevronRight size={13} /><span className="truncate">{entity?.name || id}</span></div>
    {entityQuery.isLoading && <LoadingBlock rows={4} />}
    {entityQuery.isError && <ErrorBlock retry={() => entityQuery.refetch()} />}
    {entity && <div className="space-y-8">
      <section className="border border-border bg-card p-5 sm:p-8" data-testid="section-entity-header"><div className="flex flex-col gap-6 sm:flex-row sm:items-start"><SchemaMark schemaType={entity.schemaType} size={64} /><div className="min-w-0 flex-1"><div className="eyebrow mb-2 text-accent">{entity.schemaType} / dossier</div><h1 className="break-words font-display text-[clamp(2rem,5vw,3.8rem)] leading-[.95] tracking-[-.05em]">{entity.name}</h1><div className="mt-4 flex flex-wrap items-center gap-2"><span className="font-data text-[10px] text-muted-foreground">{entity.id}</span>{entity.datasets?.map((d: string) => <DatasetPill key={d}>{d}</DatasetPill>)}</div></div><div className="border-l border-border pl-5 sm:text-right"><div className="eyebrow text-muted-foreground">Record status</div><div className="mt-2 flex items-center gap-2 text-xs font-bold sm:justify-end"><span className="h-2 w-2 rounded-full bg-accent" /> Source-linked</div></div></div></section>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="border border-border bg-card" data-testid="section-entity-properties"><div className="border-b hairline px-5 py-4"><div className="eyebrow text-accent">Known attributes</div><h2 className="mt-1 text-sm font-bold">What the sources say</h2></div><div className="divide-y divide-border">{propertyEntries.length ? propertyEntries.map(([key, values]) => <div key={key} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]"><div className="font-data text-[10px] uppercase tracking-wider text-muted-foreground">{key}</div><div className="space-y-1 text-sm">{(values as string[]).map((value, i) => <div key={i} data-testid={`text-property-${key}-${i}`}>{value}</div>)}</div></div>) : <div className="p-8 text-center text-sm text-muted-foreground" data-testid="status-empty-properties">No structured attributes available.</div>}</div>
          <div className="border-t hairline px-5 py-4"><div className="eyebrow text-accent">Also known as</div><div className="mt-3 flex flex-wrap gap-2">{entity.aliases?.length ? entity.aliases.map((alias: string) => <DatasetPill key={alias}>{alias}</DatasetPill>) : <span className="text-xs text-muted-foreground">No aliases recorded</span>}</div></div>
        </section>
        <section className="border border-border bg-card" data-testid="section-entity-sources"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Source ledger</div><h2 className="mt-1 text-sm font-bold">Primary citations</h2></div><BookOpen size={16} className="text-muted-foreground" /></div><div className="divide-y divide-border">{entity.sources?.length ? entity.sources.map((source: any, i: number) => <a key={`${source.url}-${i}`} href={source.url} target="_blank" rel="noreferrer" data-testid={`link-source-${i}`} className="group block p-5 transition-colors hover:bg-muted/45"><div className="flex gap-3"><ExternalLink size={14} className="mt-0.5 shrink-0 text-accent" /><div><div className="text-xs font-bold leading-relaxed group-hover:text-accent">{source.title}</div><div className="mt-1 text-[11px] text-muted-foreground">{source.publisher || 'Public source'} <span className="mx-1">·</span> Open source</div></div></div></a>) : <div className="p-8 text-center text-sm text-muted-foreground">No citations attached.</div>}</div></section>
      </div>
      <NetworkPanel graph={graph} depth={depth} setDepth={setDepth} loading={networkQuery.isLoading} error={networkQuery.isError} retry={() => networkQuery.refetch()} />
    </div>}
  </div>;
}

function NetworkPanel({ graph, depth, setDepth, loading, error, retry }: { graph: any; depth: number; setDepth: (n: number) => void; loading: boolean; error: boolean; retry: () => void }) {
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const positions = useMemo(() => {
    if (!graph?.nodes) return [];
    const center = graph.nodes.find((n: any) => n.depth === 0) || graph.nodes[0];
    const outer = graph.nodes.filter((n: any) => n.id !== center?.id);
    return [{ node: center, x: 50, y: 50 }, ...outer.map((node: any, i: number) => { const angle = (i / Math.max(outer.length, 1)) * Math.PI * 2 - Math.PI / 2; return { node, x: 50 + Math.cos(angle) * 31, y: 50 + Math.sin(angle) * 31 }; })].filter((p) => p.node);
  }, [graph]);
  const pos = (id: string) => positions.find((p: any) => p.node.id === id);
  return <section className="border border-border bg-card" data-testid="section-entity-network"><div className="flex flex-col justify-between gap-4 border-b hairline px-5 py-4 sm:flex-row sm:items-center"><div><div className="eyebrow text-accent">Relationship graph</div><h2 className="mt-1 text-sm font-bold">Documented connections</h2></div><div className="flex items-center gap-3"><span className="font-data text-[10px] text-muted-foreground">{graph?.nodes?.length || 0} NODES / {graph?.edges?.length || 0} EDGES</span><button type="button" onClick={() => setDepth(depth === 1 ? 2 : 1)} data-testid="button-toggle-network-depth" className="flex items-center gap-2 border border-border px-3 py-2 text-[11px] font-bold transition-colors hover:border-accent hover:text-accent"><ChevronDown size={13} /> Depth {depth}</button></div></div>
    {loading && <div className="p-5"><LoadingBlock rows={3} /></div>}
    {error && <div className="p-5"><ErrorBlock message="Network expansion failed." retry={retry} /></div>}
     {graph && !loading && <div className="grid lg:grid-cols-[1fr_330px]"><div className="scan-grid relative min-h-[420px] overflow-hidden border-b border-border lg:border-b-0 lg:border-r" data-testid="network-graph-canvas"><div className="absolute inset-0 opacity-50">{graph.edges?.map((edge: any, i: number) => { const a = pos(edge.source); const b = pos(edge.target); return a && b ? <svg key={i} className="absolute inset-0 h-full w-full overflow-visible"><line x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} stroke={selectedEdge === edge ? 'hsl(var(--primary))' : 'hsl(var(--accent) / .5)'} strokeWidth={selectedEdge === edge ? '3' : '1.5'} strokeDasharray={edge.confidence?.toLowerCase().includes('low') ? '4 4' : undefined} className="cursor-pointer transition-all" onClick={() => setSelectedEdge(edge)} aria-label={`Select ${edge.relationshipType} relationship`} /></svg> : null; })}</div>{positions.map(({ node, x, y }: any) => <Link key={node.id} href={`/entities/${node.id}`} data-testid={`link-network-node-${node.id}`} style={{ left: `${x}%`, top: `${y}%` }} className={cn('absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:z-10 hover:scale-105', node.depth === 0 ? 'w-32' : 'w-24')}><div className={cn('mx-auto grid place-items-center border-2 bg-card shadow-sm', node.depth === 0 ? 'h-14 w-14 border-primary text-primary' : 'h-10 w-10 border-accent/60 text-accent')}><span className="font-data text-[10px]">{node.depth === 0 ? 'ROOT' : `0${node.depth}`}</span></div><div className="mt-2 line-clamp-2 text-center text-[10px] font-bold leading-tight">{node.label}</div><div className="mt-1 text-center font-data text-[8px] uppercase text-muted-foreground">{node.schemaType}</div></Link>)}</div><div className="max-h-[420px] overflow-auto p-5">{selectedEdge && <div className="mb-5 border border-primary/30 bg-primary/5 p-4" data-testid="selected-network-edge"><div className="eyebrow text-primary">Selected relationship</div><div className="mt-2 text-sm font-bold">{selectedEdge.relationshipType}</div><div className="mt-1 text-[10px] text-muted-foreground">{selectedEdge.confidence} confidence</div><a href={selectedEdge.citation?.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"><ExternalLink size={11} /> {selectedEdge.citation?.title || 'Open source citation'}</a></div>}<div className="eyebrow mb-4 text-muted-foreground">Evidence trail</div>{graph.edges?.length ? graph.edges.map((edge: any, i: number) => <button type="button" key={i} onClick={() => setSelectedEdge(edge)} className={cn('mb-4 block w-full border-l-2 pl-3 text-left transition-colors', selectedEdge === edge ? 'border-primary bg-primary/5' : 'border-accent/40 hover:bg-muted/45')} data-testid={`network-edge-${i}`}><div className="text-xs font-bold">{edge.relationshipType}</div><div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{edge.confidence} confidence</div><span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-accent"><Link2 size={11} /> {edge.citation?.title || 'View citation'}</span></button>) : <div className="text-xs text-muted-foreground">No documented relationships at this depth.</div>}<div className="mt-6 border-t hairline pt-4 text-[10px] leading-relaxed text-muted-foreground">Lines show cited relationships only. A connection is not an allegation.</div></div></div>}
  </section>;
}

function PathsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submitted, setSubmitted] = useState<{ from: string; to: string } | null>(null);
  const pathQuery = useFindEntityPath(submitted || { from: '', to: '' }, { query: { enabled: !!submitted?.from && !!submitted?.to, queryKey: getFindEntityPathQueryKey(submitted || { from: '', to: '' }) } });
  const result: any = pathQuery.data;
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (from.trim() && to.trim() && from.trim() !== to.trim()) setSubmitted({ from: from.trim(), to: to.trim() }); };
  return <div className="fade-in"><PageIntro eyebrow="Graph tools / shortest route" title="Trace a connection"><div className="max-w-xs text-right text-xs leading-relaxed text-muted-foreground">Move between two known entities through relationships backed by a source citation.</div></PageIntro>
    <form onSubmit={submit} className="mb-10 grid gap-3 border border-border bg-card p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end sm:p-6" data-testid="form-path-search"><PathInput label="From entity" value={from} setValue={setFrom} testId="input-path-from" placeholder="Entity ID or name" /><div className="hidden pb-3 text-accent sm:block"><ArrowRight size={18} /></div><PathInput label="To entity" value={to} setValue={setTo} testId="input-path-to" placeholder="Entity ID or name" /><button type="submit" data-testid="button-find-path" className="flex h-11 items-center justify-center gap-2 bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"><GitBranch size={15} /> Find shortest path</button></form>
    {!submitted && <div className="scan-grid flex min-h-[270px] flex-col items-center justify-center border border-dashed border-border bg-card/40 px-6 text-center" data-testid="status-path-empty"><GitBranch size={26} className="mb-4 text-accent" /><h2 className="font-display text-2xl">Follow the documented chain</h2><p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">Enter two entity IDs to test whether the source graph connects them. The result shows only the shortest cited route.</p></div>}
    {submitted && pathQuery.isLoading && <LoadingBlock rows={4} />}
    {submitted && pathQuery.isError && <ErrorBlock message="The path service could not complete this query." retry={() => pathQuery.refetch()} />}
    {result && !pathQuery.isLoading && <PathResultView result={result} />}
  </div>;
}

function PathInput({ label, value, setValue, testId, placeholder }: { label: string; value: string; setValue: (v: string) => void; testId: string; placeholder: string }) {
  return <label className="block"><span className="eyebrow mb-2 block text-muted-foreground">{label}</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} data-testid={testId} className="h-11 w-full border border-input bg-background px-3 font-data text-xs outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>;
}

function PathResultView({ result }: { result: any }) {
  if (!result.found) return <div className="border border-dashed border-border bg-card p-12 text-center" data-testid="status-path-not-found"><CircleAlert size={22} className="mx-auto mb-3 text-muted-foreground" /><h2 className="text-sm font-bold">No cited path found</h2><p className="mt-1 text-xs text-muted-foreground">These entities are not connected within the documented graph.</p></div>;
  return <section className="border border-border bg-card" data-testid="section-path-result"><div className="flex items-center justify-between border-b hairline px-5 py-4"><div><div className="eyebrow text-accent">Path located</div><h2 className="mt-1 text-sm font-bold">Shortest documented connection</h2></div><span className="font-data text-[10px] text-muted-foreground">{result.edges?.length || 0} RELATIONSHIPS</span></div><div className="overflow-x-auto p-5 sm:p-8"><div className="flex min-w-[560px] items-start">{result.nodes?.map((node: any, i: number) => <div key={node.id} className="flex flex-1 items-start"><Link href={`/entities/${node.id}`} data-testid={`link-path-node-${node.id}`} className="group w-full text-center"><SchemaMark schemaType={node.schemaType} size={48} /><div className="mt-3 text-xs font-bold group-hover:text-accent">{node.label}</div><div className="mt-1 font-data text-[9px] text-muted-foreground">{node.id}</div></Link>{i < result.nodes.length - 1 && <div className="mt-6 flex min-w-[90px] flex-1 items-center px-3"><div className="h-px flex-1 bg-accent" /><ArrowRight size={14} className="text-accent" /></div>}</div>)}</div><div className="mt-8 grid gap-3 border-t hairline pt-5 sm:grid-cols-2">{result.edges?.map((edge: any, i: number) => <div key={i} className="border-l-2 border-accent/50 pl-3"><div className="text-xs font-bold">{edge.relationshipType}</div><div className="mt-1 text-[10px] text-muted-foreground">{edge.confidence} confidence <span className="mx-1">·</span> {edge.citation?.publisher || 'Source citation'}</div><a href={edge.citation?.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"><ExternalLink size={11} /> {edge.citation?.title || 'Open source'}</a></div>)}</div></div></section>;
}

function Router() {
  const [route] = useLocation();
  return <AppShell><ErrorBoundary resetKey={route}><Switch><Route path="/" component={Dashboard} /><Route path="/search" component={SearchPage} /><Route path="/sources" component={SourcesPage} /><Route path="/entities/:id" component={EntityPage} /><Route path="/paths" component={PathsPage} /><Route component={NotFound} /></Switch></ErrorBoundary></AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;