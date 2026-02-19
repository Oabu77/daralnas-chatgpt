/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useParams } from 'react-router-dom';
import PlatformSite from './PlatformSite';
import PLATFORMS from './platformConfigs';

/**
 * Route wrapper: /site/:platformId renders the correct platform website
 * Also handles subdomain routing for production (meshtalk.darcloud.host → meshtalk config)
 */
export default function PlatformPage() {
  const { platformId } = useParams();

  // Try to detect subdomain in production
  let resolvedId = platformId;
  if (!resolvedId) {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    if (PLATFORMS[subdomain]) resolvedId = subdomain;
  }

  const config = PLATFORMS[resolvedId];

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Platform Not Found</h1>
          <p className="text-gray-400 mb-8">The platform "{resolvedId}" does not exist.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl">
            {Object.entries(PLATFORMS).map(([id, p]) => (
              <a key={id} href={`/site/${id}`} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl text-center transition">
                <span className="text-2xl block mb-1">{p.icon}</span>
                <span className="text-white text-sm font-medium">{p.name}</span>
                <span className="text-gray-500 text-xs block">{p.domain}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <PlatformSite config={config} />;
}
