import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Transaction, Bet, AppView, ChatMessage, BetWager, MarketPoint, Order, OrderType, OrderSide, Dare } from './types';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import { Button } from './components/Button';
import { Card } from './components/Card';
import MarketChart from './components/MarketChart';
import OrderBook from './components/OrderBook';
import { 
  Wallet, 
  Trophy, 
  ArrowRightLeft, 
  Gavel, 
  Sparkles, 
  LogOut, 
  Plus,
  TrendingUp,
  Users,
  CircleUser,
  Shield,
  Trash2,
  Edit2,
  Coins,
  RefreshCw,
  Clock,
  X,
  AlertCircle,
  Zap,
  Lock,
  Eye,
  Download,
  CheckCircle,
  List,
  Globe,
  Share2,
  Link as LinkIcon,
  RefreshCcw,
  Smartphone,
  Server,
  Wifi,
  Settings
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

// --- Sub-components ---

interface OracleViewProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onAsk: (question: string) => void;
}

const OracleView: React.FC<OracleViewProps> = ({ messages, isThinking, onAsk }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
      if(scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAsk(input);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                <Sparkles size={20} />
            </div>
            <div>
                <h3 className="font-bold text-slate-900">The Bean Oracle</h3>
                <p className="text-xs text-slate-500">Powered by Gemini 2.5 Flash</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isThinking && (
                <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl rounded-bl-sm text-sm italic animate-pulse">
                        Consulting the beans...
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 border border-slate-600 bg-slate-700 text-white rounded-full px-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
                    placeholder="Ask about the economy..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <Button type="submit" disabled={isThinking} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                    <ArrowRightLeft size={18} className={isThinking ? 'animate-spin' : ''} />
                </Button>
            </form>
        </div>
    </div>
  );
};

// --- Main Component ---

const App: React.FC = () => {
  // -- State --
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [dares, setDares] = useState<Dare[]>([]);
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(StorageService.getApiUrl());

  // BeanCoin & Exchange State
  const [marketHistory, setMarketHistory] = useState<MarketPoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(10);
  const [timeFrame, setTimeFrame] = useState<'10M' | '1H' | 'ALL'>('ALL');
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<{price: number, side: OrderSide} | null>(null);
  
  // Trading Form State
  const [tradeSide, setTradeSide] = useState<OrderSide>('BUY');
  const [tradeType, setTradeType] = useState<OrderType>('LIMIT');
  const [tradePrice, setTradePrice] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');


  // Oracle State
  const [oracleMessages, setOracleMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Greetings! I am the Bean Oracle. Ask me about the choir's finances or who is hoarding all the beans." }
  ]);
  const [isOracleThinking, setIsOracleThinking] = useState(false);

  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txRecipient, setTxRecipient] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [isTxSubmitting, setIsTxSubmitting] = useState(false);

  // Bet Modal State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [betTitle, setBetTitle] = useState('');
  const [betDesc, setBetDesc] = useState('');
  const [betOption1, setBetOption1] = useState('');
  const [betOption2, setBetOption2] = useState('');

  // Bet Placing State
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState('');
  const [wagerOptionId, setWagerOptionId] = useState('');

  // Dare Modal State (Creation)
  const [isDareModalOpen, setIsDareModalOpen] = useState(false);
  const [dareTargetId, setDareTargetId] = useState('');
  const [dareDesc, setDareDesc] = useState('');

  // Pledge Modal State
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [pledgeDareId, setPledgeDareId] = useState<string | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('');

  // Completion Modal State
  const [isCompleteDareModalOpen, setIsCompleteDareModalOpen] = useState(false);
  const [completionDareId, setCompletionDareId] = useState<string | null>(null);
  const [completionProof, setCompletionProof] = useState('');

  // Admin User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSection, setFormSection] = useState<'Tenor I' | 'Tenor II' | 'Baritone' | 'Bass' | 'Conductor'>('Tenor I');
  const [formBalance, setFormBalance] = useState('');
  const [formBeanCoinBalance, setFormBeanCoinBalance] = useState('');
  
  // Deployment State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Load Data
  useEffect(() => {
    const init = async () => {
        setConnectionAttempted(false);
        const success = await StorageService.resync();
        setConnectionAttempted(true);
        setIsConnected(success);
        
        if (success) {
            refreshData();
            const curUserId = StorageService.getCurrentUserId();
            if (curUserId) {
                const loadedUsers = StorageService.getUsers();
                const found = loadedUsers.find(u => u.id === curUserId);
                if (found) setCurrentUser(found);
            }
        }
    };

    init();

    // Subscribe to polling updates
    const unsubscribe = StorageService.subscribe(() => {
        setIsConnected(true);
        refreshData();
    });
    
    return () => { unsubscribe(); };
  }, []);

  // Effect to keep currentUser in sync with global state updates
  useEffect(() => {
      if (currentUser) {
          const found = users.find(u => u.id === currentUser.id);
          if (found && (found.balance !== currentUser.balance || found.beanCoinBalance !== currentUser.beanCoinBalance)) {
              setCurrentUser(found);
          }
      }
  }, [users, currentUser]);

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setTransactions(StorageService.getTransactions());
    setBets(StorageService.getBets());
    setDares(StorageService.getDares());
    setOrders(StorageService.getOrders());
    
    const hist = StorageService.getMarketHistory();
    setMarketHistory(hist);
    if (hist.length > 0) {
        setCurrentPrice(hist[hist.length - 1].price);
    }
  };

  const refreshUser = () => {
      if (!currentUser) return;
      const updatedUsers = StorageService.getUsers();
      const me = updatedUsers.find(u => u.id === currentUser.id);
      if (me) setCurrentUser(me);
      setUsers(updatedUsers);
  };

  // Filter history based on selected time frame. 
  const filteredHistory = useMemo(() => {
      const now = Date.now();
      if (timeFrame === 'ALL') return marketHistory;
      
      const cutoff = timeFrame === '10M' 
          ? now - 10 * 60 * 1000 // 10 mins
          : now - 60 * 60 * 1000; // 1 hour
          
      return marketHistory.filter(p => p.timestamp >= cutoff);
  }, [marketHistory, timeFrame]);

  // -- Handlers --

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.setApiUrl(serverUrl);
    setShowSettings(false);
    handleForceSync();
  };

  const handleResetSettings = () => {
      const emptyUrl = "";
      setServerUrl(emptyUrl);
      StorageService.setApiUrl(emptyUrl);
      setShowSettings(false);
      handleForceSync();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.length === 0) {
        alert("Cannot login: No users loaded from server. Is the server running?");
        return;
    }

    // Simple login: Match username
    const loadedUsers = StorageService.getUsers();
    let user = loadedUsers.find(u => u.username.toLowerCase() === loginUsername.toLowerCase());
    
    if (!user) {
        alert("User not found.");
        return;
    }

    // Password check
    if (user.password && user.password !== loginPassword) {
        alert("Incorrect password.");
        return;
    }
    
    StorageService.setCurrentUserId(user.id);
    setCurrentUser(user);
    setView(AppView.DASHBOARD);
    setLoginPassword('');
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  const handleForceSync = async () => {
      setIsSyncing(true);
      const success = await StorageService.resync();
      setIsConnected(success);
      setTimeout(() => {
          setIsSyncing(false);
          refreshData();
          refreshUser();
      }, 500);
  };

  const handleSendBeans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !txRecipient) return;

    setIsTxSubmitting(true);
    try {
      const amt = parseInt(txAmount);
      if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");

      // AI Enrichment
      const { category, emoji } = await GeminiService.categorizeTransaction(txDesc);
      const enrichedDesc = `${emoji} ${txDesc} #${category}`;

      await StorageService.processTransaction(currentUser.id, txRecipient, amt, enrichedDesc);
      
      refreshData();
      refreshUser();
      
      setIsTxModalOpen(false);
      setTxAmount('');
      setTxDesc('');
      setTxRecipient('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTxSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      const amt = parseFloat(tradeAmount);
      const price = tradeType === 'LIMIT' ? parseFloat(tradePrice) : 0;

      if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid amount");
          return;
      }
      if (tradeType === 'LIMIT' && (isNaN(price) || price <= 0)) {
          alert("Please enter a valid price");
          return;
      }

      const result = await StorageService.processOrder(currentUser.id, tradeSide, tradeType, amt, price);
      
      if (result.success) {
          refreshData();
          refreshUser();
          setTradeAmount('');
      } else {
          alert(result.message);
      }
  };

  const handleCancelOrder = async (orderId: string) => {
      await StorageService.cancelOrder(orderId);
      refreshData();
      refreshUser();
  };

  const handleOrderBookClick = (price: number, side: OrderSide) => {
    if (!currentUser) return;
    setSelectedPriceLevel({ price, side });
  };


  const handleCreateBet = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser) return;

      const newBet: Bet = {
          id: `bet_${Date.now()}`,
          creatorId: currentUser.id,
          title: betTitle,
          description: betDesc,
          status: 'OPEN',
          createdAt: Date.now(),
          options: [
              { id: 'opt_1', text: betOption1 },
              { id: 'opt_2', text: betOption2 }
          ],
          wagers: []
      };

      await StorageService.createBet(newBet);
      refreshData();
      setIsBetModalOpen(false);
      setBetTitle('');
      setBetDesc('');
      setBetOption1('');
      setBetOption2('');
  };

  const handlePlaceBet = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser || !selectedBetId || !wagerOptionId) return;

      const amount = parseInt(wagerAmount);
      if(isNaN(amount) || amount > currentUser.balance) {
          alert("Invalid wager amount.");
          return;
      }

      try {
        await StorageService.placeWager(currentUser.id, selectedBetId, wagerOptionId, amount);
        refreshData();
        refreshUser();
        setSelectedBetId(null);
        setWagerAmount('');
      } catch(err: any) {
          alert(err.message);
      }
  };

  const resolveBet = async (betId: string, winningOptionId: string) => {
      await StorageService.resolveBet(betId, winningOptionId);
      refreshData();
      refreshUser();
  };

  const handleCreateDare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    await StorageService.createDare(currentUser.id, dareTargetId, dareDesc);
    refreshData();
    setIsDareModalOpen(false);
    setDareTargetId('');
    setDareDesc('');
  };

  const openPledgeModal = (dareId: string) => {
    setPledgeDareId(dareId);
    setPledgeAmount('');
    setIsPledgeModalOpen(true);
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !pledgeDareId) return;

    const amount = parseInt(pledgeAmount);

    if (isNaN(amount) || amount <= 0) {
      alert("Invalid amount");
      return;
    }
    if (amount > currentUser.balance) {
      alert("Insufficient beans!");
      return;
    }

    try {
      await StorageService.pledgeToDare(currentUser.id, pledgeDareId, amount);
      refreshData();
      refreshUser();
      setIsPledgeModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCompleteDareModal = (dareId: string) => {
    setCompletionDareId(dareId);
    setCompletionProof('');
    setIsCompleteDareModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionDareId) return;
    
    try {
        await StorageService.resolveDare(completionDareId, completionProof);
        refreshData();
        refreshUser();
        setIsCompleteDareModalOpen(false);
    } catch (err: any) {
        alert("Error resolving dare: " + err.message);
    }
  };

  const handleOracleAsk = async (question: string) => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: question };
    setOracleMessages(prev => [...prev, userMsg]);
    setIsOracleThinking(true);

    const responseText = await GeminiService.askOracle(userMsg.text, users, transactions, bets);
    
    setOracleMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsOracleThinking(false);
  };

  // --- Admin Handlers ---

  const handleOpenUserModal = (user: User | null) => {
      setEditingUser(user);
      if (user) {
          setFormUsername(user.username);
          setFormPassword(user.password || ''); 
          setFormSection(user.section);
          setFormBalance(user.balance.toString());
          setFormBeanCoinBalance((user.beanCoinBalance || 0).toString());
      } else {
          setFormUsername('');
          setFormPassword('123456'); 
          setFormSection('Tenor I');
          setFormBalance('0');
          setFormBeanCoinBalance('0');
      }
      setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const balanceVal = parseInt(formBalance);
      const coinBalanceVal = parseInt(formBeanCoinBalance);
      
      if (isNaN(balanceVal) || isNaN(coinBalanceVal)) {
          alert("Invalid balance values");
          return;
      }

      let updatedUsers = [...users];
      if (editingUser) {
          updatedUsers = updatedUsers.map(u => 
              u.id === editingUser.id 
                  ? { ...u, username: formUsername, password: formPassword, section: formSection, balance: balanceVal, beanCoinBalance: coinBalanceVal }
                  : u
          );
      } else {
          const newUser: User = {
              id: `u_${Date.now()}`,
              username: formUsername,
              password: formPassword,
              section: formSection,
              balance: balanceVal,
              beanCoinBalance: coinBalanceVal,
              avatarUrl: `https://picsum.photos/seed/${Date.now()}/150/150`
          };
          updatedUsers.push(newUser);
      }

      await StorageService.saveUsers(updatedUsers);
      setUsers(updatedUsers);
      refreshUser();
      
      setIsUserModalOpen(false);
  };

  const handleDeleteUser = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this user?")) return;
      
      const updatedUsers = users.filter(u => u.id !== id);
      await StorageService.saveUsers(updatedUsers);
      setUsers(updatedUsers);
      
      if (currentUser && currentUser.id === id) {
          handleLogout();
      }
  };

  const handleExportData = () => {
      // Simplified export using current cache
    const timestamp = new Date().toLocaleString();
    let content = `CHOIR BEANBANK EXPORT (Server Mode)\nGenerated: ${timestamp}\n\n`;
    
    content += `=== USERS ===\n`;
    users.forEach(u => {
      content += `${u.id} | ${u.username} | ${u.balance} beans\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beanbank_export_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // -- Render Helpers --

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative">
        {/* Settings Modal */}
        {showSettings && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center p-6">
                <div className="max-w-sm w-full bg-white shadow-2xl rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Settings size={20} /> Server Settings
                    </h3>
                    <form onSubmit={handleSaveSettings}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Server URL</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded font-mono text-sm mb-2"
                                placeholder="http://localhost:3000"
                                value={serverUrl}
                                onChange={e => setServerUrl(e.target.value)}
                            />
                            <Button 
                                type="button" 
                                variant="secondary" 
                                className="w-full text-xs mb-4" 
                                onClick={handleResetSettings}
                            >
                                Reset to Auto-Detect (Replit/Proxy)
                            </Button>
                            <p className="text-xs text-slate-500 mt-2">
                                If running locally: <code>http://localhost:3000</code><br/>
                                If on Replit/Cloud: Use Auto-Detect to let the proxy handle it.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowSettings(false)}>Cancel</Button>
                            <Button type="submit" className="flex-1">Save & Connect</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 relative z-10">
          <div className="absolute top-4 right-4">
              <button onClick={() => setShowSettings(true)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                  <Settings size={20} />
              </button>
          </div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <Wallet size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Choir BeanBank</h1>
            <p className="text-slate-500 mt-2">Manage your social currency securely.</p>
            
            {/* Connection Status Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
               {!connectionAttempted ? (
                   <span className="text-slate-400 flex items-center gap-2"><RefreshCw size={14} className="animate-spin"/> Connecting to server...</span>
               ) : isConnected ? (
                   <span className="text-emerald-600 flex items-center gap-2"><Server size={14}/> Server Connected</span>
               ) : (
                   <div className="text-rose-500 bg-rose-50 p-2 rounded text-xs flex flex-col items-center w-full">
                       <span className="flex items-center gap-2 font-bold mb-1"><Wifi size={14}/> Server Unreachable</span>
                       <span className="text-center mb-2">Check if <code>node server.js</code> is running.</span>
                       <button onClick={() => setShowSettings(true)} className="text-rose-700 underline hover:text-rose-900">Configure URL</button>
                   </div>
               )}
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-slate-400 disabled:opacity-50"
                placeholder="e.g., Choir_Manager"
                required
                disabled={!isConnected}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-slate-400 disabled:opacity-50"
                placeholder="••••••••"
                required
                disabled={!isConnected}
              />
            </div>
            <Button type="submit" className="w-full justify-center" disabled={!isConnected}>
                {isConnected ? 'Sign In' : 'Waiting for Server...'}
            </Button>
          </form>
          <div className="mt-6 text-xs text-slate-400 text-center">
            Try "Choir_Manager" (pass: admin) or "Maestro_John" (pass: 123)
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Wallet size={24} className="text-white" />
            </div>
            <div>
              <p className="text-emerald-50 text-sm font-medium">Beans</p>
              <h2 className="text-2xl font-bold">{currentUser.balance}</h2>
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Coins size={24} className="text-white" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm font-medium">BeanCoin</p>
              <h2 className="text-2xl font-bold">{currentUser.beanCoinBalance || 0}</h2>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Rank</p>
              <h2 className="text-2xl font-bold text-slate-900">
                #{users.sort((a,b) => b.balance - a.balance).findIndex(u => u.id === currentUser.id) + 1}
              </h2>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <Gavel size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Active Bets</p>
              <h2 className="text-2xl font-bold text-slate-900">
                {bets.filter(b => b.status === 'OPEN').length}
              </h2>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setView(AppView.TRANSACTIONS)} className="text-sm text-slate-500 hover:text-emerald-600">
                View All
            </Button>
            <Button onClick={() => setIsTxModalOpen(true)} variant="primary">
                <Plus size={18} /> Send Beans
            </Button>
        </div>
      </div>

      <div className="space-y-3">
        {transactions.slice(0, 5).map(tx => {
            const isReceiver = tx.toUserId === currentUser.id;
            const otherUser = users.find(u => u.id === (isReceiver ? tx.fromUserId : tx.toUserId));
            return (
              <div key={tx.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isReceiver ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {isReceiver ? <TrendingUp size={18} /> : <ArrowRightLeft size={18} />}
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">{tx.description}</p>
                        <p className="text-xs text-slate-500">
                            {isReceiver ? 'Received from' : 'Sent to'} {otherUser?.username || (isReceiver ? tx.fromUserId : tx.toUserId)}
                        </p>
                    </div>
                 </div>
                 <span className={`font-bold ${isReceiver ? 'text-emerald-600' : 'text-slate-900'}`}>
                     {isReceiver ? '+' : '-'}{tx.amount}
                 </span>
              </div>
            );
        })}
        {transactions.length === 0 && (
            <div className="text-center py-8 text-slate-400">No transactions yet. Be the first to spend!</div>
        )}
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="text-slate-500" /> Transaction History
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4 whitespace-nowrap">From</th>
                        <th className="px-6 py-4 whitespace-nowrap">To</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {[...transactions].sort((a, b) => b.timestamp - a.timestamp).map((tx) => {
                        const isReceiver = tx.toUserId === currentUser.id;
                        const isSender = tx.fromUserId === currentUser.id;
                        const sender = users.find(u => u.id === tx.fromUserId);
                        const receiver = users.find(u => u.id === tx.toUserId);
                        
                        return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                    {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {tx.description}
                                    {tx.category && <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs">#{tx.category}</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {sender && <img src={sender.avatarUrl} className="w-6 h-6 rounded-full" alt="" />}
                                        <span>{sender ? sender.username : (tx.fromUserId === 'SYSTEM' ? 'Bank' : tx.fromUserId)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {receiver && <img src={receiver.avatarUrl} className="w-6 h-6 rounded-full" alt="" />}
                                        <span>{receiver ? receiver.username : (tx.toUserId === 'SYSTEM' ? 'Bank' : tx.toUserId)}</span>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 text-right font-mono font-bold whitespace-nowrap ${
                                    isReceiver ? 'text-emerald-600' : (isSender ? 'text-rose-600' : 'text-slate-900')
                                }`}>
                                    {isReceiver ? '+' : (isSender ? '-' : '')}{tx.amount}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
          {transactions.length === 0 && (
              <div className="p-8 text-center text-slate-400">No transactions recorded yet.</div>
          )}
      </div>
    </div>
  );

  const renderLeaderboard = () => {
    const sortedUsers = [...users].sort((a, b) => b.balance - a.balance);
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-amber-500" /> Leaderboard
        </h2>
        
        {/* Chart */}
        <div className="h-64 w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedUsers.slice(0, 5)}>
                    <XAxis dataKey="username" tick={{fontSize: 12}} interval={0} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                        {sortedUsers.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#64748b'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Singer</th>
                        <th className="px-6 py-4">Section</th>
                        <th className="px-6 py-4 text-right">Beans</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedUsers.map((user, idx) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </td>
                            <td className="px-6 py-4 flex items-center gap-3">
                                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                                <span className="font-medium text-slate-900">{user.username}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{user.section}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{user.balance}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  const renderBets = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Gavel className="text-purple-500" /> Betting Pool
            </h2>
            <Button onClick={() => setIsBetModalOpen(true)} variant="secondary">
                <Plus size={18} /> New Bet
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bets.map(bet => {
                const totalPot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
                const isCreator = bet.creatorId === currentUser.id;
                const hasVoted = bet.wagers.some(w => w.userId === currentUser.id);
                const canResolve = bet.status === 'OPEN' && (isCreator || currentUser.isAdmin);

                return (
                    <Card key={bet.id} className={`border-l-4 ${bet.status === 'OPEN' ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${bet.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {bet.status}
                            </span>
                            <span className="text-xs text-slate-400">Pot: {totalPot} Beans</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{bet.title}</h3>
                        <p className="text-slate-600 text-sm mb-4">{bet.description}</p>
                        
                        <div className="space-y-2 mb-4">
                            {bet.options.map(opt => {
                                const voteCount = bet.wagers.filter(w => w.optionId === opt.id).length;
                                const isWinner = bet.status === 'RESOLVED' && bet.winningOptionId === opt.id;
                                return (
                                    <div key={opt.id} className={`p-3 rounded-lg border flex justify-between items-center ${isWinner ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <span className={isWinner ? 'font-bold text-amber-800' : 'text-slate-700'}>
                                            {opt.text} {isWinner && '👑'}
                                        </span>
                                        <span className="text-xs text-slate-400">{voteCount} bets</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                            {bet.status === 'OPEN' && !hasVoted && (
                                <Button 
                                    variant="primary" 
                                    className="flex-1 text-sm"
                                    onClick={() => setSelectedBetId(bet.id)}
                                >
                                    Place Wager
                                </Button>
                            )}
                            {canResolve && (
                                <div className="flex gap-2 flex-1">
                                    <Button 
                                        variant="ghost" 
                                        className="flex-1 text-xs border border-slate-200"
                                        onClick={() => resolveBet(bet.id, bet.options[0].id)}
                                    >
                                        Win: {bet.options[0].text}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        className="flex-1 text-xs border border-slate-200"
                                        onClick={() => resolveBet(bet.id, bet.options[1].id)}
                                    >
                                        Win: {bet.options[1].text}
                                    </Button>
                                </div>
                            )}
                            {hasVoted && bet.status === 'OPEN' && (
                                <div className="w-full text-center text-sm text-emerald-600 font-medium bg-emerald-50 py-2 rounded">
                                    Wager Placed!
                                </div>
                            )}
                             {bet.status === 'RESOLVED' && (
                                <div className="w-full text-center text-sm text-slate-500 font-medium">
                                    Bet Resolved
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
          </div>

           {/* Wager Modal Overlay */}
           {selectedBetId && (
               <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                   <div className="bg-white rounded-xl max-w-sm w-full p-6">
                       <h3 className="text-lg font-bold mb-4">Place your bet</h3>
                       <div className="space-y-3 mb-4">
                            <label className="block text-sm font-medium text-slate-700">Option</label>
                            <select 
                                className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                                value={wagerOptionId}
                                onChange={e => setWagerOptionId(e.target.value)}
                            >
                                <option value="">Select winner...</option>
                                {bets.find(b => b.id === selectedBetId)?.options.map(o => (
                                    <option key={o.id} value={o.id}>{o.text}</option>
                                ))}
                            </select>
                            
                            <label className="block text-sm font-medium text-slate-700">Amount</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                                placeholder="Amount"
                                value={wagerAmount}
                                onChange={e => setWagerAmount(e.target.value)}
                            />
                       </div>
                       <div className="flex gap-3">
                           <Button className="flex-1" variant="ghost" onClick={() => setSelectedBetId(null)}>Cancel</Button>
                           <Button className="flex-1" onClick={handlePlaceBet}>Confirm</Button>
                       </div>
                   </div>
               </div>
           )}
      </div>
  );

  const renderDares = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="text-amber-500" /> Dare Board
        </h2>
        <Button onClick={() => setIsDareModalOpen(true)} variant="secondary">
            <Plus size={18} /> New Dare
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dares.map(dare => {
            const targetUser = users.find(u => u.id === dare.targetId);
            const isTarget = dare.targetId === currentUser.id;
            
            return (
                <Card key={dare.id} className={`border-l-4 ${dare.status === 'ACTIVE' ? 'border-l-amber-500' : 'border-l-slate-300'}`}>
                    <div className="flex justify-between items-start mb-2">
                         <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${dare.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {dare.status}
                        </span>
                        <div className="text-right">
                            <span className="block text-lg font-bold text-emerald-600">{dare.bounty} Beans</span>
                            <span className="text-xs text-slate-400">Bounty</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                        <img src={targetUser?.avatarUrl} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
                        <div>
                            <p className="text-xs text-slate-500">Target</p>
                            <p className="font-bold text-slate-800">{targetUser?.username || 'Unknown'}</p>
                        </div>
                    </div>

                    <p className="text-slate-700 text-sm mb-4 bg-slate-50 p-3 rounded-lg italic">
                        "{dare.description}"
                    </p>

                    {dare.status === 'COMPLETED' && dare.proof && (
                        <div className="mb-4 text-sm text-slate-600 bg-emerald-50 p-3 rounded border border-emerald-100">
                            <span className="font-bold text-emerald-700 block mb-1 flex items-center gap-1"><CheckCircle size={14} /> Proof/Note:</span>
                            "{dare.proof}"
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {dare.status === 'ACTIVE' && (
                            <>
                                <Button variant="primary" className="w-full" onClick={() => openPledgeModal(dare.id)}>
                                    <Coins size={16} /> Pledge Beans
                                </Button>
                                {isTarget && (
                                    <Button variant="secondary" className="w-full" onClick={() => openCompleteDareModal(dare.id)}>
                                        <Trophy size={16} /> I Did It!
                                    </Button>
                                )}
                            </>
                        )}
                        {dare.status === 'COMPLETED' && (
                            <div className="text-center text-emerald-600 font-bold text-sm py-2">
                                Dare Completed!
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2">{dare.pledges.length} backers</p>
                        <div className="flex -space-x-2 overflow-hidden">
                            {dare.pledges.slice(0, 5).map((p, i) => {
                                const pledger = users.find(u => u.id === p.userId);
                                return (
                                    <div 
                                        key={i} 
                                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center overflow-hidden bg-slate-200" 
                                        title={`${pledger?.username} pledged ${p.amount}`}
                                    >
                                        <img src={pledger?.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                );
                            })}
                            {dare.pledges.length > 5 && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    +{dare.pledges.length - 5}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            );
        })}
      </div>

      {/* Create Dare Modal */}
      {isDareModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                  <div className="p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Create a Dare</h2>
                      <form onSubmit={handleCreateDare} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Target User</label>
                              <select 
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  value={dareTargetId}
                                  onChange={e => setDareTargetId(e.target.value)}
                                  required
                              >
                                  <option value="">Who are you daring?</option>
                                  {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.username}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Dare Description</label>
                              <textarea 
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="What must they do?"
                                  rows={3}
                                  value={dareDesc}
                                  onChange={e => setDareDesc(e.target.value)}
                                  required
                              />
                          </div>
                          <div className="flex gap-3 mt-6">
                              <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsDareModalOpen(false)}>Cancel</Button>
                              <Button type="submit" className="flex-1">Create Dare</Button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* Pledge Modal */}
      {isPledgeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
                  <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Pledge Beans</h2>
                        <div className="text-sm text-slate-500">Balance: <span className="font-bold text-emerald-600">{currentUser.balance}</span></div>
                      </div>
                      <form onSubmit={handlePledgeSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Pledge</label>
                              <input 
                                  type="number"
                                  className="w-full p-3 text-lg font-mono border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="0"
                                  value={pledgeAmount}
                                  onChange={e => setPledgeAmount(e.target.value)}
                                  autoFocus
                                  min="1"
                                  max={currentUser.balance}
                                  required
                              />
                          </div>
                          <div className="flex gap-2">
                                {[10, 50, 100].map(amt => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setPledgeAmount(amt.toString())}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium text-sm"
                                    >
                                        +{amt}
                                    </button>
                                ))}
                          </div>
                          <div className="flex gap-3 mt-6">
                              <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsPledgeModalOpen(false)}>Cancel</Button>
                              <Button type="submit" className="flex-1">Confirm Pledge</Button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* Complete Dare Modal */}
      {isCompleteDareModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                  <div className="p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Complete Dare</h2>
                      <p className="text-slate-600 mb-4">
                          Great job completing this dare! The bounty will be transferred to your account immediately.
                      </p>
                      <form onSubmit={handleCompleteSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Proof / Notes (Optional)</label>
                              <textarea 
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="e.g. 'Video posted in the group chat!'"
                                  rows={3}
                                  value={completionProof}
                                  onChange={e => setCompletionProof(e.target.value)}
                              />
                          </div>
                          <div className="flex gap-3 mt-6">
                              <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsCompleteDareModalOpen(false)}>Cancel</Button>
                              <Button type="submit" className="flex-1">Claim Bounty</Button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  const renderProfile = () => {
      // Filter bets user participated in
      const myBets = bets.filter(b => b.wagers.some(w => w.userId === currentUser.id));

      return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CircleUser className="text-indigo-500" /> My Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Stats">
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Username</span>
                            <span className="font-medium">{currentUser.username}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Section</span>
                            <span className="font-medium">{currentUser.section}</span>
                        </div>
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Total Bets Placed</span>
                            <span className="font-medium">{myBets.length}</span>
                        </div>
                    </div>
                </Card>
                <Card title="Bean Wallet">
                     <div className="flex flex-col items-center justify-center h-full py-4">
                        <h3 className="text-4xl font-bold text-emerald-600 mb-1">{currentUser.balance}</h3>
                        <span className="text-slate-500 text-sm uppercase tracking-wider">Current Beans</span>
                     </div>
                </Card>
                <Card title="Crypto Portfolio">
                     <div className="flex flex-col items-center justify-center h-full py-4">
                        <h3 className="text-4xl font-bold text-indigo-600 mb-1">{currentUser.beanCoinBalance || 0}</h3>
                        <span className="text-slate-500 text-sm uppercase tracking-wider mb-2">BeanCoins</span>
                        <span className="text-xs text-slate-400">Value: {(currentUser.beanCoinBalance || 0) * currentPrice} Beans</span>
                     </div>
                </Card>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Betting History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Bet</th>
                                <th className="px-6 py-4">My Pick</th>
                                <th className="px-6 py-4">Wager</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {myBets.map(bet => {
                                const myWager = bet.wagers.find(w => w.userId === currentUser.id);
                                const myOption = bet.options.find(o => o.id === myWager?.optionId);
                                const isResolved = bet.status === 'RESOLVED';
                                const won = isResolved && bet.winningOptionId === myWager?.optionId;
                                
                                // Calculate rough payout if won for display
                                let payout = 0;
                                if (won) {
                                    const totalPot = bet.wagers.reduce((sum, w) => sum + w.amount, 0);
                                    const winningWagers = bet.wagers.filter(w => w.optionId === bet.winningOptionId);
                                    const winnerPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);
                                    if (myWager) {
                                        payout = Math.floor((myWager.amount / winnerPool) * totalPot);
                                    }
                                }

                                return (
                                    <tr key={bet.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{bet.title}</td>
                                        <td className="px-6 py-4 text-slate-600">{myOption?.text}</td>
                                        <td className="px-6 py-4 font-mono text-rose-600">-{myWager?.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                isResolved ? (won ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {isResolved ? (won ? 'WON' : 'LOST') : 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${won ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {isResolved ? (won ? `+${payout}` : '0') : '...'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {myBets.length === 0 && (
                    <div className="p-8 text-center text-slate-400">You haven't placed any bets yet.</div>
                )}
            </div>
        </div>
      );
  }

  const renderCrypto = () => {
      const coinBalance = currentUser.beanCoinBalance || 0;
      const myOpenOrders = orders.filter(o => o.userId === currentUser.id && o.amount > o.filled);

      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Coins className="text-indigo-500" /> BeanCoin Exchange
                </h2>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    Live
                </div>
              </div>

              {/* Market Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-900 text-white border-none">
                      <div className="flex flex-col items-center py-2">
                          <span className="text-indigo-300 text-sm">Market Price</span>
                          <h3 className="text-4xl font-bold text-white flex items-center gap-2">
                             {currentPrice} <span className="text-lg text-slate-400 font-normal">Beans</span>
                          </h3>
                      </div>
                  </Card>
                  <Card>
                      <div className="flex flex-col items-center py-2">
                          <span className="text-slate-500 text-sm">Available Beans</span>
                          <h3 className="text-4xl font-bold text-emerald-600">{currentUser.balance}</h3>
                      </div>
                  </Card>
                  <Card>
                      <div className="flex flex-col items-center py-2">
                          <span className="text-slate-500 text-sm">Your Holdings</span>
                          <h3 className="text-4xl font-bold text-indigo-600">{coinBalance} BC</h3>
                      </div>
                  </Card>
              </div>

              {/* Main Exchange Area */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Order Book (Left) */}
                  <div className="lg:col-span-3 h-96">
                      <OrderBook 
                        orders={orders} 
                        currentPrice={currentPrice} 
                        onPriceLevelClick={handleOrderBookClick}
                      />
                  </div>

                  {/* Chart & Trading Form (Right) */}
                  <div className="lg:col-span-9 flex flex-col gap-6">
                      {/* Chart */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64 flex flex-col">
                        <div className="flex justify-end mb-2 gap-2">
                             <span className="text-xs font-medium text-slate-400 uppercase flex items-center gap-1 mr-2">
                                  <Clock size={12} /> Time Frame:
                              </span>
                              {(['10M', '1H', 'ALL'] as const).map(tf => (
                                  <button
                                    key={tf}
                                    onClick={() => setTimeFrame(tf)}
                                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                                        timeFrame === tf 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                      {tf}
                                  </button>
                              ))}
                        </div>
                        <div className="flex-1">
                            <MarketChart data={filteredHistory} />
                        </div>
                      </div>

                      {/* Trading Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card title="Place Order">
                              <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                                  <button 
                                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tradeSide === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      onClick={() => setTradeSide('BUY')}
                                  >
                                      Buy BC
                                  </button>
                                  <button 
                                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${tradeSide === 'SELL' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      onClick={() => setTradeSide('SELL')}
                                  >
                                      Sell BC
                                  </button>
                              </div>
                              
                              <div className="flex gap-4 mb-4 text-sm">
                                   <label className="flex items-center gap-2 cursor-pointer">
                                       <input 
                                          type="radio" 
                                          name="orderType" 
                                          checked={tradeType === 'LIMIT'} 
                                          onChange={() => setTradeType('LIMIT')}
                                          className="text-indigo-600 focus:ring-indigo-500" 
                                       />
                                       <span className="text-slate-700 font-medium">Limit</span>
                                   </label>
                                   <label className="flex items-center gap-2 cursor-pointer">
                                       <input 
                                          type="radio" 
                                          name="orderType" 
                                          checked={tradeType === 'MARKET'} 
                                          onChange={() => setTradeType('MARKET')}
                                          className="text-indigo-600 focus:ring-indigo-500" 
                                       />
                                       <span className="text-slate-700 font-medium">Market</span>
                                   </label>
                              </div>

                              <form onSubmit={handlePlaceOrder} className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (Beans)</label>
                                      <input 
                                          type="number"
                                          disabled={tradeType === 'MARKET'}
                                          className={`w-full p-2 border rounded font-mono ${tradeType === 'MARKET' ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none'}`}
                                          placeholder={tradeType === 'MARKET' ? 'Market Price' : '0.00'}
                                          value={tradeType === 'MARKET' ? '' : tradePrice}
                                          onChange={e => setTradePrice(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (BeanCoin)</label>
                                      <input 
                                          type="number"
                                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                          placeholder="0"
                                          value={tradeAmount}
                                          onChange={e => setTradeAmount(e.target.value)}
                                      />
                                  </div>
                                  
                                  {/* Summary / Estimate */}
                                  <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 flex justify-between">
                                      <span>Total:</span>
                                      <span className="font-mono font-bold">
                                          {tradeType === 'LIMIT' && tradeAmount && tradePrice 
                                              ? `${parseFloat(tradeAmount) * parseFloat(tradePrice)} Beans` 
                                              : '—'}
                                      </span>
                                  </div>

                                  <Button 
                                      type="submit" 
                                      className={`w-full ${tradeSide === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
                                  >
                                      {tradeSide} BeanCoin
                                  </Button>
                              </form>
                          </Card>

                          {/* Open Orders */}
                          <Card title="Your Open Orders" className="flex flex-col">
                              <div className="flex-1 overflow-y-auto max-h-60">
                                  {myOpenOrders.length === 0 ? (
                                      <div className="text-center py-8 text-slate-400 text-sm">No active orders</div>
                                  ) : (
                                      <div className="space-y-2">
                                          {myOpenOrders.map(order => (
                                              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                                                  <div>
                                                      <div className="flex items-center gap-2 mb-1">
                                                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${order.side === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                              {order.side}
                                                          </span>
                                                          <span className="text-sm font-bold text-slate-700">
                                                              {order.price} Beans
                                                          </span>
                                                      </div>
                                                      <div className="text-xs text-slate-500">
                                                          {order.amount - order.filled} / {order.amount} BC remaining
                                                      </div>
                                                  </div>
                                                  <button 
                                                      onClick={() => handleCancelOrder(order.id)}
                                                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                      title="Cancel Order"
                                                  >
                                                      <X size={16} />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </Card>
                      </div>
                  </div>
              </div>
              
              {/* Order Details Modal for Admins */}
              {selectedPriceLevel && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <List size={24} className="text-slate-500" /> 
                                    Order Details
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {selectedPriceLevel.side} Orders @ {selectedPriceLevel.price} Beans
                                </p>
                            </div>
                            <button onClick={() => setSelectedPriceLevel(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={20} />
                            </button>
                         </div>
                         
                         <div className="max-h-96 overflow-y-auto">
                            {orders
                                .filter(o => o.side === selectedPriceLevel.side && o.price === selectedPriceLevel.price && o.filled < o.amount)
                                .map(order => {
                                    const owner = users.find(u => u.id === order.userId);
                                    return (
                                        <div key={order.id} className="p-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                {owner && <img src={owner.avatarUrl} className="w-10 h-10 rounded-full bg-slate-200" alt="" />}
                                                {!owner && <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">SYS</div>}
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{owner ? owner.username : 'System / AMM'}</p>
                                                    <p className="text-xs text-slate-500 font-mono">ID: {order.id.slice(0,12)}...</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-indigo-600">
                                                        {order.amount - order.filled} <span className="text-slate-400 font-normal">/ {order.amount} BC</span>
                                                    </p>
                                                    <p className="text-xs text-slate-400">{new Date(order.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                                {(currentUser.isAdmin || currentUser.id === order.userId) && (
                                                    <Button 
                                                        variant="danger" 
                                                        className="p-2 h-8 w-8 rounded-full flex items-center justify-center" 
                                                        onClick={() => {
                                                            if(window.confirm("Cancel this order? Funds will be returned.")) {
                                                                handleCancelOrder(order.id);
                                                            }
                                                        }}
                                                        title="Cancel / Delete Order"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            }
                            {orders.filter(o => o.side === selectedPriceLevel.side && o.price === selectedPriceLevel.price && o.filled < o.amount).length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic">No active orders at this level.</div>
                            )}
                         </div>
                         <div className="p-4 bg-slate-50 flex justify-end">
                            <Button variant="ghost" onClick={() => setSelectedPriceLevel(null)}>Close</Button>
                         </div>
                    </div>
                </div>
              )}
          </div>
      );
  };

  const renderAdmin = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Shield className="text-rose-600" /> Admin Panel
            </h2>
            <div className="flex gap-2">
                <Button onClick={handleExportData} variant="secondary" className="text-sm">
                    <Download size={16} /> Export Log
                </Button>
                <Button onClick={() => handleOpenUserModal(null)} variant="primary" className="text-sm">
                    <Plus size={16} /> Add User
                </Button>
            </div>
          </div>

          <Card title="User Management">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4">Username</th>
                              <th className="px-6 py-4">Section</th>
                              <th className="px-6 py-4 text-right">Balance</th>
                              <th className="px-6 py-4 text-right">BeanCoin</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {users.map(user => (
                              <tr key={user.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                      <img src={user.avatarUrl} className="w-6 h-6 rounded-full" alt="" />
                                      {user.username}
                                      {user.isAdmin && <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Admin</span>}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500">{user.section}</td>
                                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{user.balance}</td>
                                  <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">{user.beanCoinBalance || 0}</td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <button 
                                              onClick={() => handleOpenUserModal(user)}
                                              className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                                              title="Edit User"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          {!user.isAdmin && (
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Card>
      </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50">
      
      {/* Sidebar Navigation */}
      <div className="w-20 md:w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all">
        <div className="p-6 flex items-center gap-3 text-emerald-400 font-bold text-xl">
          <Wallet size={28} />
          <span className="hidden md:block">BeanBank</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          {[
            { id: AppView.DASHBOARD, icon: Wallet, label: 'Dashboard' },
            { id: AppView.TRANSACTIONS, icon: ArrowRightLeft, label: 'Transactions' },
            { id: AppView.CRYPTO, icon: Coins, label: 'BeanCoin Market' },
            { id: AppView.LEADERBOARD, icon: Trophy, label: 'Leaderboard' },
            { id: AppView.BETS, icon: Gavel, label: 'Betting Pool' },
            { id: AppView.DARES, icon: Zap, label: 'Dare Board' },
            { id: AppView.PROFILE, icon: CircleUser, label: 'My Profile' },
            { id: AppView.ORACLE, icon: Sparkles, label: 'Bean Oracle' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${view === item.id ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'}`}
            >
              <item.icon size={20} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
          
          {/* Admin Link */}
          {currentUser.isAdmin && (
             <button
                onClick={() => setView(AppView.ADMIN)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${view === AppView.ADMIN ? 'bg-rose-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <Shield size={20} />
                <span className="hidden md:block font-medium">Admin Panel</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
            {/* Online Status Indicator */}
            <div className="px-4 mb-4 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold" title="Synced with Server">
                    <div className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </div>
                    <span className="hidden md:block flex items-center gap-1">
                        {isConnected ? 'LIVE SYNC' : 'OFFLINE'} <Globe size={10} />
                    </span>
                </div>
                <button 
                    onClick={handleForceSync} 
                    className={`p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors ${isSyncing ? 'animate-spin text-emerald-400' : ''}`}
                    title="Force Network Sync"
                >
                    <RefreshCcw size={14} />
                </button>
            </div>

            {/* Share Button (Also in sidebar as backup) */}
            <div className="px-2 mb-4 md:hidden">
                <button 
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-indigo-300 bg-slate-800 hover:bg-indigo-900/30 rounded-lg transition-colors text-sm"
                >
                    <Share2 size={16} />
                </button>
            </div>

          <div className="flex items-center gap-3 px-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView(AppView.PROFILE)}>
            <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-700" />
            <div className="hidden md:block overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser.section}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="hidden md:block text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {view === AppView.DASHBOARD && renderDashboard()}
          {view === AppView.TRANSACTIONS && renderTransactions()}
          {view === AppView.LEADERBOARD && renderLeaderboard()}
          {view === AppView.BETS && renderBets()}
          {view === AppView.DARES && renderDares()}
          {view === AppView.PROFILE && renderProfile()}
          {view === AppView.CRYPTO && renderCrypto()}
          {view === AppView.ADMIN && currentUser.isAdmin && renderAdmin()}
          {view === AppView.ORACLE && (
              <OracleView 
                  messages={oracleMessages} 
                  isThinking={isOracleThinking} 
                  onAsk={handleOracleAsk} 
              />
          )}
        </div>
      </main>

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all scale-100">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Send Beans</h2>
              <form onSubmit={handleSendBeans} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                  <select 
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                    value={txRecipient}
                    onChange={e => setTxRecipient(e.target.value)}
                    required
                  >
                    <option value="">Select a singer...</option>
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.section})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                    placeholder="0"
                    min="1"
                    max={currentUser.balance}
                    value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Available: {currentUser.balance} beans</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                    placeholder="What's this for?"
                    value={txDesc}
                    onChange={e => setTxDesc(e.target.value)}
                    required
                  />
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Sparkles size={10} /> AI will classify this transaction
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsTxModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" isLoading={isTxSubmitting}>Send</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Bet Modal */}
       {isBetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Create New Bet</h2>
              <form onSubmit={handleCreateBet} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Title</label>
                  <input 
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                    placeholder="e.g. Who hits the high C?"
                    value={betTitle}
                    onChange={e => setBetTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea 
                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                    placeholder="Details..."
                    value={betDesc}
                    onChange={e => setBetDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase">Option 1</label>
                        <input 
                            className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                            placeholder="Option A"
                            value={betOption1}
                            onChange={e => setBetOption1(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase">Option 2</label>
                        <input 
                            className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                            placeholder="Option B"
                            value={betOption2}
                            onChange={e => setBetOption2(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsBetModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="secondary" className="flex-1">Create Bet</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
                  <div className="p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">
                          {editingUser ? 'Edit User' : 'Create User'}
                      </h2>
                      <form onSubmit={handleSaveUser} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                              <input 
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                                  value={formUsername}
                                  onChange={e => setFormUsername(e.target.value)}
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                  Password <Eye size={14} className="text-slate-400" />
                              </label>
                              <input 
                                  type="text"
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400 font-mono"
                                  value={formPassword}
                                  onChange={e => setFormPassword(e.target.value)}
                                  placeholder="User Password"
                                  required
                              />
                              <p className="text-xs text-slate-400 mt-1">Visible to Admins only.</p>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                              <select 
                                  className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                                  value={formSection}
                                  onChange={e => setFormSection(e.target.value as any)}
                              >
                                  <option value="Tenor I">Tenor I</option>
                                  <option value="Tenor II">Tenor II</option>
                                  <option value="Baritone">Baritone</option>
                                  <option value="Bass">Bass</option>
                                  <option value="Conductor">Conductor</option>
                              </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Beans</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-400"
                                    value={formBalance}
                                    onChange={e => setFormBalance(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">BeanCoins</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400"
                                    value={formBeanCoinBalance}
                                    onChange={e => setFormBeanCoinBalance(e.target.value)}
                                    required
                                />
                            </div>
                          </div>
                          <div className="flex gap-3 mt-6">
                              <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                              <Button type="submit" className="flex-1">Save</Button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;