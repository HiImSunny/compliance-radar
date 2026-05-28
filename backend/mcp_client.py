import json
import asyncio
from typing import Any
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from config import settings


class MCPClient:
    def __init__(self):
        self.server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@brightdata/mcp"],
            env={"API_TOKEN": settings.brightdata_token},
        )
        self._session: ClientSession | None = None
        self._read: Any = None
        self._write: Any = None
        self._ctx: Any = None

    async def _ensure_connected(self):
        if self._session is not None:
            return
        ctx = stdio_client(self.server_params)
        read, write = await ctx.__aenter__()
        session = ClientSession(read, write)
        await session.__aenter__()
        await session.initialize()
        self._ctx = ctx
        self._read = read
        self._write = write
        self._session = session

    async def search(self, query: str, num: int = 5, engine: str = "google", geo_location: str = "") -> list[dict]:
        await self._ensure_connected()
        kwargs = {"query": query, "num": num, "engine": engine}
        if geo_location:
            kwargs["geo_location"] = geo_location
        result = await self._session.call_tool("search_engine", kwargs)
        text = result.content[0].text
        data = json.loads(text)
        return data.get("organic", [])

    async def scrape(self, url: str) -> str:
        await self._ensure_connected()
        result = await self._session.call_tool("scrape_as_markdown", {"url": url})
        return result.content[0].text

    async def discover(
        self,
        query: str,
        intent: str = "",
        num_results: int = 10,
        start_date: str = "",
        end_date: str = "",
    ) -> list[dict]:
        await self._ensure_connected()
        kwargs = {"query": query, "num_results": num_results}
        if intent:
            kwargs["intent"] = intent
        if start_date:
            kwargs["start_date"] = start_date
        if end_date:
            kwargs["end_date"] = end_date
        result = await self._session.call_tool("discover", kwargs)
        text = result.content[0].text
        data = json.loads(text)
        return data.get("results", [])

    async def close(self):
        if self._session:
            await self._session.__aexit__(None, None, None)
        if self._ctx:
            await self._ctx.__aexit__(None, None, None)
        self._session = None
        self._ctx = None


mcp_client = MCPClient()