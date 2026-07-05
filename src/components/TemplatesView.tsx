import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

export default function TemplatesView({ clients }: { clients: any[] }) {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [selectedClient]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/v1/whatsapp-templates/${selectedClient}`);
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-400" /> WhatsApp Templates
        </h2>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
        <label className="block text-sm font-medium text-neutral-300">Select Client</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          <option value="">-- Choose a Client --</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedClient && (
        <div className="space-y-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            const form = e.currentTarget;
            const formData = new FormData(form);
            try {
              await fetch('/v1/whatsapp-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyId: selectedClient,
                  templateName: formData.get('templateName'),
                  language: formData.get('language'),
                  category: formData.get('category'),
                  status: 'DRAFT',
                  componentsJson: {}
                })
              });
              form.reset();
              fetchTemplates();
            } catch (err) {
              console.error(err);
            }
            setIsLoading(false);
          }} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-neutral-300 border-b border-neutral-800 pb-2">Create New Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input required name="templateName" placeholder="Template Name (e.g. hello_world)" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500" />
              <select required name="category" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
                <option value="MARKETING">MARKETING</option>
                <option value="UTILITY">UTILITY</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
              <select required name="language" className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
                <option value="en_US">en_US</option>
                <option value="pt_BR">pt_BR</option>
                <option value="es_ES">es_ES</option>
              </select>
            </div>
            <button disabled={isLoading} type="submit" className="w-full py-2 bg-teal-500 text-black text-sm font-medium rounded-lg hover:bg-teal-400 transition-colors">
              {isLoading ? 'Creating...' : 'Create Template'}
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full bg-neutral-900 border border-neutral-800 p-8 rounded-xl text-center text-neutral-500">
                No templates for this client yet.
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-2">
                  <h3 className="font-medium text-white">{tpl.templateName}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">{tpl.category}</span>
                    <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-400">{tpl.language}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${tpl.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
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
