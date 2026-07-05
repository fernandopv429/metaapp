import { useState } from 'react';
import { Users } from 'lucide-react';

export default function ClientsView({ clients, fetchClients }: { clients: any[], fetchClients: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" /> SaaS Clients
        </h2>
      </div>

      <form onSubmit={async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        try {
          await fetch('/v1/clients', {
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
      }} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-medium text-neutral-300 border-b border-neutral-800 pb-2">Add New Client</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required name="id" placeholder="Client ID (e.g. client_001)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <input required name="name" placeholder="Company Name" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <button disabled={isLoading} type="submit" className="w-full py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-400 transition-colors">
          {isLoading ? 'Adding...' : 'Add Client'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length === 0 ? (
          <div className="col-span-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl text-center text-neutral-500">
            No clients added yet.
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
              <h3 className="font-medium text-white">{client.name}</h3>
              <p className="text-xs text-neutral-500 mt-1 font-mono">ID: {client.id}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
