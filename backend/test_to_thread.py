import asyncio
import subprocess

async def main():
    result = await asyncio.to_thread(
        subprocess.run,
        ["echo", "hello"],
        capture_output=True,
        text=True
    )
    print(type(result))

asyncio.run(main())
