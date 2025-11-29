import React, { useState, useEffect, useRef } from 'react';
import { User, Message, MessageType, ServerConfig } from '../types';
import { AI_CONFIG, MOVIE_BOT_CONFIG, VIDEO_PARSER_URL, BROADCAST_CHANNEL_NAME } from '../constants';
import { sendMessageToAi } from '../services/aiService';

interface ChatRoomProps {
  currentUser: User;
  serverConfig: ServerConfig;
  onLogout: () => void;
}

// Simple Emoji List
const EMOJIS = ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤓', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '🤔', '👀'];

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, serverConfig, onLogout }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<User[]>([currentUser]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Construct a unique channel name based on the Server ID to isolate nodes
  const channelName = `${BROADCAST_CHANNEL_NAME}_${serverConfig.id}`;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // Network & Heartbeat Logic
  useEffect(() => {
    console.log(`Joining Channel: ${channelName}`);
    channelRef.current = new BroadcastChannel(channelName);

    // Initial announcement
    channelRef.current.postMessage({ type: 'USER_JOIN', user: currentUser });

    channelRef.current.onmessage = (event) => {
      const data = event.data;

      if (data.type === 'NEW_MESSAGE') {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.type === 'USER_JOIN' || data.type === 'HEARTBEAT') {
        // Update user list logic
        setOnlineUsers((prev) => {
           const existingIndex = prev.findIndex(u => u.id === data.user.id);
           if (existingIndex !== -1) {
             // Update existing user timestamp
             const newUsers = [...prev];
             newUsers[existingIndex] = { ...data.user, lastSeen: Date.now() };
             return newUsers;
           }
           // Add new user
           return [...prev, { ...data.user, lastSeen: Date.now() }];
        });
      }
    };

    // 1. FAST HEARTBEAT LOOP (Every 1 second)
    const heartbeatInterval = setInterval(() => {
      channelRef.current?.postMessage({ 
        type: 'HEARTBEAT', 
        user: { ...currentUser, lastSeen: Date.now() } 
      });
    }, 1000);

    // 2. FAST CLEANUP LOOP (Every 2 seconds)
    // Removes users who haven't sent a heartbeat in 3 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setOnlineUsers(prev => {
        return prev.filter(u => {
          // Always keep self
          if (u.id === currentUser.id) return true;
          // Keep if seen recently (within 3000ms)
          return (now - (u.lastSeen || 0)) < 3000;
        });
      });
    }, 2000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);
      channelRef.current?.close();
    };
  }, [currentUser, channelName]);

  // Initial welcome message
  useEffect(() => {
    const welcomeMsg: Message = {
      id: 'system-welcome',
      senderId: 'system',
      senderName: '系统',
      avatar: '',
      content: `欢迎 ${currentUser.nickname} 加入 [${serverConfig.name}]！`,
      type: MessageType.SYSTEM,
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
  }, [currentUser.nickname, serverConfig.name]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const rawContent = inputText.trim();
    const messageId = Date.now().toString();
    
    // User message is ALWAYS text now. The Bots will reply with specialized content.
    const newMessage: Message = {
      id: messageId,
      senderId: currentUser.id,
      senderName: currentUser.nickname,
      avatar: currentUser.avatar,
      content: rawContent,
      type: MessageType.TEXT,
      timestamp: Date.now(),
    };

    // Update local state and broadcast
    setMessages((prev) => [...prev, newMessage]);
    channelRef.current?.postMessage({ type: 'NEW_MESSAGE', message: newMessage });
    setInputText('');
    setShowEmojiPicker(false);

    // --- Intelligent Bot Logic ---

    // 1. Check for @电影 command (Movie Bot)
    if (rawContent.startsWith('@电影')) {
      // Robust extraction: Remove '@电影', remove optional '播放', then trim.
      const rawUrl = rawContent.replace('@电影', '').replace(/播放/g, '').trim();
      
      if (rawUrl) {
        // Simulate "typing" delay for the bot
        setTimeout(() => {
          const movieBotMsg: Message = {
            id: Date.now().toString() + '-movie',
            senderId: 'movie-bot',
            senderName: MOVIE_BOT_CONFIG.NAME,
            avatar: MOVIE_BOT_CONFIG.AVATAR,
            content: `为您播放: ${rawUrl}`,
            type: MessageType.VIDEO,
            videoUrl: VIDEO_PARSER_URL + rawUrl,
            timestamp: Date.now(),
            isAi: true
          };
          
          setMessages((prev) => [...prev, movieBotMsg]);
          channelRef.current?.postMessage({ type: 'NEW_MESSAGE', message: movieBotMsg });
        }, 600);
      }
      return; // Exit, don't trigger AI if it's a movie command
    }

    // 2. Check for @川小农 command (AI Bot)
    const aiRegex = /^@川小农\s*(.*)$/;
    const aiMatch = rawContent.match(aiRegex);

    if (aiMatch) {
      setIsAiThinking(true);
      const query = aiMatch[1] || '你好';
      
      try {
        const aiResponseText = await sendMessageToAi(query);
        
        const aiMessage: Message = {
          id: Date.now().toString() + '-ai',
          senderId: 'ai-bot',
          senderName: AI_CONFIG.BOT_NAME,
          avatar: AI_CONFIG.BOT_AVATAR,
          content: aiResponseText,
          type: MessageType.TEXT,
          timestamp: Date.now(),
          isAi: true
        };

        setMessages((prev) => [...prev, aiMessage]);
        channelRef.current?.postMessage({ type: 'NEW_MESSAGE', message: aiMessage });
      } finally {
        setIsAiThinking(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const insertCommand = (command: string) => {
    setInputText((prev) => {
      if (!prev) return command + ' ';
      return prev.trim() + ' ' + command + ' ';
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 10);
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (User List) */}
      <aside className={`
        fixed md:relative z-50 w-64 h-full bg-slate-950 border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center h-16 shrink-0">
          <h2 className="font-bold text-lg text-slate-200">聊天室成员</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Bots Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">智能助手</h3>
            <div className="space-y-2">
              {/* AI Bot */}
              <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-indigo-500/30">
                 <img src={AI_CONFIG.BOT_AVATAR} alt="AI" className="w-10 h-10 rounded-full border border-indigo-500/50 object-cover" />
                 <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-300">{AI_CONFIG.BOT_NAME}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                       <span className="text-xs text-indigo-400/80">对话模型</span>
                    </div>
                 </div>
              </div>
              
              {/* Movie Bot */}
              <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-pink-500/30">
                 <img src={MOVIE_BOT_CONFIG.AVATAR} alt="Movie" className="w-10 h-10 rounded-full border border-pink-500/50 object-cover" />
                 <div className="flex-1">
                    <p className="text-sm font-medium text-pink-300">{MOVIE_BOT_CONFIG.NAME}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                       <span className="text-xs text-pink-400/80">视频解析</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Online Users Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">在线用户</h3>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md">{onlineUsers.length}</span>
            </div>
            
            <div className="space-y-2">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 bg-slate-900/30 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <img src={user.avatar} alt={user.nickname} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {user.nickname} {user.id === currentUser.id && <span className="text-xs text-blue-400">(我)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-xs text-slate-500">
                         {user.id === currentUser.id ? '在线' : (user.lastSeen && Date.now() - user.lastSeen < 2000 ? '活跃' : '在线')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900/95 relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
            <div>
              <h1 className="font-bold text-slate-100">DaiP 公共聊天室</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                {serverConfig.name} ({serverConfig.address})
              </p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span className="hidden sm:inline">退出</span>
          </button>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSystem = msg.type === MessageType.SYSTEM;
            // Determine bot type for styling
            const isAiBot = msg.senderId === 'ai-bot';
            const isMovieBot = msg.senderId === 'movie-bot';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="bg-slate-800/80 text-slate-400 text-xs py-1 px-3 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <img 
                  src={msg.avatar} 
                  alt={msg.senderName} 
                  className={`
                    w-10 h-10 rounded-full flex-shrink-0 object-cover border bg-slate-800
                    ${isAiBot ? 'border-indigo-500/50' : (isMovieBot ? 'border-pink-500/50' : 'border-slate-700')}
                  `} 
                />
                <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                     <span className={`text-xs font-medium ${isMe ? 'text-blue-400' : (isAiBot ? 'text-indigo-400' : (isMovieBot ? 'text-pink-400' : 'text-slate-400'))}`}>
                        {msg.senderName}
                     </span>
                     <span className="text-[10px] text-slate-600">
                       {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                  </div>
                  
                  <div className={`
                    rounded-2xl px-4 py-3 shadow-sm break-all
                    ${isMe 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : (isAiBot 
                          ? 'bg-indigo-600 text-white rounded-tl-sm' 
                          : (isMovieBot 
                              ? 'bg-slate-800 border border-pink-500/20 text-white rounded-tl-sm' 
                              : 'bg-slate-800 text-slate-200 rounded-tl-sm')
                        )
                    }
                  `}>
                    {msg.type === MessageType.VIDEO && msg.videoUrl ? (
                      <div className="space-y-2">
                        <p className="text-sm opacity-90 mb-2 border-b border-white/10 pb-2">
                          <span className="font-bold text-pink-300">🎬 正在播放:</span> {msg.content}
                        </p>
                        <div className="rounded-lg overflow-hidden bg-black aspect-square w-full min-w-[300px] max-w-[400px] h-[300px] sm:h-[400px] shadow-lg">
                          <iframe
                            src={msg.videoUrl}
                            width="100%"
                            height="100%"
                            allowFullScreen
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                            title="Video Player"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isAiThinking && (
            <div className="flex gap-3">
               <img src={AI_CONFIG.BOT_AVATAR} alt="Bot" className="w-10 h-10 rounded-full border border-indigo-500/50" />
               <div className="flex flex-col">
                  <span className="text-xs text-indigo-400 mb-1 px-1">{AI_CONFIG.BOT_NAME}</span>
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2 mb-3 px-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => insertCommand('@川小农')}
              className="group flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            >
              <div className="relative">
                <img src={AI_CONFIG.BOT_AVATAR} className="w-4 h-4 rounded-full opacity-80 group-hover:opacity-100" alt="" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-slate-900"></span>
              </div>
              呼叫{AI_CONFIG.BOT_NAME}
            </button>
            
            <button
              onClick={() => insertCommand('@电影')}
              className="group flex items-center gap-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            >
               <div className="relative">
                <img src={MOVIE_BOT_CONFIG.AVATAR} className="w-4 h-4 rounded-full opacity-80 group-hover:opacity-100" alt="" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-slate-900"></span>
              </div>
              视频点播
            </button>
          </div>

          <div className="relative flex items-end gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
            
            {/* Emoji Trigger */}
            <div className="relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="插入表情"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 w-64 grid grid-cols-4 gap-2 z-50">
                  {EMOJIS.map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="text-2xl hover:bg-slate-700 p-2 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="absolute -bottom-2 left-4 w-4 h-4 bg-slate-800 border-b border-r border-slate-700 transform rotate-45"></div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，或使用上方快捷指令..."
              className="w-full bg-transparent text-slate-200 placeholder-slate-600 px-2 py-3 max-h-32 min-h-[44px] focus:outline-none resize-none"
              rows={1}
            />

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`
                p-2 rounded-lg transition-all mb-0.5
                ${inputText.trim() 
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
              title="发送消息 (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatRoom;