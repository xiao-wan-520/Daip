import React, { useState } from 'react';
import { ServerConfig } from '../types';
import { SERVER_LIST } from '../constants';

interface LoginProps {
  onLogin: (nickname: string, server: ServerConfig) => void;
  existingNicknames: string[];
}

const Login: React.FC<LoginProps> = ({ onLogin, existingNicknames }) => {
  const [nickname, setNickname] = useState('');
  const [selectedServerId, setSelectedServerId] = useState(SERVER_LIST[0].id);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (existingNicknames.includes(nickname.trim())) {
      setError('该昵称已存在，请更换一个');
      return;
    }

    const server = SERVER_LIST.find(s => s.id === selectedServerId);
    if (server) {
      onLogin(nickname.trim(), server);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            DaiP 智能聊天
          </h1>
          <p className="text-slate-400 text-sm">局域网多媒体互动平台</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Nickname Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              用户昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="给自己起个响亮的名字"
              maxLength={12}
            />
          </div>

          {/* Server Selection */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              服务器节点
            </label>
            <div className="relative">
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full appearance-none bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {SERVER_LIST.map((server) => (
                  <option key={server.id} value={server.id} className="bg-slate-900">
                    {server.name} ({server.address})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            进入房间
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;