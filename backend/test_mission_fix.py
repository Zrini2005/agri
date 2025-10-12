import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
MISSION_ID = 22  # Your mission that's stuck

def test_mission_completion():
    """Test the mission completion endpoints."""
    
    print("🔧 Testing Mission Completion Fix")
    print("=" * 50)
    
    # Test 1: Force complete the stuck mission
    print(f"\n1️⃣ Force completing mission {MISSION_ID}...")
    try:
        response = requests.post(f"{BASE_URL}/missions/{MISSION_ID}/force-complete")
        if response.status_code == 200:
            print(f"✅ SUCCESS: {response.json()['message']}")
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Backend server not running on port 8000")
        print("   Please start the backend first: python main.py")
        return
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return
    
    # Test 2: Check mission status
    print(f"\n2️⃣ Checking mission {MISSION_ID} status...")
    try:
        response = requests.get(f"{BASE_URL}/missions/{MISSION_ID}")
        if response.status_code == 200:
            mission = response.json()
            print(f"✅ Mission Status: {mission['status']}")
            print(f"✅ Progress: {mission.get('progress', 'N/A')}%")
            print(f"✅ Started: {mission.get('started_at', 'N/A')}")
            print(f"✅ Completed: {mission.get('completed_at', 'N/A')}")
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
    
    # Test 3: Check all missions
    print(f"\n3️⃣ Checking all missions...")
    try:
        response = requests.get(f"{BASE_URL}/missions")
        if response.status_code == 200:
            missions = response.json()
            print(f"✅ Found {len(missions)} missions:")
            for mission in missions[:5]:  # Show first 5
                print(f"   Mission {mission['id']}: {mission['status']} - {mission.get('progress', 0)}%")
        else:
            print(f"❌ ERROR: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {e}")
    
    print(f"\n🎉 Test completed!")
    print(f"💡 Now refresh your browser to see the updated status!")

if __name__ == "__main__":
    test_mission_completion()