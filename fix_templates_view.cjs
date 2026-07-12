const fs = require('fs');
let code = fs.readFileSync('src/components/TemplatesView.tsx', 'utf-8');

code = code.replace(/import \{ useAuth \} from '\.\.\/context\/AuthContext';/, 'import { apiFetch } from "../lib/api";');

code = code.replace(/export default function TemplatesView\(\) \{/, 'export default function TemplatesView({ clients: propClients, user }: { clients: any[], user: any }) {');

code = code.replace(/const \{ user, apiFetch \} = useAuth\(\);/, '');

code = code.replace(/const \[clients, setClients\] = useState<any\[\]>\(\[\]\);/, 'const [clients, setClients] = useState<any[]>(propClients || []);');

fs.writeFileSync('src/components/TemplatesView.tsx', code);
