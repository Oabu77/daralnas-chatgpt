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
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">QuranChain Dashboard</h1>
        <div className="space-x-4">
          <button onClick={handleManageSubscription} className="bg-blue-500 text-white px-4 py-2 rounded">
            {subscription ? 'Manage Subscription' : 'Subscribe'}
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>
      </header>

      {subscription && (
        <div className="bg-blue-50 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold">Subscription Status</h2>
          <p>Status: <strong>{subscription.status}</strong></p>
          {subscription.current_period_end && (
            <p>Next billing: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-4">Quran Verses</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {verses.map(verse => (
              <div key={verse._id} className="bg-white p-4 rounded shadow">
                <p><strong>{verse.surahNumber}:{verse.verseNumber}</strong> {verse.arabicText}</p>
                <p className="text-sm text-gray-500">Hash: {verse.hash}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl mb-4">Translations</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {translations.map(translation => (
              <div key={translation._id} className="bg-white p-4 rounded shadow">
                <p><strong>{translation.language}</strong>: {translation.text}</p>
                <p className="text-sm text-gray-500">Verse: {translation.verseId.surahNumber}:{translation.verseId.verseNumber}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;