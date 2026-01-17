#!/usr/bin/env python3
"""
Simple test for qc_agent.py to verify basic functionality
"""
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

# Set required environment variables for testing
os.environ['QC_AGENT_TOKEN_FOUNDER'] = 'test_founder_token_12345'
os.environ['QC_AGENT_TOKEN_WORKER'] = 'test_worker_token_67890'
os.environ['QC_AGENT_ROLE_DEFAULT'] = 'worker'
os.environ['QC_AGENT_RATE_LIMIT_PER_MIN'] = '30'

# Import the agent
from qc_agent import APP, _role, _allowlist, ALLOW_WORKER, ALLOW_FOUNDER

def test_role_detection():
    """Test that tokens are correctly mapped to roles"""
    print("Testing role detection...")
    
    # Test founder token
    role = _role('test_founder_token_12345')
    assert role == 'founder', f"Expected 'founder', got '{role}'"
    print("  ✅ Founder token correctly identified")
    
    # Test worker token
    role = _role('test_worker_token_67890')
    assert role == 'worker', f"Expected 'worker', got '{role}'"
    print("  ✅ Worker token correctly identified")
    
    # Test invalid token
    try:
        _role('invalid_token')
        assert False, "Should have raised HTTPException for invalid token"
    except Exception as e:
        if "401" in str(e) or "Unauthorized" in str(e):
            print("  ✅ Invalid token correctly rejected")
        else:
            raise

def test_allowlists():
    """Test that allowlists are correctly configured"""
    print("\nTesting allowlists...")
    
    # Test worker allowlist
    worker_cmds = _allowlist('worker')
    assert 'uptime' in worker_cmds, "uptime should be allowed for workers"
    assert 'systemctl' not in worker_cmds, "systemctl should NOT be allowed for workers"
    print("  ✅ Worker allowlist correct")
    
    # Test founder allowlist
    founder_cmds = _allowlist('founder')
    assert 'uptime' in founder_cmds, "uptime should be allowed for founders"
    assert 'systemctl' in founder_cmds, "systemctl should be allowed for founders"
    print("  ✅ Founder allowlist correct")
    
    # Verify founder has all worker commands plus more
    assert worker_cmds.issubset(founder_cmds), "Founder should have all worker commands"
    print("  ✅ Founder allowlist is superset of worker allowlist")

def test_command_sets():
    """Test that command sets are properly defined"""
    print("\nTesting command sets...")
    
    # Test worker commands
    worker_telemetry_cmds = {'ss', 'lsof', 'ps', 'netstat', 'ip', 'ping', 
                             'uname', 'uptime', 'df', 'du', 'free', 'whoami', 'pwd'}
    assert ALLOW_WORKER == worker_telemetry_cmds, "Worker commands don't match expected set"
    print("  ✅ Worker commands: telemetry only")
    
    # Test founder has additional operational commands
    founder_only = ALLOW_FOUNDER - ALLOW_WORKER
    expected_founder_only = {'systemctl', 'journalctl', 'docker', 'git', 'cloudflared', 'curl', 'jq'}
    assert founder_only == expected_founder_only, f"Founder-only commands don't match. Expected {expected_founder_only}, got {founder_only}"
    print("  ✅ Founder commands: worker + operational")

def test_fastapi_app():
    """Test that FastAPI app is properly configured"""
    print("\nTesting FastAPI app...")
    
    # Check app is created
    assert APP is not None, "FastAPI app should be created"
    print("  ✅ FastAPI app created")
    
    # Check routes exist
    routes = [route.path for route in APP.routes]
    assert '/health' in routes, "Health endpoint should exist"
    assert '/run' in routes, "Run endpoint should exist"
    print("  ✅ Required endpoints exist")

if __name__ == '__main__':
    print("=" * 60)
    print("QC Agent Tests")
    print("=" * 60)
    
    try:
        test_role_detection()
        test_allowlists()
        test_command_sets()
        test_fastapi_app()
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
