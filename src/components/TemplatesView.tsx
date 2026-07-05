import React from "react";
import { apiFetch } from "../lib/api";
import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';

export default function TemplatesView({ clients, user }: { clients: any[], user: any }) {
  const [selectedClient, setSelectedClient] = useState<string>(user?.role === 'admin' ? '' : (user?.companyId || user?.id?.toString() || ''));
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Template form state
  const [bodyText, setBodyText] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttonsText, setButtonsText] = useState('');

  useEffect(() => {
    if (selectedClient) {
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [selectedClient]);

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch(`/v1/templates?company_id=${selectedClient}`);
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Build the Meta Cloud API compatible components JSON
    const componentsJson: any[] = [
      { type: 'BODY', text: bodyText }
    ];
    if (headerText.trim()) {
      componentsJson.push({ type: 'HEADER', format: 'TEXT', text: headerText });
    }
    if (footerText.trim()) {
      componentsJson.push({ type: 'FOOTER', text: footerText });
    }
    
    // Add QUICK_REPLY button if buttons text is provided
    if (buttonsText.trim()) {
      componentsJson.push({
        type: 'BUTTONS',
        buttons: [{ type: 'QUICK_REPLY', text: buttonsText }]
      });
    }

    try {
      await apiFetch('/v1/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedClient,
          templateName: formData.get('templateName'),
          language: formData.get('language'),
          category: formData.get('category'),
          status: 'DRAFT',
          componentsJson
        })
      });
      form.reset();
      setBodyText('');
      setHeaderText('');
      setFooterText('');
      setButtonsText('');
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/v1/templates/sync', { method: 'POST', body: JSON.stringify({ companyId: selectedClient }) });
      await fetchTemplates();
    } catch(e) {}
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" /> WhatsApp Message Templates
          </h2>
          <p className="text-slate-500 mt-1">
            Create and manage approved message templates for WhatsApp Business API.
          </p>
        </div>
        {selectedClient && (
          <button 
            onClick={handleSync}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync from Meta'}
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm max-w-xl">
        {user?.role === 'admin' && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Select Client</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            >
              <option value="">-- Choose a Client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
            {/* Form Column */}
            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Create New Template</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Modelo (sem espaços)</label>
                  <input required name="templateName" placeholder="ex: alerta_promocao_01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <select required name="category" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                      <option value="MARKETING">MARKETING</option>
                      <option value="UTILITY">UTILITY</option>
                      <option value="AUTHENTICATION">AUTHENTICATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Idioma</label>
                    <select required name="language" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                      <option value="pt_BR">pt_BR</option>
                      <option value="en_US">en_US</option>
                      <option value="es_ES">es_ES</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-5 border-t border-slate-100 pt-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cabeçalho (Opcional)</label>
                  <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Texto do cabeçalho" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Corpo da Mensagem (Obrigatório)</label>
                  <textarea required value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="Texto principal da mensagem. Use {{1}}, {{2}} para variáveis." className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rodapé (Opcional)</label>
                  <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texto do rodapé" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Botão (Quick Reply) (Opcional)</label>
                  <input value={buttonsText} onChange={(e) => setButtonsText(e.target.value)} placeholder="Texto do botão" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                </div>
              </div>

              <button disabled={isLoading} type="submit" className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                {isLoading ? 'Creating...' : 'Salvar e Sincronizar com a Meta'}
              </button>
            </form>

            {/* Coluna de Exemplo */}
            <div className="flex justify-center items-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative w-[320px] h-[640px] bg-white border-[10px] border-slate-800 rounded-[3rem] overflow-hidden shadow-xl flex flex-col">
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-10">
                  <div className="w-32 h-6 bg-slate-800 rounded-b-2xl"></div>
                </div>
                
                {/* iOS Status Bar + Header */}
                <div className="bg-[#f6f6f6] pt-10 pb-2 px-4 flex items-center justify-between z-0 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-blue-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </div>
                  <div className="flex gap-4 text-blue-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                </div>

                {/* Chat Canvas */}
                <div className="flex-1 bg-[#efeae2] bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] p-4 overflow-y-auto flex flex-col gap-3 relative">
                  {/* Mock Message Bubble */}
                  <div className="flex justify-start mt-4">
                    <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm p-1.5 shadow-sm border border-gray-100 relative">
                      <div className="px-2 py-1 text-[13px] text-slate-800 flex flex-col gap-1 leading-snug">
                        {headerText && <div className="font-bold text-slate-900">{headerText}</div>}
                        <div className="whitespace-pre-wrap">{bodyText || 'Olá, [Nome do contato]!\nTemos novidades para você!\n\nDigite o texto da sua mensagem...'}</div>
                        {footerText && <div className="text-[11px] text-slate-500 mt-1">{footerText}</div>}
                      </div>
                      
                      {buttonsText && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
                          <button className="w-full py-1.5 text-[#00a884] text-sm font-medium flex items-center justify-center gap-1">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            {buttonsText}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* iOS Chat Input Footer */}
                <div className="bg-[#f6f6f6] p-3 flex items-center gap-3 z-0 border-t border-gray-200">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 pb-0.5 font-bold">+</div>
                  <div className="flex-1 h-8 bg-white border border-gray-300 rounded-full"></div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-500 shadow-sm">
                No templates for this client yet.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-bold text-slate-900">{tpl.templateName}</h3>
                    <div className="flex gap-2 text-xs mt-2">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-medium">{tpl.category}</span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-medium">{tpl.language}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-700 font-mono whitespace-pre-wrap">
                    {Array.isArray(tpl.componentsJson) && tpl.componentsJson.map((comp: any, i: number) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <span className="text-indigo-400 text-[10px] uppercase font-bold block mb-1 tracking-wider">{comp.type}</span>
                        {comp.text}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${tpl.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {tpl.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
