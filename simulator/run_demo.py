import asyncio
import csv
from datetime import datetime
from simulator import DroneSimulator

sample_mission = {
    "mission_id": 1,
    "waypoints": [
        {"lat": 40.7128, "lng": -74.0060, "alt": 50},
        {"lat": 40.7138, "lng": -74.0050, "alt": 50},
        {"lat": 40.7148, "lng": -74.0040, "alt": 50}
    ]
}


async def telemetry_logger(sim: DroneSimulator, path: str = "simulator_demo_telemetry.csv"):
    """Periodically write telemetry snapshots to CSV for offline inspection."""
    # Ensure header
    header_written = False
    while sim.running:
        telemetry = sim.get_telemetry_data()
        if telemetry:
            # Add a logging timestamp
            telemetry_row = {
                "logged_at": datetime.utcnow().isoformat(),
                **telemetry
            }

            # Write CSV
            with open(path, "a", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=list(telemetry_row.keys()))
                if not header_written:
                    writer.writeheader()
                    header_written = True
                writer.writerow(telemetry_row)

        await asyncio.sleep(1)


async def main():
    sim = DroneSimulator()

    # Force standalone mode (don't attempt websocket connection)
    sim.backend_url = None

    # Start mission locally (no backend required)
    sim.start_mission(sample_mission)

    # Run simulator loop and telemetry logger concurrently
    tasks = [
        asyncio.create_task(sim.run()),
        asyncio.create_task(telemetry_logger(sim)),
    ]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass


if __name__ == '__main__':
    asyncio.run(main())
