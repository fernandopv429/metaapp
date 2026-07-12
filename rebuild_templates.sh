#!/bin/bash
cat << 'INNER_EOF' > src/components/TemplatesView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutTemplate, Plus, Check, RefreshCw, Smartphone, Key, Tag } from 'lucide-react';

export default function TemplatesView() {
  const { user, apiFetch } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Advanced form state
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('pt_BR');
  
  // Sub-types for Marketing/Utility
  const [subType, setSubType] = useState<'STANDARD' | 'CATALOG' | 'FLOWS' | 'ORDER_DETAILS' | 'CALL_PERMISSION'>('STANDARD');
  
  // Auth specific
  const [authType, setAuthType] = useState<'ZERO_TAP' | 'COPY_CODE'>('ZERO_TAP');
  
  // Components
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  
  // Buttons (Advanced)
  const [buttons, setButtons] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient || user?.role !== 'admin') {
      fetchTemplates();
    }
  }, [selectedClient, user]);

  const fetchClients = async () => {
    try {
      const res = await apiFetch('/v1/clients');
      const data = await res.json();
      setClients(data);
      if (user?.role !== 'admin' && data.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch(`/v1/templates?company_id=${selectedClient}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset form when category changes
  useEffect(() => {
    if (category === 'AUTHENTICATION') {
      setBodyText('{{1}} is your verification code. For your security, do not share this code.');
      setFooterText('');
      setHeaderType('NONE');
      setHeaderText('');
      setButtons([{ type: 'OTP', otp_type: authType === 'ZERO_TAP' ? 'ZERO_TAP' : 'COPY_CODE' }]);
    } else {
      setBodyText('');
      setButtons([]);
    }
  }, [category, authType]);

  const handleAddButton = (type: string) => {
    if (buttons.length >= 3) return;
    if (type === 'QUICK_REPLY') {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Novo Botão' }]);
    } else if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Acessar Site', url: 'https://' }]);
    } else if (type === 'PHONE_NUMBER') {
      setButtons([...buttons, { type: 'PHONE_NUMBER', text: 'Ligar', phone_number: '+55' }]);
    }
  };

  const updateButton = (index: number, field: string, value: string) => {
    const newBtns = [...buttons];
    newBtns[index][field] = value;
    setButtons(newBtns);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const components: any[] = [];
    
    if (headerType === 'TEXT' && headerText) {
      components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
    } else if (headerType !== 'NONE') {
      components.push({ type: 'HEADER', format: headerType });
    }

    if (bodyText) {
      components.push({ type: 'BODY', text: bodyText });
    }

    if (footerText) {
      components.push({ type: 'FOOTER', text: footerText });
    }

    if (buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map(b => {
          if (b.type === 'OTP') {
            return { type: 'OTP', otp_type: b.otp_type };
          }
          if (b.type === 'URL') {
            return { type: 'URL', text: b.text, url: b.url };
          }
          if (b.type === 'PHONE_NUMBER') {
            return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
          }
          return { type: 'QUICK_REPLY', text: b.text };
        })
      });
    }

    try {
      await apiFetch('/v1/templates', {
        method: 'POST',
        body: JSON.stringify({
          companyId: selectedClient,
          templateName,
          category,
          language,
          componentsJson: components
        })
      });
      setShowCreate(false);
      setTemplateName('');
      setBodyText('');
      setHeaderText('');
      setFooterText('');
      setButtons([]);
      fetchTemplates();
    } catch (e: any) {
      alert(e.message || 'Erro ao criar template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await apiFetch('/v1/templates/sync', { method: 'POST', body: JSON.stringify({ companyId: selectedClient }) });
      fetchTemplates();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-indigo-600" /> Templates do WhatsApp
          </h2>
          <p className="text-slate-500 mt-1">
            Gerencie e crie modelos de mensagem para campanhas e notificações.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            disabled={!selectedClient || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Sincronizar
          </button>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            disabled={!selectedClient}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Novo Modelo
          </button>
        </div>
      </div>

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

      {selectedClient && (
        <div className="space-y-6">
          {showCreate && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <form onSubmit={handleCreateTemplate} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Configurar seu modelo</h3>
                  <p className="text-sm text-slate-500 mb-4">Escolha a categoria que melhor descreve seu modelo de mensagem.</p>
                  
                  {/* Category Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${category === cat ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {cat === 'MARKETING' && <Tag className="w-4 h-4" />}
                        {cat === 'UTILITY' && <LayoutTemplate className="w-4 h-4" />}
                        {cat === 'AUTHENTICATION' && <Key className="w-4 h-4" />}
                        {cat === 'MARKETING' ? 'Marketing' : cat === 'UTILITY' ? 'Utilidade' : 'Autenticação'}
                      </button>
                    ))}
                  </div>

                  {/* Subtypes */}
                  {category !== 'AUTHENTICATION' && (
                    <div className="space-y-3 mb-6">
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${subType === 'STANDARD' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" checked={subType === 'STANDARD'} onChange={() => setSubType('STANDARD')} className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900">Padrão</div>
                          <div className="text-sm text-slate-500">Envie mensagens com mídia e botões personalizados para engajar seus clientes.</div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors opacity-60`}>
                        <input type="radio" disabled className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900">Catálogo</div>
                          <div className="text-sm text-slate-500">Envie mensagens para aumentar as vendas conectando seu catálogo de produtos.</div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors opacity-60`}>
                        <input type="radio" disabled className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900">Flows</div>
                          <div className="text-sm text-slate-500">Envie um formulário para coletar interesses dos clientes.</div>
                        </div>
                      </label>
                    </div>
                  )}

                  {category === 'AUTHENTICATION' && (
                    <div className="space-y-3 mb-6">
                      <h4 className="font-semibold text-slate-900 text-sm mb-2">Configuração de entrega do código</h4>
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${authType === 'ZERO_TAP' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" checked={authType === 'ZERO_TAP'} onChange={() => setAuthType('ZERO_TAP')} className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900">Preenchimento automático de zero toque</div>
                          <div className="text-sm text-slate-500">O toque zero enviará o código automaticamente sem exigir que seu cliente toque em um botão.</div>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${authType === 'COPY_CODE' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" checked={authType === 'COPY_CODE'} onChange={() => setAuthType('COPY_CODE')} className="mt-1" />
                        <div>
                          <div className="font-semibold text-slate-900">Copiar código</div>
                          <div className="text-sm text-slate-500">Adiciona um botão para copiar o código.</div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Modelo</label>
                    <input required value={templateName} onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="ex: promocao_verao_1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Idioma</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                      <option value="pt_BR">Português (BR)</option>
                      <option value="en_US">English (US)</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>

                {category !== 'AUTHENTICATION' && (
                  <>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cabeçalho (Opcional)</label>
                        <select value={headerType} onChange={(e) => setHeaderType(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 mb-2">
                          <option value="NONE">Nenhum</option>
                          <option value="TEXT">Texto</option>
                          <option value="IMAGE">Imagem (Mídia)</option>
                          <option value="VIDEO">Vídeo (Mídia)</option>
                          <option value="DOCUMENT">Documento (Mídia)</option>
                        </select>
                        {headerType === 'TEXT' && (
                          <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Texto do cabeçalho" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900" />
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Corpo da Mensagem (Obrigatório)</label>
                  <textarea 
                    required 
                    value={bodyText} 
                    onChange={(e) => setBodyText(e.target.value)} 
                    disabled={category === 'AUTHENTICATION'}
                    placeholder="Texto principal da mensagem. Use {{1}}, {{2}} para variáveis." 
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none disabled:opacity-70 disabled:bg-slate-100" 
                  />
                  {category !== 'AUTHENTICATION' && <p className="text-xs text-slate-500 mt-1">Dica: Adicione variáveis usando colchetes duplos, ex: Olá, {"{{1}}"}!</p>}
                </div>

                {category !== 'AUTHENTICATION' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rodapé (Opcional)</label>
                    <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texto pequeno no fim da mensagem" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
                  </div>
                )}

                {category !== 'AUTHENTICATION' && (
                  <div className="space-y-3 border-t pt-4">
                    <label className="block text-sm font-medium text-slate-700">Botões</label>
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">{btn.type}</span>
                          <button type="button" onClick={() => removeButton(idx)} className="text-red-500 text-xs font-semibold">Remover</button>
                        </div>
                        <input value={btn.text} onChange={(e) => updateButton(idx, 'text', e.target.value)} placeholder="Texto do botão" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                        {btn.type === 'URL' && (
                          <input value={btn.url} onChange={(e) => updateButton(idx, 'url', e.target.value)} placeholder="https://..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <input value={btn.phone_number} onChange={(e) => updateButton(idx, 'phone_number', e.target.value)} placeholder="+5511999999999" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900" />
                        )}
                      </div>
                    ))}
                    {buttons.length < 3 && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleAddButton('QUICK_REPLY')} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"> + Quick Reply</button>
                        <button type="button" onClick={() => handleAddButton('URL')} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"> + Link</button>
                        <button type="button" onClick={() => handleAddButton('PHONE_NUMBER')} className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"> + Ligar</button>
                      </div>
                    )}
                  </div>
                )}

                <button disabled={isLoading || !templateName} type="submit" className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 mt-4">
                  {isLoading ? 'Creating...' : 'Salvar e Enviar para Aprovação'}
                </button>
              </form>

              {/* Pré-visualização do Modelo */}
              <div className="flex justify-center items-center py-4 bg-slate-50 rounded-2xl border border-slate-100 h-full">
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
                    <div className="flex justify-start mt-4">
                      <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm p-1.5 shadow-sm border border-gray-100 relative">
                        
                        {headerType === 'IMAGE' && <div className="w-full h-32 bg-slate-200 rounded-lg mb-2 flex items-center justify-center text-slate-400 text-xs">Imagem</div>}
                        {headerType === 'VIDEO' && <div className="w-full h-32 bg-slate-200 rounded-lg mb-2 flex items-center justify-center text-slate-400 text-xs">Vídeo</div>}
                        {headerType === 'DOCUMENT' && <div className="w-full p-3 bg-red-50 rounded-lg mb-2 flex items-center gap-2 text-red-500 font-bold text-xs"><Tag className="w-4 h-4"/> Documento.pdf</div>}
                        
                        <div className="px-2 py-1 text-[13px] text-slate-800 flex flex-col gap-1 leading-snug">
                          {headerType === 'TEXT' && headerText && <div className="font-bold text-slate-900 text-sm mb-1">{headerText}</div>}
                          <div className="whitespace-pre-wrap">{bodyText || 'Digite o texto da sua mensagem...'}</div>
                          {footerText && <div className="text-[11px] text-slate-500 mt-1">{footerText}</div>}
                        </div>
                        
                        {buttons.length > 0 && (
                          <div className="mt-2 flex flex-col gap-0 border-t border-gray-100">
                            {buttons.map((btn, i) => (
                              <button key={i} className="w-full py-2.5 text-[#00a884] text-[13px] font-medium flex items-center justify-center gap-2 border-b border-gray-100 last:border-0 hover:bg-slate-50">
                                {btn.type === 'OTP' ? <Key className="w-4 h-4" /> : null}
                                {btn.type === 'URL' ? <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> : null}
                                {btn.type === 'QUICK_REPLY' ? <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> : null}
                                {btn.type === 'OTP' ? (authType === 'ZERO_TAP' ? 'Preenchimento automático' : 'Copiar código') : btn.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* iOS Chat Input Footer */}
                  <div className="bg-[#f6f6f6] p-3 flex items-center gap-3 z-0 border-t border-gray-200">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 pb-0.5 font-bold">+</div>
                    <div className="flex-1 h-8 bg-white border border-gray-300 rounded-full"></div>
                    <Smartphone className="text-blue-500 w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-500 shadow-sm">
                Nenhum modelo encontrado para este cliente.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-bold text-slate-900">{tpl.templateName}</h3>
                    <div className="flex gap-2 text-xs mt-2">
                      <span className={`px-2.5 py-1 rounded-md font-medium ${tpl.category === 'MARKETING' ? 'bg-purple-100 text-purple-700' : tpl.category === 'UTILITY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {tpl.category}
                      </span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-medium">{tpl.language}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm text-slate-700 font-mono whitespace-pre-wrap">
                    {Array.isArray(tpl.componentsJson) && tpl.componentsJson.map((comp: any, i: number) => (
                      <div key={i} className="mb-3 last:mb-0">
                        <span className="text-indigo-400 text-[10px] uppercase font-bold block mb-1 tracking-wider">{comp.type}</span>
                        {comp.text}
                        {comp.buttons?.map((b:any, j:number) => (
                           <div key={j} className="text-xs mt-1 text-slate-500 ml-2">[{b.type}] {b.text || b.otp_type}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${tpl.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : tpl.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
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
INNER_EOF
chmod +x rebuild_templates.sh
./rebuild_templates.sh
