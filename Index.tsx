import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2, AlertCircle, ArrowRight, Search, ArrowLeft, RotateCw, Home, ExternalLink } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

// Sites that aggressively block iframe embedding
const IFRAME_BLOCKED_HOSTS = /(?:^|\.)(?:youtube\.com|youtu\.be|google\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|netflix\.com|tiktok\.com)$/i;

const Index = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    contentType: string;
    body: string;
    url: string;
    binary?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isSearchQuery = (input: string) => {
    return !input.includes(".") && !input.startsWith("http");
  };

  const getHostname = (urlStr: string) => {
    try {
      return new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`).hostname;
    } catch {
      return "";
    }
  };

  const fetchUrl = async (targetUrl: string) => {
    setLoading(true);
    setError(null);

    // Check if the site blocks iframes — open in new tab instead
    const host = getHostname(targetUrl);
    if (IFRAME_BLOCKED_HOSTS.test(host)) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("proxy", {
        body: { url: targetUrl },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setResult(data);
      setBrowsing(true);
      setUrl(data.url || targetUrl);

      const newHistory = [...history.slice(0, historyIndex + 1), targetUrl];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (err: any) {
      setError(err.message || "Failed to fetch URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let targetUrl = url.trim();

    if (isSearchQuery(targetUrl)) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}&igu=1`;
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    await fetchUrl(targetUrl);
  };

  const goBack = async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      await fetchUrl(history[newIndex]);
    }
  };

  const goHome = () => {
    setBrowsing(false);
    setResult(null);
    setError(null);
    setUrl("");
    setHistory([]);
    setHistoryIndex(-1);
  };

  const reload = async () => {
    if (history[historyIndex]) {
      await fetchUrl(history[historyIndex]);
    }
  };

  const openExternal = () => {
    if (url) {
      window.open(url.startsWith("http") ? url : `https://${url}`, "_blank", "noopener,noreferrer");
    }
  };

  const isHtml = result?.contentType?.includes("text/html");

  // Landing page
  if (!browsing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
        <ParticleBackground />

        {/* Gradient overlay */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none" style={{ zIndex: 1 }} />

        <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-2 relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
              <Globe className="w-7 h-7 text-primary" />
            </div>
            <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl -z-10 animate-pulse-glow" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-1 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
            Web Proxy
          </h1>
          <p className="text-muted-foreground text-sm mb-10 text-center max-w-md">
            Browse any website, search the web, or watch videos — fast and private.
          </p>

          {/* Main input */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="input-glow rounded-2xl overflow-hidden">
              <div className="flex items-center glass-panel rounded-2xl border-0">
                <div className="pl-5 pr-3">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Search the web or enter a URL..."
                  className="flex-1 bg-transparent border-none outline-none py-4 pr-2 text-foreground placeholder:text-muted-foreground text-base font-light"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="m-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-20 rounded-xl text-primary-foreground text-sm font-medium transition-all flex items-center gap-2 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Browse
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-4 w-full flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Quick links */}
          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {[
              { label: "🔍 Google", url: "https://www.google.com/webhp?igu=1" },
              { label: "📺 YouTube", url: "https://www.youtube.com" },
              { label: "📖 Wikipedia", url: "https://en.wikipedia.org" },
              { label: "💬 Reddit", url: "https://www.reddit.com" },
              { label: "📰 CNN", url: "https://www.cnn.com" },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => { setUrl(link.url); fetchUrl(link.url); }}
                className="px-4 py-2 rounded-xl glass-panel hover:bg-secondary/40 text-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="mt-6 text-xs text-muted-foreground/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse" />
            Proxy active — type anything to search
          </div>
        </div>
      </div>
    );
  }

  // Browsing view
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Browser chrome */}
      <div className="glass-panel border-b border-border flex items-center gap-2 px-3 py-2 shrink-0">
        <div className="flex items-center gap-0.5">
          <button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 rounded-lg hover:bg-secondary disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={reload} disabled={loading} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={goHome} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex items-center bg-secondary/60 rounded-lg border border-border/50 focus-within:border-primary/40 transition-colors">
            <div className="pl-3">
              {loading ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Search or enter URL..."
              className="flex-1 bg-transparent border-none outline-none py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </form>

        <button onClick={openExternal} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Open in new tab">
          <ExternalLink className="w-4 h-4" />
        </button>

        {result && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${result.status < 400 ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
            {result.status}
          </span>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-destructive text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {result && isHtml && (
          <iframe
            srcDoc={result.body}
            className="w-full h-full border-none bg-card"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            title="Proxied content"
          />
        )}
        {result && !isHtml && (
          <pre className="w-full h-full p-4 text-sm font-mono overflow-auto text-muted-foreground">
            {result.body}
          </pre>
        )}
      </div>
    </div>
  );
};

export default Index;
