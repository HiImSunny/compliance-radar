import httpx
from config import settings
from mcp_client import mcp_client


class ScrapeEngine:
    def __init__(self):
        self.api_url = settings.brightdata_api_url
        self.headers = {"Authorization": f"Bearer {settings.brightdata_token}"}

    async def scrape(self, url: str, country: str = "") -> str:
        payload = {"zone": settings.brightdata_zone, "url": url, "format": "raw"}
        if country:
            payload["country"] = country
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(self.api_url, json=payload, headers=self.headers)
            err = r.headers.get("x-brd-error", "")
            if err:
                raise RuntimeError(f"Web Unlocker error: {err}")
            return r.text

    async def search_enforcement(self, query: str) -> list[dict]:
        return await mcp_client.search(query)

    async def scrape_markdown(self, url: str) -> str:
        return await mcp_client.scrape(url)

    async def discover_regulations(self, query: str, **kwargs) -> list[dict]:
        return await mcp_client.discover(query, **kwargs)
