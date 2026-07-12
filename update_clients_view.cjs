const fs = require('fs');

const content = `import { apiFetch } from "../lib/api";
import { useState, useEffect } from 'react';
import { Users, Link, Key, Smartphone, Server } from 'lucide-react';

export default function ClientsView({ clients, fetchClients }: { clients: any[], fetchClients: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>('');
  
  // Creds form
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [destinationWebhookUrl, setDestinationWebhookUrl] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const res = await apiFetch('/v1/meta-credentials');
      if (res.ok) {
        setCredentials(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadClientCreds = (clientId: string) => {
    setSelectedClient(clientId);
    const cred = credentials.find(c => c.companyId === clientId);
    if (cred) {
      setPhoneNumberId(cred.phoneNumberId || cred.wabaId || '');
      setDestinationWebhookUrl(cred.destinationWebhookUrl || '');
    } else {
      setPhoneNumberId('');
      setDestinationWebhookUrl('');
    }
  };

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiFetch('/v1/meta-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedClient,
          phoneNumberId,
          destinationWebhookUrl
        })
      });
      alert('Configurações salvas com sucesso!');
      fetchCredentials();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> Clientes & Configurações de Webhook
        </h2>
        <p className="text-slate-500 mt-1">
          Gerencie as empresas e configure os roteamentos de webhook do WhatsApp para cada uma. As credenciais da Meta (Token, WABA, App ID) são globais e configuradas via painel de administração (variáveis de ambiente).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lado Esquerdo: Adicionar Cliente e Lista */}
        <div className="space-y-6">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            const form = e.currentTarget;
            const formData = new FormData(form);
            try {
              await apiFetch('/v1/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: formData.get('id'),
                  name: formData.get('name'),
                })
              });
              form.reset();
              fetchClients();
            } catch (err) {
              console.error(err);
            }
            setIsLoading(false);
          }} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Adicionar Novo Cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID do Cliente</label>
                <input required name="id" placeholder="ex: cliente_001" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                <input required name="name" placeholder="Nome da Empresa" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <button disabled={isLoading} type="submit" className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
              {isLoading ? 'Adicionando...' : 'Adicionar Cliente'}
            </button>
          </form>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Selecione um cliente para configurar:</h3>
            <div className="grid grid-cols-1 gap-4">
              {clients.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center text-slate-500 shadow-sm">
                  Nenhum cliente cadastrado ainda.
                </div>
              ) : (
                clients.map((client) => {
                  const hasCreds = credentials.some(c => c.companyId === client.id);
                  return (
                    <div 
                      key={client.id} 
                      onClick={() => loadClientCreds(client.id)}
                      className={\`cursor-pointer border p-5 rounded-2xl flex items-center justify-between transition-all \${selectedClient === client.id ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}\`}
                    >
                      <div>
                        <h3 className="font-bold text-slate-900">{client.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-1">ID: {client.id}</p>
                      </div>
                      {hasCreds ? (
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Configurado
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                          Pendente
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Configurações do Cliente */}
        <div>
          {selectedClient ? (
            <form onSubmit={handleSaveCreds} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6 sticky top-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900">Roteamento do Cliente</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Defina o número de telefone e a URL de destino (webhook do sistema do cliente) para: <strong>{selectedClient}</strong>
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Smartphone className="w-4 h-4 text-indigo-500" /> WhatsApp Phone Number ID
                  </label>
                  <p className="text-xs text-slate-500 mb-2">ID numérico do telefone configurado na Meta.</p>
                  <input required value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="ex: 123456789012345" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                    <Server className="w-4 h-4 text-indigo-500" /> Webhook de Destino (Obrigatório)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Para onde o Nexus Hub deve repassar as mensagens deste número?</p>
                  <input required value={destinationWebhookUrl} onChange={e => setDestinationWebhookUrl(e.target.value)} type="url" placeholder="https://seu-sistema.com.br/api/webhook/whatsapp" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <button disabled={isLoading} type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 mt-4">
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Nenhum Cliente Selecionado</h3>
              <p className="text-slate-500 mt-2 max-w-sm">
                Selecione um cliente na lista ao lado para configurar o roteamento de mensagens do WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function Check({className}: {className: string}) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> }
`;

fs.writeFileSync('src/components/ClientsView.tsx', content);
