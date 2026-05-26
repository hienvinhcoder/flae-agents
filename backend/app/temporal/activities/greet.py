from temporalio import activity


@activity.defn
async def greet(name: str) -> str:
    """
    Activity bất đồng bộ trả về lời chào.
    """
    return f"Hello, {name}!"
