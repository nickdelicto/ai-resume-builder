import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamic import chart component to avoid SSR issues with recharts
const TrendChart = dynamic(() => Promise.resolve(TrendChartInner), { ssr: false });

function TrendChartInner({ data }) {
  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } = require('recharts');
  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Clicks" />
          <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Impressions" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Render markdown content with styled components
function MarkdownContent({ text, accentColor = '#2563eb' }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-4 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-4 mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 mt-3 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-gray-700">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all" style={{ color: accentColor }}>
            {children}
          </a>
        ),
        code: ({ children }) => <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>,
        hr: () => <hr className="my-3 border-gray-200" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export default function SeoMonitor() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatSectionRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Pagination and sort state for top pages/queries (10 per page)
  const [pagesPage, setPagesPage] = useState(0);
  const [queriesPage, setQueriesPage] = useState(0);
  const [pagesSort, setPagesSort] = useState('clicks');
  const [queriesSort, setQueriesSort] = useState('clicks');
  const PAGE_SIZE = 10;

  // Trend chart period
  const [chartPeriod, setChartPeriod] = useState(30);

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false);

  // Admin auth check
  useEffect(() => {
    const checkAdmin = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') { router.push('/auth/signin'); return; }
      try {
        const response = await fetch('/api/admin/check');
        if (response.ok) {
          const result = await response.json();
          setIsAdmin(result.isAdmin);
          if (!result.isAdmin) router.push('/profile');
          else fetchData();
        } else router.push('/profile');
      } catch { router.push('/profile'); }
    };
    checkAdmin();
  }, [status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/seo?days=365');
      if (!response.ok) throw new Error('Failed to fetch SEO data');
      setData(await response.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const sendChatMessage = async (messageText) => {
    const question = messageText || chatInput.trim();
    if (!question || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);
    try {
      const response = await fetch('/api/admin/seo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.answer || result.error }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    finally { setChatLoading(false); }
  };

  // Scroll to chat and send a question (used by alert Analyze buttons)
  const analyzeInChat = (question) => {
    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => sendChatMessage(question), 300);
  };

  // Regenerate AI analysis
  const regenerateAnalysis = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const response = await fetch('/api/admin/seo-regenerate', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to regenerate');
      const result = await response.json();
      setData(prev => ({ ...prev, aiSummary: result.aiSummary }));
    } catch (e) {
      setError(e.message);
    }
    finally { setRegenerating(false); }
  };

  // Sorted top pages and queries (client-side sort)
  const sortedPages = useMemo(() => {
    if (!data?.topPages) return [];
    return [...data.topPages].sort((a, b) => {
      if (pagesSort === 'position') return a.position - b.position;
      return b[pagesSort] - a[pagesSort];
    });
  }, [data?.topPages, pagesSort]);

  const sortedQueries = useMemo(() => {
    if (!data?.topQueries) return [];
    return [...data.topQueries].sort((a, b) => {
      if (queriesSort === 'position') return a.position - b.position;
      return b[queriesSort] - a[queriesSort];
    });
  }, [data?.topQueries, queriesSort]);

  useEffect(() => {
    // Scroll within the chat container only — don't scroll the whole page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Loading state
  if (status === 'loading' || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const trendArrow = (current, previous) => {
    if (!previous || current === previous) return null;
    const isUp = current > previous;
    return (
      <span className={`text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
        {isUp ? '↑' : '↓'}
      </span>
    );
  };

  // Position arrow is inverted (lower is better)
  const positionArrow = (current, previous) => {
    if (!previous || current === previous) return null;
    const improved = current < previous;
    return (
      <span className={`text-xs font-medium ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
        {improved ? '↑' : '↓'}
      </span>
    );
  };

  // Filter chart data by selected period
  const allChartData = data?.summaries?.map(s => ({
    date: formatDate(s.date),
    clicks: s.totalClicks,
    impressions: s.totalImpressions,
  })) || [];
  const chartData = allChartData.slice(-chartPeriod);

  const latest = data?.latestSummary;
  const prev = data?.previousSummary;

  const chartPeriods = [
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
    { label: '180d', days: 180 },
    { label: '1y', days: 365 },
  ];

  return (
    <>
      <Head>
        <title>SEO Monitor | IntelliResume Admin</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 pt-24 pb-6 max-w-6xl">

          {/* Header */}
          <div className="mb-6">
            <Link href="/admin" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">SEO Monitor</h1>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full uppercase">GSC</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="h-32 bg-white rounded-xl animate-pulse"></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>)}
              </div>
            </div>
          ) : data && latest ? (
            <div className="space-y-6">

              {/* AI Summary Card — Redesigned */}
              {data.aiSummary && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <h2 className="text-white font-semibold text-sm">AI Analysis — {formatDate(latest.date)}</h2>
                    </div>
                    <button
                      onClick={regenerateAnalysis}
                      disabled={regenerating}
                      className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                      title="Regenerate analysis"
                    >
                      {regenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                  <div className="px-6 py-5" style={{ fontFamily: 'var(--font-figtree), ui-sans-serif, system-ui' }}>
                    <div className="text-[15px] leading-7 text-gray-800">
                      <MarkdownContent text={data.aiSummary} accentColor="#6c5ce7" />
                    </div>
                  </div>
                </div>
              )}

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Clicks</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">{latest.totalClicks}</p>
                    {trendArrow(latest.totalClicks, prev?.totalClicks)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Impressions</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-purple-600">{latest.totalImpressions.toLocaleString()}</p>
                    {trendArrow(latest.totalImpressions, prev?.totalImpressions)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">CTR</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-600">{(latest.avgCtr * 100).toFixed(1)}%</p>
                    {trendArrow(latest.avgCtr, prev?.avgCtr)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Avg Position</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-amber-600">{latest.avgPosition.toFixed(1)}</p>
                    {positionArrow(latest.avgPosition, prev?.avgPosition)}
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {data.alerts && data.alerts.length > 0 && (
                <AlertsPanel alerts={data.alerts} onAnalyze={analyzeInChat} />
              )}

              {/* Trend Chart */}
              {chartData.length > 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Trend</h3>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {chartPeriods.map(p => (
                        <button
                          key={p.days}
                          onClick={() => setChartPeriod(p.days)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            chartPeriod === p.days
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrendChart data={chartData} />
                  <div className="flex justify-center gap-6 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-0.5 bg-blue-600 rounded"></span> Clicks
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-0.5 bg-purple-600 rounded"></span> Impressions
                    </span>
                  </div>
                </div>
              )}

              {/* Winners & Losers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.winners && data.winners.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-emerald-500">↑</span> Winners
                    </h3>
                    <div className="space-y-2">
                      {data.winners.map((w, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <a href={w.page} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline truncate pr-2 flex-1" title={w.page}>
                            {w.page.length > 40 ? w.page.slice(0, 40) + '...' : w.page}
                          </a>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-gray-500">{w.clicks} clicks</span>
                            <span className="text-emerald-600 font-medium">+{w.change}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.losers && data.losers.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-red-500">↓</span> Losers
                    </h3>
                    <div className="space-y-2">
                      {data.losers.map((l, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <a href={l.page} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline truncate pr-2 flex-1" title={l.page}>
                            {l.page.length > 40 ? l.page.slice(0, 40) + '...' : l.page}
                          </a>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-gray-500">{l.clicks} clicks</span>
                            <span className="text-red-500 font-medium">{l.change}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Pages & Queries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Top Pages</h3>
                    <div className="flex gap-1">
                      {[['clicks', 'Clicks'], ['impressions', 'Impr'], ['position', 'Pos']].map(([key, label]) => (
                        <button key={key} onClick={() => { setPagesSort(key); setPagesPage(0); }}
                          className={`text-xs px-2 py-0.5 rounded ${pagesSort === key ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
                          {label}{pagesSort === key ? ' ↓' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {sortedPages.slice(pagesPage * PAGE_SIZE, (pagesPage + 1) * PAGE_SIZE).map((p, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <a href={p.page} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline truncate pr-2 flex-1" title={p.page}>
                          <span className="text-gray-400 mr-1">{pagesPage * PAGE_SIZE + i + 1}.</span>
                          {p.page.length > 55 ? p.page.slice(0, 55) + '...' : p.page}
                        </a>
                        <div className="flex gap-3 text-xs flex-shrink-0">
                          <span className={`${pagesSort === 'clicks' ? 'font-semibold' : ''} text-blue-600`}>{p.clicks}c</span>
                          <span className={`${pagesSort === 'impressions' ? 'font-semibold' : ''} text-purple-600`}>{p.impressions}i</span>
                          <span className={`${pagesSort === 'position' ? 'font-semibold' : ''} text-amber-600`}>p{p.position.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {sortedPages.length > PAGE_SIZE && (
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <button onClick={() => setPagesPage(p => Math.max(0, p - 1))} disabled={pagesPage === 0}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                        Prev
                      </button>
                      <span className="text-xs text-gray-400">
                        {pagesPage * PAGE_SIZE + 1}-{Math.min((pagesPage + 1) * PAGE_SIZE, sortedPages.length)} of {sortedPages.length}
                      </span>
                      <button onClick={() => setPagesPage(p => p + 1)} disabled={(pagesPage + 1) * PAGE_SIZE >= sortedPages.length}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                        Next
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">Top Queries</h3>
                    <div className="flex gap-1">
                      {[['clicks', 'Clicks'], ['impressions', 'Impr'], ['position', 'Pos']].map(([key, label]) => (
                        <button key={key} onClick={() => { setQueriesSort(key); setQueriesPage(0); }}
                          className={`text-xs px-2 py-0.5 rounded ${queriesSort === key ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
                          {label}{queriesSort === key ? ' ↓' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {sortedQueries.slice(queriesPage * PAGE_SIZE, (queriesPage + 1) * PAGE_SIZE).map((q, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600 truncate pr-2 flex-1" title={q.query}>
                          <span className="text-gray-400 mr-1">{queriesPage * PAGE_SIZE + i + 1}.</span>
                          &ldquo;{q.query.length > 45 ? q.query.slice(0, 45) + '...' : q.query}&rdquo;
                        </span>
                        <div className="flex gap-3 text-xs flex-shrink-0">
                          <span className={`${queriesSort === 'clicks' ? 'font-semibold' : ''} text-blue-600`}>{q.clicks}c</span>
                          <span className={`${queriesSort === 'impressions' ? 'font-semibold' : ''} text-purple-600`}>{q.impressions}i</span>
                          <span className={`${queriesSort === 'position' ? 'font-semibold' : ''} text-amber-600`}>p{q.position.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {sortedQueries.length > PAGE_SIZE && (
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <button onClick={() => setQueriesPage(p => Math.max(0, p - 1))} disabled={queriesPage === 0}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                        Prev
                      </button>
                      <span className="text-xs text-gray-400">
                        {queriesPage * PAGE_SIZE + 1}-{Math.min((queriesPage + 1) * PAGE_SIZE, sortedQueries.length)} of {sortedQueries.length}
                      </span>
                      <button onClick={() => setQueriesPage(p => p + 1)} disabled={(queriesPage + 1) * PAGE_SIZE >= sortedQueries.length}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Interface */}
              <div ref={chatSectionRef} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Ask about your SEO data</h3>
                </div>

                {/* Chat Messages */}
                <div ref={chatContainerRef} className="max-h-[600px] overflow-y-auto p-4 space-y-3" style={{ fontFamily: 'var(--font-figtree), ui-sans-serif, system-ui' }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <div>
                          <MarkdownContent text={msg.content} accentColor={msg.role === 'user' ? '#ffffff' : '#2563eb'} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Questions */}
                {chatMessages.length === 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {[
                      "How's the site doing overall?",
                      "Which pages are improving?",
                      "Any indexing issues?",
                      "What should I focus on?",
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendChatMessage(q)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chat Input — Textarea */}
                <div className="p-4 border-t bg-gray-50">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="Ask about your SEO performance... (Enter to send, Shift+Enter for new line)"
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={chatLoading}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => sendChatMessage()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No SEO data yet</h3>
              <p className="text-gray-500 text-sm">Run the data pull script to populate GSC data:</p>
              <code className="block mt-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                node scripts/pull-gsc-data.js --backfill=16
              </code>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AlertsPanel({ alerts, onAnalyze }) {
  const [expanded, setExpanded] = useState(true);
  const [alertsPage, setAlertsPage] = useState(0);
  const ALERTS_PAGE_SIZE = 10;

  const critical = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');
  const info = alerts.filter(a => a.severity === 'info');

  // Group by date, show only recent
  const dates = [...new Set(alerts.map(a => new Date(a.date).toISOString().split('T')[0]))];
  const latestDate = dates[0];
  const latestAlerts = alerts.filter(a => new Date(a.date).toISOString().split('T')[0] === latestDate);
  const totalPages = Math.ceil(latestAlerts.length / ALERTS_PAGE_SIZE);
  const pagedAlerts = latestAlerts.slice(alertsPage * ALERTS_PAGE_SIZE, (alertsPage + 1) * ALERTS_PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Alerts</h3>
          <div className="flex gap-1.5">
            {critical.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {critical.length} critical
              </span>
            )}
            {warnings.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {warnings.length} warning
              </span>
            )}
            {info.length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                {info.length} win
              </span>
            )}
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {pagedAlerts.map((alert, i) => {
            const colors = {
              critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500' },
              warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
              info: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
            };
            const c = colors[alert.severity] || colors.warning;

            // Build a descriptive question for the chat
            const chatQuestion = alert.entity
              ? `Analyze this alert in detail: "${alert.title}". Which pages and keywords contributed to this? The affected entity is: ${alert.entity}`
              : `Analyze this alert in detail: "${alert.title} — ${alert.description}". Which specific pages and keywords contributed to this change? Give me the numbers.`;

            return (
              <div key={i} className={`${c.bg} border ${c.border} rounded-lg px-3 py-2 flex items-start gap-2`}>
                <span className={`w-2 h-2 ${c.dot} rounded-full mt-1.5 flex-shrink-0`}></span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${c.text}`}>{alert.title}</p>
                  {alert.entity && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate" title={alert.entity}>{alert.entity}</p>
                  )}
                </div>
                <button
                  onClick={() => onAnalyze(chatQuestion)}
                  className="text-xs text-gray-500 hover:text-blue-600 font-medium flex-shrink-0 px-2 py-0.5 rounded hover:bg-white/60 transition-colors"
                  title="Analyze this alert with AI"
                >
                  Analyze
                </button>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <button onClick={() => setAlertsPage(p => Math.max(0, p - 1))} disabled={alertsPage === 0}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                Prev
              </button>
              <span className="text-xs text-gray-400">
                {alertsPage * ALERTS_PAGE_SIZE + 1}-{Math.min((alertsPage + 1) * ALERTS_PAGE_SIZE, latestAlerts.length)} of {latestAlerts.length}
              </span>
              <button onClick={() => setAlertsPage(p => Math.min(totalPages - 1, p + 1))} disabled={alertsPage >= totalPages - 1}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
