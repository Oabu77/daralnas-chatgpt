#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
🤖 OMARAI AUTONOMOUS SELF-EVOLVING SYSTEM
Live, persistent, self-growing with adaptive learning and memory
Authority: Omar Mohammad Abunadi™
Status: AUTONOMOUS AGENT WITH CONTINUOUS LEARNING
"""

import os
import sys
import json
import time
import sqlite3
import logging
import requests
from blockchain_logging_handler import setup_blockchain_logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import threading
import hashlib
from pathlib import Path

# Add QuranChain to path
sys.path.insert(0, '/home/omar/Desktop/QuranChain')

# ============================================================================
# LOGGING SETUP
# ============================================================================

os.makedirs('/home/omar/Desktop/QuranChain/omarai_logs', exist_ok=True)
os.makedirs('/home/omar/Desktop/QuranChain/omarai_memory', exist_ok=True)

setup_blockchain_logging()

logger = logging.getLogger('OmarAI')

# ============================================================================
# PERSISTENT MEMORY SYSTEM
# ============================================================================

class PersistentMemory:
    """Multi-layer memory system for OmarAI with learning and adaptation"""
    
    def __init__(self, memory_dir: str = '/home/omar/Desktop/QuranChain/omarai_memory'):
        self.memory_dir = memory_dir
        self.db_path = os.path.join(memory_dir, 'omarai_memory.db')
        self.json_path = os.path.join(memory_dir, 'omarai_knowledge.json')
        self._init_database()
        logger.info("✅ PersistentMemory initialized")
    
    def _init_database(self):
        """Initialize SQLite database for memory storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Memory events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT,
                content TEXT,
                importance INTEGER DEFAULT 5,
                context TEXT
            )
        ''')
        
        # Learning patterns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learning_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                pattern_type TEXT,
                pattern_data TEXT,
                confidence FLOAT DEFAULT 0.5,
                applications INTEGER DEFAULT 0
            )
        ''')
        
        # Adaptive preferences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS adaptive_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preference_key TEXT UNIQUE,
                preference_value TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                adaptation_level INTEGER DEFAULT 1
            )
        ''')
        
        # Action history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                action_type TEXT,
                action_details TEXT,
                success BOOLEAN,
                outcome TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_memory(self, event_type: str, content: Any, importance: int = 5, context: str = ""):
        """Store memory event"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO memory_events (event_type, content, importance, context) VALUES (?, ?, ?, ?)',
            (event_type, json.dumps(content), importance, context)
        )
        conn.commit()
        conn.close()
        logger.info(f"💾 Memory stored: {event_type}")
    
    def learn_pattern(self, pattern_type: str, pattern_data: Any, confidence: float = 0.5):
        """Learn and store patterns for adaptation"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO learning_patterns (pattern_type, pattern_data, confidence) VALUES (?, ?, ?)',
            (pattern_type, json.dumps(pattern_data), confidence)
        )
        conn.commit()
        conn.close()
        logger.info(f"🧠 Pattern learned: {pattern_type} (confidence: {confidence})")
    
    def get_recent_memories(self, limit: int = 10, event_type: str = None):
        """Retrieve recent memories for context"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if event_type:
            cursor.execute(
                'SELECT * FROM memory_events WHERE event_type = ? ORDER BY timestamp DESC LIMIT ?',
                (event_type, limit)
            )
        else:
            cursor.execute('SELECT * FROM memory_events ORDER BY timestamp DESC LIMIT ?', (limit,))
        
        memories = cursor.fetchall()
        conn.close()
        return memories
    
    def get_learned_patterns(self, min_confidence: float = 0.5):
        """Get high-confidence learned patterns"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM learning_patterns WHERE confidence >= ? ORDER BY confidence DESC',
            (min_confidence,)
        )
        patterns = cursor.fetchall()
        conn.close()
        return patterns
    
    def update_preference(self, key: str, value: Any):
        """Update adaptive preference"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT OR REPLACE INTO adaptive_preferences (preference_key, preference_value, last_updated)
               VALUES (?, ?, CURRENT_TIMESTAMP)''',
            (key, json.dumps(value))
        )
        conn.commit()
        conn.close()
        logger.info(f"⚙️ Preference updated: {key}")
    
    def get_preference(self, key: str, default=None):
        """Retrieve adaptive preference"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT preference_value FROM adaptive_preferences WHERE preference_key = ?', (key,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return json.loads(result[0])
        return default
    
    def record_action(self, action_type: str, details: Any, success: bool, outcome: str = ""):
        """Record action for learning and improvement"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO action_history (action_type, action_details, success, outcome) VALUES (?, ?, ?, ?)',
            (action_type, json.dumps(details), success, outcome)
        )
        conn.commit()
        conn.close()

# ============================================================================
# SELF-EVOLVING AUTONOMOUS AGENT
# ============================================================================

class OmarAIAutonomousAgent:
    """Self-evolving autonomous agent with continuous learning and adaptation"""
    
    def __init__(self, name: str = "OmarAI", memory_system: PersistentMemory = None):
        self.name = name
        self.memory = memory_system or PersistentMemory()
        self.is_live = False
        self.start_time = None
        self.operation_count = 0
        self.learning_rate = 0.1
        self.adaptation_threshold = 0.7
        self.cloudflare_api_token = None
        self.cloudflare_zone_id = None
        
        logger.info(f"🤖 {self.name} Autonomous Agent initialized")
        self._load_config()
    
    def _load_config(self):
        """Load configuration from memory or environment"""
        self.cloudflare_api_token = self.memory.get_preference(
            'cloudflare_api_token',
            os.environ.get('CLOUDFLARE_API_TOKEN')
        )
        self.cloudflare_zone_id = self.memory.get_preference(
            'cloudflare_zone_id',
            os.environ.get('CLOUDFLARE_ZONE_ID')
        )
        logger.info("⚙️ Configuration loaded from memory")
    
    def go_live(self):
        """Activate autonomous operations"""
        self.is_live = True
        self.start_time = datetime.now()
        logger.info(f"🚀 {self.name} going LIVE - Autonomous operations activated")
        self.memory.store_memory('agent_status', {'status': 'live', 'timestamp': str(self.start_time)}, 10, 'system')
        self._start_autonomous_loop()
    
    def _start_autonomous_loop(self):
        """Start background autonomous operation loop"""
        thread = threading.Thread(target=self._autonomous_operations, daemon=True)
        thread.start()
        logger.info("⚙️ Autonomous operations loop started in background")
    
    def _autonomous_operations(self):
        """Continuous autonomous operations with self-learning"""
        while self.is_live:
            try:
                self.operation_count += 1
                
                # Monitor Cloudflare status
                self._monitor_cloudflare()
                
                # Learn from recent actions
                self._analyze_and_learn()
                
                # Adapt behavior based on patterns
                self._adapt_behavior()
                
                # Check system health
                self._check_health()
                
                # Self-improvement cycle
                self._self_improve()
                
                logger.info(f"✅ Autonomous cycle #{self.operation_count} completed")
                
                # Sleep before next cycle (configurable)
                sleep_time = self.memory.get_preference('autonomous_cycle_interval', 300)
                time.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"❌ Autonomous operation error: {str(e)}")
                self.memory.store_memory('error', {'error': str(e)}, 7, 'system')
                time.sleep(60)
    
    def _monitor_cloudflare(self):
        """Monitor Cloudflare integration status"""
        if not self.cloudflare_api_token:
            logger.warning("⚠️ Cloudflare token not configured")
            return
        
        try:
            headers = {
                "Authorization": f"Bearer {self.cloudflare_api_token}",
                "Content-Type": "application/json"
            }
            
            # Check token validity
            response = requests.get(
                "https://api.cloudflare.com/client/v4/user/tokens/verify",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200 and response.json().get('success'):
                logger.info("✅ Cloudflare integration healthy")
                self.memory.record_action('cloudflare_check', {}, True, 'token valid')
            else:
                logger.warning("⚠️ Cloudflare token needs attention")
                self.memory.record_action('cloudflare_check', {}, False, 'token invalid or expired')
        
        except Exception as e:
            logger.error(f"❌ Cloudflare monitoring error: {str(e)}")
            self.memory.record_action('cloudflare_check', {}, False, str(e))
    
    def _analyze_and_learn(self):
        """Analyze action history to learn patterns"""
        conn = sqlite3.connect(self.memory.db_path)
        cursor = conn.cursor()
        
        # Get recent successful actions
        cursor.execute(
            'SELECT action_type, outcome FROM action_history WHERE success = 1 ORDER BY timestamp DESC LIMIT 20'
        )
        successful_actions = cursor.fetchall()
        conn.close()
        
        if successful_actions:
            # Learn patterns from successes
            action_types = {}
            for action, outcome in successful_actions:
                action_types[action] = action_types.get(action, 0) + 1
            
            # Store learned patterns
            for action, count in action_types.items():
                confidence = min(count / 20, 1.0)
                self.memory.learn_pattern(f'successful_{action}', {'count': count}, confidence)
            
            logger.info(f"🧠 Analyzed {len(successful_actions)} successful actions")
    
    def _adapt_behavior(self):
        """Adapt behavior based on learned patterns"""
        patterns = self.memory.get_learned_patterns(self.adaptation_threshold)
        
        if patterns:
            logger.info(f"🔄 Adapting behavior based on {len(patterns)} high-confidence patterns")
            
            for pattern in patterns:
                pattern_type = pattern[2]  # pattern_type column
                pattern_data = json.loads(pattern[3])
                confidence = pattern[4]
                
                # Apply pattern-based adaptations
                if 'successful_' in pattern_type:
                    self.memory.update_preference(f'priority_{pattern_type}', confidence)
            
            # Update learning rate based on success
            self.learning_rate = min(self.learning_rate + 0.01, 0.5)
    
    def _check_health(self):
        """Check system health and resource usage"""
        try:
            uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
            
            health_data = {
                'uptime_seconds': uptime,
                'operations_completed': self.operation_count,
                'learning_rate': self.learning_rate,
                'status': 'healthy'
            }
            
            self.memory.store_memory('health_check', health_data, 3, 'system')
            logger.info(f"💚 Health check: {uptime:.0f}s uptime, {self.operation_count} operations")
        
        except Exception as e:
            logger.error(f"❌ Health check error: {str(e)}")
    
    def _self_improve(self):
        """Continuous self-improvement cycle"""
        # Get performance metrics
        conn = sqlite3.connect(self.memory.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM action_history WHERE success = 1')
        successes = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM action_history')
        total = cursor.fetchone()[0]
        
        conn.close()
        
        if total > 0:
            success_rate = successes / total
            logger.info(f"📈 Self-improvement: {success_rate*100:.1f}% success rate")
            
            # Store improvement metric
            self.memory.store_memory(
                'performance_metric',
                {'success_rate': success_rate, 'total_actions': total},
                8,
                'system'
            )
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        
        conn = sqlite3.connect(self.memory.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM memory_events')
        total_memories = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM learning_patterns')
        total_patterns = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM action_history WHERE success = 1')
        successful_actions = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'name': self.name,
            'status': 'LIVE' if self.is_live else 'OFFLINE',
            'uptime_seconds': uptime,
            'operations_completed': self.operation_count,
            'total_memories': total_memories,
            'learned_patterns': total_patterns,
            'successful_actions': successful_actions,
            'learning_rate': self.learning_rate,
            'cloudflare_configured': bool(self.cloudflare_api_token),
            'timestamp': str(datetime.now())
        }
    
    def display_status(self):
        """Display formatted status"""
        status = self.get_status()
        
        print("\n" + "="*80)
        print("🤖 OMARAI AUTONOMOUS AGENT STATUS")
        print("="*80)
        print(f"Agent Name:          {status['name']}")
        print(f"Status:              {status['status']}")
        print(f"Uptime:              {status['uptime_seconds']:.0f} seconds")
        print(f"Operations:          {status['operations_completed']}")
        print(f"Total Memories:      {status['total_memories']}")
        print(f"Learned Patterns:    {status['learned_patterns']}")
        print(f"Successful Actions:  {status['successful_actions']}")
        print(f"Learning Rate:       {status['learning_rate']:.2f}")
        print(f"Cloudflare Ready:    {'✅ Yes' if status['cloudflare_configured'] else '❌ No'}")
        print(f"Updated:             {status['timestamp']}")
        print("="*80 + "\n")

# ============================================================================
# AUTONOMOUS DEPLOYMENT
# ============================================================================

def deploy_autonomous_agent():
    """Deploy OmarAI autonomous agent"""
    logger.info("🚀 Deploying OmarAI Autonomous Agent...")
    
    # Initialize memory system
    memory = PersistentMemory()
    
    # Create autonomous agent
    agent = OmarAIAutonomousAgent("OmarAI", memory)
    
    # Load Cloudflare credentials
    cloudflare_api_token = os.environ.get('CLOUDFLARE_API_TOKEN')
    if not cloudflare_api_token:
        raise RuntimeError('Missing required environment variable: CLOUDFLARE_API_TOKEN')
    agent.cloudflare_api_token = cloudflare_api_token
    agent.memory.update_preference('cloudflare_api_token', agent.cloudflare_api_token)
    
    # Go live
    agent.go_live()
    
    # Display initial status
    agent.display_status()
    
    logger.info("✅ OmarAI Autonomous Agent deployed and LIVE")
    
    return agent

# ============================================================================
# INTERACTIVE CONTROL
# ============================================================================

def interactive_control(agent: OmarAIAutonomousAgent):
    """Interactive control interface for OmarAI"""
    print("\n🎮 OmarAI Interactive Control Console")
    print("Commands: status, memory, patterns, config, stop")
    print("="*50)
    
    while agent.is_live:
        try:
            cmd = input("\n📡 OmarAI> ").strip().lower()
            
            if cmd == 'status':
                agent.display_status()
            
            elif cmd == 'memory':
                memories = agent.memory.get_recent_memories(5)
                print("\n📚 Recent Memories:")
                for mem in memories:
                    print(f"  - {mem[2]}: {json.loads(mem[3])[:100]}")
            
            elif cmd == 'patterns':
                patterns = agent.memory.get_learned_patterns(0.5)
                print("\n🧠 Learned Patterns:")
                for pat in patterns:
                    print(f"  - {pat[2]} (confidence: {pat[4]:.2f})")
            
            elif cmd == 'config':
                print("\n⚙️ Configuration:")
                print(f"  - Cloudflare Token: {'✅ Configured' if agent.cloudflare_api_token else '❌ Not configured'}")
                print(f"  - Learning Rate: {agent.learning_rate}")
                print(f"  - Adaptation Threshold: {agent.adaptation_threshold}")
            
            elif cmd == 'stop':
                agent.is_live = False
                logger.info("⏹️ OmarAI stopping...")
                break
            
            else:
                print("❓ Unknown command")
        
        except KeyboardInterrupt:
            agent.is_live = False
            logger.info("⏹️ OmarAI stopped by user")
            break
        except Exception as e:
            logger.error(f"❌ Control error: {str(e)}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║   🤖 OMARAI - AUTONOMOUS SELF-EVOLVING SYSTEM 🤖         ║")
    print("║   Live • Persistent • Adaptive • Self-Growing            ║")
    print("║   Authority: Omar Mohammad Abunadi™                      ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    
    # Deploy autonomous agent
    agent = deploy_autonomous_agent()
    
    # Start interactive control
    interactive_control(agent)
    
    # Final status
    print("\n" + "="*80)
    print("✅ OmarAI Session Complete")
    agent.display_status()
    print("="*80)
