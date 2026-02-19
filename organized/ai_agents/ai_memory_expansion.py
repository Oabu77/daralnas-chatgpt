#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
AI Agent Memory Expansion System
Uses external storage to expand memory capacity when needed
© QuranChain™ | Omar Mohammad Abunadi™
"""

import os
import sys
import json
import shutil
import psutil
from pathlib import Path
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AIMemoryExpansion:
    """Manages external disk storage for AI agent memory expansion"""
    
    # External storage paths (check these in order)
    EXTERNAL_STORAGE_PATHS = [
        "/media/omar/EXTERNAL",  # USB drives
        "/mnt/external",
        "/media/omar",
        "/run/media/omar",
        os.path.expanduser("~/external_storage"),
    ]
    
    # Memory thresholds
    MEMORY_THRESHOLD_PERCENT = 85  # Expand when > 85% memory used
    DISK_THRESHOLD_PERCENT = 90    # Warn when > 90% disk used
    
    def __init__(self):
        self.project_dir = Path("/home/omar/Desktop/QuranChain")
        self.external_path = None
        self.expansion_active = False
        
        # Find available external storage
        self.detect_external_storage()
        
        logger.info("🧠 AI Memory Expansion System initialized")
        if self.external_path:
            logger.info(f"   External storage: {self.external_path}")
        else:
            logger.warning("   No external storage detected - using local fallback")
    
    def detect_external_storage(self):
        """Detect available external storage"""
        for path in self.EXTERNAL_STORAGE_PATHS:
            if os.path.exists(path) and os.path.isdir(path):
                try:
                    # Check if writable
                    test_file = Path(path) / ".quranchain_test"
                    test_file.write_text("test")
                    test_file.unlink()
                    
                    # Check available space (need at least 10GB)
                    stat = shutil.disk_usage(path)
                    available_gb = stat.free / (1024**3)
                    
                    if available_gb >= 10:
                        self.external_path = Path(path) / "QuranChain_Expansion"
                        self.external_path.mkdir(exist_ok=True)
                        logger.info(f"✅ Found external storage: {path} ({available_gb:.1f}GB free)")
                        return
                except:
                    continue
        
        # Fallback to home directory expansion area
        self.external_path = Path.home() / "QuranChain_MemoryExpansion"
        self.external_path.mkdir(exist_ok=True)
        logger.info(f"ℹ️  Using fallback expansion: {self.external_path}")
    
    def check_memory_pressure(self) -> dict:
        """Check system memory and disk usage"""
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(str(self.project_dir))
        
        return {
            "memory_percent": mem.percent,
            "memory_available_gb": mem.available / (1024**3),
            "disk_percent": disk.percent,
            "disk_available_gb": disk.free / (1024**3),
            "needs_expansion": mem.percent > self.MEMORY_THRESHOLD_PERCENT or disk.percent > self.DISK_THRESHOLD_PERCENT
        }
    
    def expand_temp_storage(self) -> dict:
        """Move temporary files to external storage"""
        moved_files = []
        total_freed_mb = 0
        
        # Directories to offload
        offload_dirs = [
            (self.project_dir / ".snapshots", "snapshots"),
            (self.project_dir / "__pycache__", "pycache"),
            (self.project_dir / "monitoring_reports", "monitoring_reports"),
        ]
        
        for source_dir, dir_name in offload_dirs:
            if not source_dir.exists():
                continue
            
            target_dir = self.external_path / dir_name
            
            try:
                # Calculate size before move
                size_mb = sum(f.stat().st_size for f in source_dir.rglob('*') if f.is_file()) / (1024**2)
                
                # Move to external storage
                if target_dir.exists():
                    shutil.rmtree(target_dir)
                shutil.move(str(source_dir), str(target_dir))
                
                # Create symlink back to original location
                os.symlink(str(target_dir), str(source_dir))
                
                moved_files.append({
                    "source": str(source_dir),
                    "target": str(target_dir),
                    "size_mb": size_mb
                })
                total_freed_mb += size_mb
                
                logger.info(f"✅ Moved {dir_name} to external storage ({size_mb:.1f}MB)")
            
            except Exception as e:
                logger.warning(f"⚠️  Could not move {dir_name}: {e}")
        
        return {
            "moved_files": moved_files,
            "total_freed_mb": total_freed_mb,
            "expansion_path": str(self.external_path)
        }
    
    def expand_ai_cache(self) -> dict:
        """Move AI agent cache to external storage"""
        cache_dirs = [
            self.project_dir / "ai_workforce" / ".cache",
            self.project_dir / "crm" / ".cache",
        ]
        
        total_freed_mb = 0
        
        for cache_dir in cache_dirs:
            if not cache_dir.exists():
                cache_dir.mkdir(parents=True, exist_ok=True)
            
            external_cache = self.external_path / "ai_cache" / cache_dir.name
            
            try:
                # Calculate size
                if cache_dir.exists() and any(cache_dir.iterdir()):
                    size_mb = sum(f.stat().st_size for f in cache_dir.rglob('*') if f.is_file()) / (1024**2)
                else:
                    size_mb = 0
                
                # Move to external if has content
                if size_mb > 0:
                    if external_cache.exists():
                        shutil.rmtree(external_cache)
                    external_cache.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(cache_dir), str(external_cache))
                    
                    # Symlink back
                    os.symlink(str(external_cache), str(cache_dir))
                    
                    total_freed_mb += size_mb
                    logger.info(f"✅ Moved AI cache to external storage ({size_mb:.1f}MB)")
            
            except Exception as e:
                logger.warning(f"⚠️  Could not move cache {cache_dir}: {e}")
        
        return {
            "total_freed_mb": total_freed_mb,
            "cache_path": str(self.external_path / "ai_cache")
        }
    
    def compress_old_logs(self) -> dict:
        """Compress old logs to external storage"""
        import tarfile
        import gzip
        from datetime import timedelta
        
        compressed = []
        total_freed_mb = 0
        
        log_dirs = [
            self.project_dir / "logs",
            self.project_dir / "monitoring_logs"
        ]
        
        cutoff_date = datetime.now() - timedelta(days=7)
        
        for log_dir in log_dirs:
            if not log_dir.exists():
                continue
            
            # Find old log files
            old_logs = [
                f for f in log_dir.glob("*.log")
                if f.stat().st_mtime < cutoff_date.timestamp()
            ]
            
            if not old_logs:
                continue
            
            # Create archive
            archive_name = f"{log_dir.name}_{datetime.now().strftime('%Y%m%d')}.tar.gz"
            archive_path = self.external_path / "archives" / archive_name
            archive_path.parent.mkdir(parents=True, exist_ok=True)
            
            try:
                with tarfile.open(archive_path, "w:gz") as tar:
                    for log_file in old_logs:
                        tar.add(log_file, arcname=log_file.name)
                        size_mb = log_file.stat().st_size / (1024**2)
                        total_freed_mb += size_mb
                        log_file.unlink()
                
                compressed.append({
                    "archive": str(archive_path),
                    "files": len(old_logs)
                })
                
                logger.info(f"✅ Compressed {len(old_logs)} old logs to {archive_name}")
            
            except Exception as e:
                logger.warning(f"⚠️  Could not compress logs: {e}")
        
        return {
            "compressed_archives": compressed,
            "total_freed_mb": total_freed_mb
        }
    
    def auto_expand(self) -> dict:
        """Automatically expand storage when needed"""
        status = self.check_memory_pressure()
        
        if not status['needs_expansion']:
            logger.info("✅ No expansion needed - memory and disk OK")
            return {
                "expanded": False,
                "reason": "No pressure detected",
                "status": status
            }
        
        logger.info("🚀 EXPANDING: disk/memory capacity exceeded threshold")
        logger.info("   Moving data to external storage...")
        
        # Perform expansion
        temp_result = self.expand_temp_storage()
        cache_result = self.expand_ai_cache()
        compress_result = self.compress_old_logs()
        
        total_freed = temp_result['total_freed_mb'] + cache_result['total_freed_mb'] + compress_result['total_freed_mb']
        
        # Check status after expansion
        new_status = self.check_memory_pressure()
        
        result = {
            "expanded": True,
            "total_freed_mb": total_freed,
            "total_freed_gb": total_freed / 1024,
            "temp_storage": temp_result,
            "cache_storage": cache_result,
            "compressed_logs": compress_result,
            "before": status,
            "after": new_status,
            "external_path": str(self.external_path)
        }
        
        logger.info(f"✅ Expansion complete - freed {total_freed:.1f}MB ({total_freed/1024:.2f}GB)")
        logger.info(f"   Disk usage: {status['disk_percent']:.1f}% → {new_status['disk_percent']:.1f}%")
        
        # Save expansion report
        report_file = self.project_dir / "monitoring_logs" / "memory_expansion.json"
        with open(report_file, 'w') as f:
            json.dump(result, f, indent=2)
        
        return result
    
    def get_expansion_status(self) -> dict:
        """Get current expansion status"""
        if not self.external_path or not self.external_path.exists():
            return {"active": False, "reason": "No external storage"}
        
        # Check what's in external storage
        external_size = sum(f.stat().st_size for f in self.external_path.rglob('*') if f.is_file()) / (1024**3)
        
        status = self.check_memory_pressure()
        
        return {
            "active": self.expansion_active,
            "external_path": str(self.external_path),
            "external_storage_gb": external_size,
            "system_status": status
        }


def main():
    """Main entry point"""
    print("\n" + "="*80)
    print("🧠 AI MEMORY EXPANSION SYSTEM")
    print("="*80 + "\n")
    
    expander = AIMemoryExpansion()
    
    # Check current status
    status = expander.check_memory_pressure()
    print(f"📊 Current System Status:")
    print(f"   Memory: {status['memory_percent']:.1f}% used ({status['memory_available_gb']:.1f}GB available)")
    print(f"   Disk:   {status['disk_percent']:.1f}% used ({status['disk_available_gb']:.1f}GB available)")
    
    if status['needs_expansion']:
        print(f"\n⚠️  THRESHOLD EXCEEDED - Expansion needed")
    else:
        print(f"\n✅ System resources OK - No expansion needed")
    
    # Perform auto-expansion if needed
    print(f"\n🚀 Running auto-expansion...")
    result = expander.auto_expand()
    
    if result['expanded']:
        print(f"\n✅ EXPANSION COMPLETE")
        print(f"   Freed: {result['total_freed_gb']:.2f}GB")
        print(f"   External storage: {result['external_path']}")
        print(f"\n   Disk usage improved:")
        print(f"   Before: {result['before']['disk_percent']:.1f}%")
        print(f"   After:  {result['after']['disk_percent']:.1f}%")
    
    print("\n" + "="*80)
    print("© QuranChain™ | Omar Mohammad Abunadi™")
    print("="*80 + "\n")


if __name__ == '__main__':
    main()
