import { apiFetch } from "./lib/api";
import { useState, useEffect } from 'react';
import { Activity, Database, Key, CheckCircle, XCircle, Smartphone, LogOut, LayoutDashboard, Puzzle, Settings, MessageSquare, Users, Bell, MessageCircle } from 'lucide-react';
import EmbeddedSignup from './components/EmbeddedSignup';
import ClientsView from './components/ClientsView';
import TemplatesView from './components/TemplatesView';
import AuthView from './components/AuthView';
import UsersView from './components/UsersView';

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

type ClientEntry = {
  id: string;
  name: string;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [currentClient, setCurrentClient] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'signup' | 'templates' | 'clients' | 'users' | 'logs'>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [metaAppId, setMetaAppId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    fetchLogs();
    fetchClients();
    fetchMetaConfig();
    
    // Poll logs every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const fetchMetaConfig = async () => {
    try {
      const res = await apiFetch('/v1/meta-config');
      if (res.ok) {
        const data = await res.json();
        setMetaAppId(data.metaAppId);
      }
    } catch (e) {
      console.error('Error fetching meta config', e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/v1/clients');
      if (res.ok) setClients(await res.json());
    } catch (e) {
      console.error('Error fetching clients', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/v1/logs');
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('Error fetching logs', e);
    }
  };

  if (!user) {
    return <AuthView onLogin={setUser} />;
  }

  const navItems = [
    { id: 'signup', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'templates', label: 'Templates', icon: MessageSquare, adminOnly: false },
    { id: 'clients', label: 'Clients', icon: Puzzle, adminOnly: true },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true },
    { id: 'logs', label: 'Logs', icon: Activity, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-indigo-600 fill-indigo-600" />
            <span className="text-xl font-bold text-slate-900">Nexus <span className="text-indigo-600">Hub</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.filter(item => !item.adminOnly || user.role === 'admin').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Pro Plan</p>
                <p className="text-xs text-slate-500">Your plan is active</p>
              </div>
            </div>
            <button className="text-sm text-indigo-600 font-medium hover:underline flex justify-between items-center w-full">
              View Plan Details <span>›</span>
            </button>
          </div>
          
          <button onClick={handleLogout} className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-slate-200 bg-white/50 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user.email.split('@')[0]} 👋
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage your communication channels and integrations.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'logs' && user.role === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> In-Memory RAM Logs
                  </h2>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">max_len=100</span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  {logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      <p>No volatile logs present. System is awaiting webhooks.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {logs.map((log, i) => (
                        <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              log.event_type.includes('SUCCESS') ? 'bg-emerald-100 text-emerald-700' :
                              log.event_type.includes('FAILED') ? 'bg-red-100 text-red-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {log.event_type}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 mt-1">{log.status_detail}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-500">
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

            {activeTab === 'signup' && (
              <EmbeddedSignup metaAppId={metaAppId} clients={clients} user={user} />
            )}

            {activeTab === 'clients' && (
              <ClientsView clients={clients} fetchClients={fetchClients} />
            )}

            {activeTab === 'users' && user.role === 'admin' && (
              <UsersView />
            )}

            {activeTab === 'templates' && (
              <TemplatesView clients={clients} user={user} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
