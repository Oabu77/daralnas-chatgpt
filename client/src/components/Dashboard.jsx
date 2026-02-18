import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [verses, setVerses] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [versesRes, translationsRes, subscriptionRes] = await Promise.all([
        axios.get('/api/verses'),
        axios.get('/api/translations'),
        axios.get('/api/subscriptions/subscription').catch(() => ({ data: { subscription: null } }))
      ]);
      setVerses(versesRes.data.data);
      setTranslations(translationsRes.data.data);
      setSubscription(subscriptionRes.data.subscription);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleManageSubscription = () => {
    navigate('/subscriptions');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6">
        {/* Header with Glassmorphism */}
        <header className="backdrop-blur-md bg-white/80 rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🕌 QuranChain Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Welcome to your decentralized Islamic platform</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={handleManageSubscription} 
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {subscription ? '⚙️ Manage Subscription' : '🚀 Subscribe Now'}
              </button>
              <button 
                onClick={handleLogout} 
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </header>

        {/* Subscription Status Card */}
        {subscription && (
          <div className="backdrop-blur-md bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-8 shadow-xl border border-green-200/50">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 rounded-full p-3">
                <span className="text-white text-2xl">✅</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Active Subscription</h2>
                <p className="text-gray-600">Status: <strong className="text-green-600">{subscription.status}</strong></p>
                {subscription.current_period_end && (
                  <p className="text-gray-600">Next billing: <strong>{new Date(subscription.current_period_end * 1000).toLocaleDateString()}</strong></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quran Verses Section */}
          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">📖</span>
              <h2 className="text-2xl font-bold text-gray-800">Quran Verses</h2>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100">
              {verses.map(verse => (
                <div key={verse._id} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100/50">
                  <div className="flex items-start space-x-3">
                    <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {verse.surahNumber}:{verse.verseNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium leading-relaxed">{verse.arabicText}</p>
                      <p className="text-xs text-gray-500 mt-2 font-mono">Hash: {verse.hash.substring(0, 16)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Translations Section */}
          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">🌍</span>
              <h2 className="text-2xl font-bold text-gray-800">Translations</h2>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
              {translations.map(translation => (
                <div key={translation._id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-purple-100/50">
                  <div className="flex items-start space-x-3">
                    <span className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {translation.language.substring(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium leading-relaxed">{translation.text}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Verse: {translation.verseId.surahNumber}:{translation.verseId.verseNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;