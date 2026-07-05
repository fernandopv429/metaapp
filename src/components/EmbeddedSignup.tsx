import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

export default function EmbeddedSignup({ metaAppId, clients }: { metaAppId: string, clients: any[] }) {
  const [selectedClient, setSelectedClient] = useState<string>('');
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
    if (!selectedClient) {
      setStatus('Please select a client first.');
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

    setStatus(`Iniciando o Cadastro Incorporado (Embedded Signup) para o cliente ${selectedClient}...`);

    // Launch Embedded Signup
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          setStatus(`Sucesso! Access Token obtido. Redirecionando para trocar o token no backend...`);
          console.log('Access Token:', accessToken);
          
          // Here you would typically send the access token to your backend
          // to exchange it for a long-lived system user token and fetch the WABA ID.
          // e.g. fetch('/v1/meta-credentials', { ... })
          
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-400" /> WhatsApp Embedded Signup
        </h2>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-6 max-w-2xl">
        <p className="text-neutral-400 text-sm">
          O Cadastro Incorporado (Embedded Signup) permite que seus clientes conectem seus próprios números de WhatsApp Business diretamente através da sua plataforma, sem precisar ir ao painel da Meta.
        </p>

        {!metaAppId ? (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
            Atenção: Nenhum Meta App configurado no ambiente. Defina a variável META_APP_ID no .env.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Simular login como o Cliente:</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              >
                <option value="">-- Selecione o Cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={launchSignup}
              disabled={!sdkLoaded || !selectedClient}
              className="w-full py-3 bg-[#1877F2] text-white text-sm font-medium rounded-lg hover:bg-[#166FE5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Conectar WhatsApp com o Facebook
            </button>
          </div>
        )}

        {status && (
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 font-mono break-all">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
