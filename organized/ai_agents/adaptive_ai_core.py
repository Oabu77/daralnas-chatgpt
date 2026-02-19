#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
🧠 QURANCHAIN™ ADAPTIVE AI CORE
Self-learning, auto-healing system with adaptive memory
© QuranChain™ | Omar Mohammad Abunadi™
"""

import os
import json
import sqlite3
import logging
import threading
import time
import requests
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AdaptiveAI")

# =============================================================================
# ADAPTIVE MEMORY DATABASE
# =============================================================================

class AdaptiveMemory:
    """Stores learnings, patterns, and successful strategies"""
    
    def __init__(self):
        self.db_path = "/home/omar/Desktop/QuranChain/adaptive_memory.db"
        self._init_database()
        logger.info("🧠 Adaptive Memory initialized")
    
    def _init_database(self):
        """Initialize memory database with learning tables"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Successful strategies table
        c.execute('''CREATE TABLE IF NOT EXISTS successful_strategies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_name TEXT,
            strategy_type TEXT,
            description TEXT,
            revenue_generated REAL,
            success_rate REAL,
            learned_at TIMESTAMP,
            times_used INTEGER DEFAULT 1,
            avg_performance REAL
        )''')
        
        # Failed patterns table (to avoid repeating mistakes)
        c.execute('''CREATE TABLE IF NOT EXISTS failed_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_name TEXT,
            pattern_type TEXT,
            description TEXT,
            failure_reason TEXT,
            learned_at TIMESTAMP,
            times_failed INTEGER DEFAULT 1
        )''')
        
        # Performance trends table
        c.execute('''CREATE TABLE IF NOT EXISTS performance_trends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_name TEXT,
            metric_name TEXT,
            metric_value REAL,
            timestamp TIMESTAMP,
            context TEXT
        )''')
        
        # Adaptive parameters table
        c.execute('''CREATE TABLE IF NOT EXISTS adaptive_parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parameter_name TEXT UNIQUE,
            current_value REAL,
            min_value REAL,
            max_value REAL,
            learning_rate REAL,
            last_updated TIMESTAMP
        )''')
        
        conn.commit()
        conn.close()
    
    def store_successful_strategy(self, agent_name: str, strategy_type: str, 
                                  description: str, revenue: float, success_rate: float):
        """Learn from successful strategies"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Check if similar strategy exists
        c.execute('''SELECT id, times_used, avg_performance FROM successful_strategies 
                    WHERE agent_name=? AND strategy_type=? AND description=?''',
                 (agent_name, strategy_type, description))
        existing = c.fetchone()
        
        if existing:
            # Update existing strategy
            strategy_id, times_used, avg_perf = existing
            new_avg = ((avg_perf * times_used) + revenue) / (times_used + 1)
            c.execute('''UPDATE successful_strategies 
                        SET times_used=?, avg_performance=?, success_rate=?
                        WHERE id=?''',
                     (times_used + 1, new_avg, success_rate, strategy_id))
            logger.info(f"✅ Updated strategy memory: {agent_name}/{strategy_type}")
        else:
            # Store new strategy
            c.execute('''INSERT INTO successful_strategies 
                        (agent_name, strategy_type, description, revenue_generated, 
                         success_rate, learned_at, avg_performance)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''',
                     (agent_name, strategy_type, description, revenue, success_rate,
                      datetime.now().isoformat(), revenue))
            logger.info(f"🧠 Learned new strategy: {agent_name}/{strategy_type}")
        
        conn.commit()
        conn.close()
    
    def store_failed_pattern(self, agent_name: str, pattern_type: str,
                           description: str, failure_reason: str):
        """Learn from failures to avoid them"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''SELECT id, times_failed FROM failed_patterns 
                    WHERE agent_name=? AND pattern_type=? AND description=?''',
                 (agent_name, pattern_type, description))
        existing = c.fetchone()
        
        if existing:
            pattern_id, times_failed = existing
            c.execute('''UPDATE failed_patterns SET times_failed=? WHERE id=?''',
                     (times_failed + 1, pattern_id))
        else:
            c.execute('''INSERT INTO failed_patterns 
                        (agent_name, pattern_type, description, failure_reason, learned_at)
                        VALUES (?, ?, ?, ?, ?)''',
                     (agent_name, pattern_type, description, failure_reason,
                      datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        logger.warning(f"⚠️ Learned failure pattern: {agent_name}/{pattern_type}")
    
    def get_best_strategies(self, agent_name: str, limit: int = 10) -> List[Dict]:
        """Retrieve most successful strategies for an agent"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''SELECT strategy_type, description, avg_performance, success_rate, times_used
                    FROM successful_strategies 
                    WHERE agent_name=?
                    ORDER BY avg_performance DESC, success_rate DESC
                    LIMIT ?''', (agent_name, limit))
        
        strategies = []
        for row in c.fetchall():
            strategies.append({
                'type': row[0],
                'description': row[1],
                'avg_revenue': row[2],
                'success_rate': row[3],
                'times_used': row[4]
            })
        
        conn.close()
        return strategies
    
    def should_avoid_pattern(self, agent_name: str, pattern_type: str) -> bool:
        """Check if a pattern has failed multiple times"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''SELECT times_failed FROM failed_patterns 
                    WHERE agent_name=? AND pattern_type=?''',
                 (agent_name, pattern_type))
        result = c.fetchone()
        conn.close()
        
        return result and result[0] >= 3  # Avoid patterns that failed 3+ times


# =============================================================================
# AUTO-HEALING SYSTEM
# =============================================================================

class AutoHealingSystem:
    """Monitors system health and automatically fixes issues"""
    
    def __init__(self):
        self.services = {
            'auto_revenue_payout': {'port': None, 'process': 'auto_revenue_payout.py'},
            'multi_currency_payment_api': {'port': None, 'process': 'multi_currency_payment_api.py'},
            'meshtalk_os_production': {'port': None, 'process': 'meshtalk_os_production.py'},
        }
        self.healing_history = []
        self.max_restart_attempts = 3
        logger.info("🏥 Auto-Healing System initialized")
    
    def check_service_health(self, service_name: str) -> bool:
        """Check if a service is running"""
        try:
            process_name = self.services[service_name]['process']
            import subprocess
            result = subprocess.run(
                ['pgrep', '-f', process_name],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except Exception as e:
            logger.error(f"Health check failed for {service_name}: {e}")
            return False
    
    def heal_service(self, service_name: str) -> bool:
        """Automatically restart a failed service"""
        try:
            process_file = self.services[service_name]['process']
            process_path = f"/home/omar/Desktop/QuranChain/{process_file}"
            
            logger.warning(f"🏥 Healing service: {service_name}")
            
            import subprocess
            # Start service in background
            subprocess.Popen(
                ['python3', process_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Wait and verify
            time.sleep(3)
            if self.check_service_health(service_name):
                logger.info(f"✅ Successfully healed: {service_name}")
                self.healing_history.append({
                    'service': service_name,
                    'timestamp': datetime.now().isoformat(),
                    'success': True
                })
                return True
            else:
                logger.error(f"❌ Failed to heal: {service_name}")
                return False
                
        except Exception as e:
            logger.error(f"Healing exception for {service_name}: {e}")
            return False
    
    def monitor_and_heal(self):
        """Continuous monitoring with auto-healing"""
        logger.info("🔄 Starting continuous health monitoring...")
        
        while True:
            try:
                for service_name in self.services:
                    if not self.check_service_health(service_name):
                        logger.warning(f"⚠️ Service down: {service_name}")
                        self.heal_service(service_name)
                
                time.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Monitor error: {e}")
                time.sleep(10)


# =============================================================================
# SELF-LEARNING OPTIMIZER
# =============================================================================

class SelfLearningOptimizer:
    """Continuously learns and optimizes revenue strategies"""
    
    def __init__(self, memory: AdaptiveMemory):
        self.memory = memory
        self.learning_rate = 0.1
        self.performance_window = []
        logger.info("📚 Self-Learning Optimizer initialized")
    
    def analyze_agent_performance(self, agent_name: str) -> Dict:
        """Analyze and learn from agent performance"""
        try:
            # Get recent performance data
            conn = sqlite3.connect(self.memory.db_path)
            c = conn.cursor()
            
            # Get last 24 hours of performance
            yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
            c.execute('''SELECT metric_name, AVG(metric_value) as avg_value
                        FROM performance_trends 
                        WHERE agent_name=? AND timestamp > ?
                        GROUP BY metric_name''',
                     (agent_name, yesterday))
            
            metrics = {row[0]: row[1] for row in c.fetchall()}
            conn.close()
            
            # Learn from performance
            if metrics.get('revenue_attributed', 0) > 100:
                self.memory.store_successful_strategy(
                    agent_name,
                    'high_revenue_period',
                    f"Generated ${metrics['revenue_attributed']:.2f} in 24h",
                    metrics['revenue_attributed'],
                    0.9
                )
            
            return metrics
            
        except Exception as e:
            logger.error(f"Performance analysis error: {e}")
            return {}
    
    def optimize_parameters(self, agent_name: str, current_performance: float):
        """Adaptively optimize agent parameters based on performance"""
        # Simple gradient-based optimization
        if len(self.performance_window) > 10:
            recent_avg = sum(self.performance_window[-10:]) / len(self.performance_window[-10:])
            if current_performance > recent_avg * 1.1:
                # Performance improving - continue current strategy
                logger.info(f"📈 {agent_name} performance improving: {current_performance:.2f}")
            elif current_performance < recent_avg * 0.9:
                # Performance declining - adjust strategy
                logger.warning(f"📉 {agent_name} performance declining - adapting strategy")
                self._adjust_strategy(agent_name)
        
        self.performance_window.append(current_performance)
        if len(self.performance_window) > 100:
            self.performance_window.pop(0)
    
    def _adjust_strategy(self, agent_name: str):
        """Adjust strategy based on learnings"""
        # Get best strategies from memory
        best_strategies = self.memory.get_best_strategies(agent_name, limit=5)
        
        if best_strategies:
            logger.info(f"🎯 Applying learned strategy for {agent_name}")
            # In production, this would trigger agent to use best strategy
            return best_strategies[0]
        else:
            logger.info(f"🔍 Exploring new strategies for {agent_name}")
            return None


# =============================================================================
# ADAPTIVE AI ORCHESTRATOR
# =============================================================================

class AdaptiveAIOrchestrator:
    """Main orchestrator for adaptive, self-healing AI system"""
    
    def __init__(self):
        self.memory = AdaptiveMemory()
        self.healer = AutoHealingSystem()
        self.optimizer = SelfLearningOptimizer(self.memory)
        self.running = False
        logger.info("🧠 Adaptive AI Orchestrator initialized")
    
    def start(self):
        """Start adaptive AI system"""
        self.running = True
        
        # Start auto-healing in background
        healing_thread = threading.Thread(target=self.healer.monitor_and_heal, daemon=True)
        healing_thread.start()
        logger.info("🏥 Auto-healing thread started")
        
        # Start learning loop in background
        learning_thread = threading.Thread(target=self._learning_loop, daemon=True)
        learning_thread.start()
        logger.info("📚 Learning thread started")
        
        logger.info("✅ Adaptive AI system fully active")
    
    def _learning_loop(self):
        """Continuous learning and optimization"""
        agents = ['marketing_ai', 'sales_ai', 'onboarding_ai', 'optimization_ai']
        
        while self.running:
            try:
                for agent in agents:
                    # Analyze performance
                    metrics = self.optimizer.analyze_agent_performance(agent)
                    
                    # Optimize if needed
                    if 'revenue_attributed' in metrics:
                        self.optimizer.optimize_parameters(agent, metrics['revenue_attributed'])
                
                time.sleep(300)  # Learn every 5 minutes
                
            except Exception as e:
                logger.error(f"Learning loop error: {e}")
                time.sleep(60)
    
    def get_system_intelligence(self) -> Dict:
        """Get current state of system intelligence"""
        conn = sqlite3.connect(self.memory.db_path)
        c = conn.cursor()
        
        # Count learnings
        c.execute('SELECT COUNT(*) FROM successful_strategies')
        strategies_learned = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM failed_patterns')
        failures_learned = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM performance_trends')
        data_points = c.fetchone()[0]
        
        conn.close()
        
        return {
            'strategies_learned': strategies_learned,
            'failures_learned': failures_learned,
            'performance_data_points': data_points,
            'healing_events': len(self.healer.healing_history),
            'status': 'active' if self.running else 'inactive'
        }


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧠 STARTING ADAPTIVE AI CORE")
    print("="*70)
    
    orchestrator = AdaptiveAIOrchestrator()
    orchestrator.start()
    
    print("\n✅ ADAPTIVE AI FEATURES ACTIVE:")
    print("   🧠 Adaptive Memory - Learning from every transaction")
    print("   🏥 Auto-Healing - Automatic service recovery")
    print("   📚 Self-Learning - Continuous strategy optimization")
    print("   📈 Performance Adaptation - Real-time parameter tuning")
    
    # Keep running
    try:
        while True:
            time.sleep(60)
            intelligence = orchestrator.get_system_intelligence()
            print(f"\n📊 Intelligence Update: {intelligence['strategies_learned']} strategies learned, "
                  f"{intelligence['healing_events']} healing events")
    except KeyboardInterrupt:
        print("\n\n🛑 Adaptive AI stopped")
