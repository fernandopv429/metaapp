import { apiFetch } from "../lib/api";
import { useState, useEffect } from 'react';
import { Smartphone, HelpCircle, MessageCircle } from 'lucide-react';

export default function EmbeddedSignup({ metaAppId, clients, user }: { metaAppId: string, clients: any[], user: any }) {
  const [selectedClient, setSelectedClient] = useState<string>(user?.role === 'admin' ? '' : (user?.companyId || user?.id?.toString() || ''));
  const [status, setStatus] = useState<string>('');
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    // Load the Facebook SDK asynchronously
    if (document.getElementById('facebook-jssdk')) return;
    
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setSdkLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const launchSignup = () => {
    const clientId = user?.role === 'admin' ? selectedClient : (user?.companyId || user?.id?.toString());

    if (!clientId) {
      setStatus(user?.role === 'admin' ? 'Please select a client first.' : 'Error: No client ID associated with your account.');
      return;
    }

    if (!metaAppId) {
      setStatus('No Meta App configured in environment variables.');
      return;
    }

    if (!window.FB) {
      setStatus('Facebook SDK not loaded yet.');
      return;
    }

    // Initialize the SDK with the Platform's App ID
    window.FB.init({
      appId: metaAppId,
      cookie: true,
      xfbml: true,
      version: 'v20.0'
    });

    setStatus(`Iniciando o Cadastro Incorporado (Embedded Signup) para o cliente ${clientId}...`);

    // Launch Embedded Signup
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          setStatus(`Sucesso! Access Token obtido. Redirecionando para trocar o token no backend...`);
          console.log('Access Token:', accessToken);
          
          // Here you would typically send the access token to your backend
          // to exchange it for a long-lived system user token and fetch the WABA ID.
          // e.g. apiFetch('/v1/meta-credentials', { ... })
          
        } else {
          setStatus('O usuário cancelou o login ou não autorizou totalmente.');
        }
      },
      {
        scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
        extras: {
          feature: 'whatsapp_embedded_signup',
          version: 2,
          sessionInfoVersion: 2,
        }
      }
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" /> Available Channels
        </h2>
        <p className="text-slate-500 mt-1">
          Connect your favorite channels to start engaging with your customers.
        </p>
      </div>

      {!metaAppId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <strong>Atenção:</strong> Nenhum Meta App configurado no ambiente. Defina a variável META_APP_ID no .env.
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm max-w-xl">
          <label className="block text-sm font-semibold text-slate-900 mb-2">Selecionar Cliente:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          >
            <option value="">-- Selecione o Cliente --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" className="w-14 h-14 text-green-500" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">WhatsApp Business API</h3>
          <p className="text-slate-500 text-sm mb-8 flex-1">
            Connect with your customers on WhatsApp using the official Business API.
          </p>
          <button 
            onClick={launchSignup}
            disabled={!sdkLoaded || (user?.role === 'admin' && !selectedClient)}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Connect
          </button>
        </div>

        {/* Instagram Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm opacity-60">
          <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-6 p-[2px]">
             <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
             </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Instagram Direct</h3>
          <p className="text-slate-500 text-sm mb-8 flex-1">
            Engage with your audience and manage conversations via Instagram Direct.
          </p>
          <button disabled className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl opacity-50 cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        {/* Messenger Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm opacity-60">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" className="w-14 h-14 text-blue-500" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.488 5.503 3.824 7.153v3.42c0 .408.455.65.803.435l3.524-2.146c1.17.324 2.472.502 3.849.502 5.523 0 10-4.145 10-9.258C24 6.145 19.523 2 12 2zm1.094 12.67l-2.825-3.003-5.508 3.003 6.046-6.425 2.894 3.003 5.438-3.003-6.045 6.425z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Facebook Messenger</h3>
          <p className="text-slate-500 text-sm mb-8 flex-1">
            Connect with your customers and reply to messages on Facebook Messenger.
          </p>
          <button disabled className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl opacity-50 cursor-not-allowed">
            Coming Soon
          </button>
        </div>
      </div>

      {status && (
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800 font-mono break-all mt-6 shadow-sm">
          {status}
        </div>
      )}

      {/* Bottom Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between mt-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-slate-900 font-semibold text-sm">Don't see the channel you need?</h4>
            <p className="text-slate-500 text-sm">We're always adding new integrations. Let us know what you'd like to see next!</p>
          </div>
        </div>
        <button className="px-6 py-2 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-medium rounded-xl transition-colors text-sm shadow-sm">
          Request a Channel
        </button>
      </div>
    </div>
  );
}
