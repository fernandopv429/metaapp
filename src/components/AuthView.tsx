import React from "react";
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { MessageCircle } from 'lucide-react';

export default function AuthView({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = '/v1/auth/login';
    const body = { email, password };
    
    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch(err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-8 flex items-center gap-2">
        <MessageCircle className="w-10 h-10 text-indigo-600 fill-indigo-600" />
        <span className="text-3xl font-bold text-slate-900">Nexus <span className="text-indigo-600">Hub</span></span>
      </div>
      
      <div className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          Sign in to your account
        </h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm border border-red-100">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors mt-2">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
