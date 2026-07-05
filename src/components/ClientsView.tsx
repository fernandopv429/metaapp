import { apiFetch } from "../lib/api";
import { useState } from 'react';
import { Users } from 'lucide-react';

export default function ClientsView({ clients, fetchClients }: { clients: any[], fetchClients: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> Clientes do Sistema
        </h2>
        <p className="text-slate-500 mt-1">
          Gerencie as empresas/clientes cadastradas no sistema.
        </p>
      </div>

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
      }} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm max-w-3xl space-y-6">
        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Adicionar Novo Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ID do Cliente</label>
            <input required name="id" placeholder="ex: cliente_001" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
            <input required name="name" placeholder="Nome da Empresa" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
          </div>
        </div>
        <button disabled={isLoading} type="submit" className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
          {isLoading ? 'Adicionando...' : 'Adicionar Cliente'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 p-12 rounded-3xl text-center text-slate-500 shadow-sm">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 text-lg">{client.name}</h3>
              <p className="text-sm text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg inline-block">ID: {client.id}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
