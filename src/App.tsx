import { useState, useEffect } from 'react';
import { Activity, Database, Key, CheckCircle, XCircle } from 'lucide-react';

type LogEntry = {
  timestamp: string;
  app_id?: string;
  company_id?: string;
  event_type: string;
  status_detail: string;
};

type MetaApp = {
  id: number;
  appId: string;
  appName: string;
  verifyToken: string;
};

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apps, setApps] = useState<MetaApp[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'apps'>('logs');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchApps();
    
    // Poll logs every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/v1/logs');
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('Error fetching logs', e);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await fetch('/v1/meta-apps');
      if (res.ok) setApps(await res.json());
    } catch (e) {
      console.error('Error fetching apps', e);
    }
  };

  const seedDemoApp = async () => {
    setIsLoading(true);
    try {
      await fetch('/v1/meta-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: `APP_${Math.floor(Math.random() * 100000)}`,
          appName: 'Nexus Multichannel Hub',
          appSecret: 'test_secret_123',
          verifyToken: 'nexus_secure_token'
        })
      });
      fetchApps();
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="border-b border-neutral-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-emerald-400" />
              Nexus Meta Hub
            </h1>
            <p className="text-neutral-500 mt-2">Compliance Proxy & Multi-App Router</p>
          </div>
          <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'logs' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Volatile Logs
            </button>
            <button 
              onClick={() => setActiveTab('apps')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'apps' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Meta Apps
            </button>
          </div>
        </header>

        <main>
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" /> In-Memory RAM Logs
                </h2>
                <span className="text-xs font-mono bg-neutral-800 px-2 py-1 rounded text-neutral-400">max_len=100</span>
              </div>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                {logs.length === 0 ? (
                  <div className="p-12 text-center text-neutral-500">
                    <p>No volatile logs present. System is awaiting webhooks.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800">
                    {logs.map((log, i) => (
                      <div key={i} className="p-4 hover:bg-neutral-800/50 transition-colors flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-neutral-500">{new Date(log.timestamp).toLocaleString()}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            log.event_type.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-400' :
                            log.event_type.includes('FAILED') ? 'bg-red-500/10 text-red-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {log.event_type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mt-1">{log.status_detail}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-mono text-neutral-500">
                          {log.app_id && <span>AppID: {log.app_id}</span>}
                          {log.company_id && <span>CompanyID: {log.company_id}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" /> Registered Meta Apps
                </h2>
              </div>

              {/* Form to add real Meta Apps */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                const formData = new FormData(e.currentTarget);
                try {
                  await fetch('/v1/meta-apps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      appId: formData.get('appId'),
                      appName: formData.get('appName'),
                      appSecret: formData.get('appSecret'),
                      verifyToken: formData.get('verifyToken')
                    })
                  });
                  e.currentTarget.reset();
                  fetchApps();
                } catch (err) {
                  console.error(err);
                }
                setIsLoading(false);
              }} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-medium text-neutral-300 border-b border-neutral-800 pb-2">Register New App</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required name="appId" placeholder="App ID (ex: 1713999679641278)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  <input required name="appName" placeholder="App Name (ex: Nexus Production)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  <input required name="appSecret" type="password" placeholder="App Secret (from Meta)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                  <input required name="verifyToken" placeholder="Verify Token (create one here)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                </div>
                <button disabled={isLoading} type="submit" className="w-full py-2 bg-amber-500 text-black text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors">
                  {isLoading ? 'Saving...' : 'Save Meta App to Database'}
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.length === 0 ? (
                  <div className="col-span-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl text-center text-neutral-500">
                    No Meta Apps registered yet.
                  </div>
                ) : (
                  apps.map((app) => (
                    <div key={app.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{app.appName}</h3>
                          <p className="text-xs text-neutral-500 mt-1 font-mono">ID: {app.appId}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="pt-4 border-t border-neutral-800">
                        <p className="text-xs text-neutral-400">Verify Token:</p>
                        <p className="text-sm font-mono text-white break-all mt-1">{app.verifyToken}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
