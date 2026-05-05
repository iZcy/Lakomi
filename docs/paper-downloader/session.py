"""
Ezproxy session management.

Supports two modes:
  - connect (default): Connect to an existing Chrome via CDP (no new browser)
  - launch: Launch a new Playwright-managed Chromium instance
"""

import asyncio
import random
from typing import Optional

from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from rich.console import Console
from rich.panel import Panel

from config import to_ezproxy_url


CDP_URL = "http://localhost:9222"

# Common viewport resolutions (realistic laptop/desktop sizes)
VIEWPORTS = [
    {'width': 1366, 'height': 768},   # Most common laptop
    {'width': 1440, 'height': 900},   # Laptop / small desktop
    {'width': 1536, 'height': 864},   # Scaled 1080p laptop
    {'width': 1600, 'height': 900},   # Common desktop
    {'width': 1920, 'height': 1080},  # Full HD desktop
    {'width': 1280, 'height': 720},   # HD laptop
]

# Realistic user agents
USER_AGENTS = [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
]


class EzproxySession:
    """Manages browser session with ezproxy authentication."""

    def __init__(self, config: dict, console: Console, connect_cdp: bool = True):
        self.config = config
        self.console = console
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None
        self._connect_cdp = connect_cdp
        self._owns_browser = False  # True only if we launched it ourselves

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self):
        """Start browser session — connect to existing Chrome or launch new one."""
        self._playwright = await async_playwright().start()

        if self._connect_cdp:
            try:
                self.browser = await self._playwright.chromium.connect_over_cdp(CDP_URL)
                # Use the first context and create a fresh new page
                # (existing page refs via CDP are often stale)
                contexts = self.browser.contexts
                if contexts:
                    self.context = contexts[0]
                else:
                    self.context = await self.browser.new_context()

                # Create a fresh page (new tab in user's browser)
                self.page = await self.context.new_page()
                self.console.print("[dim]Created new page in existing browser[/dim]")

                self._owns_browser = False
                self.console.print("[green]✓ Connected to existing Chrome via CDP[/green]")
                return
            except Exception as e:
                self.console.print(f"[yellow]⚠️  CDP connect failed ({e}), falling back to launch...[/yellow]")

        # Fallback: launch a new browser
        self._owns_browser = True
        viewport = random.choice(VIEWPORTS)
        user_agent = random.choice(USER_AGENTS)

        self.console.print(f"[dim]Session: {viewport['width']}x{viewport['height']}, UA randomized[/dim]")

        self.browser = await self._playwright.chromium.launch(
            headless=self.config['download'].get('headless', False),
            args=['--ignore-certificate-errors'],
        )

        self.context = await self.browser.new_context(
            accept_downloads=True,
            ignore_https_errors=True,
            viewport=viewport,
            user_agent=user_agent,
            locale='en-US,en;q=0.9',
            timezone_id='Asia/Jakarta',
            color_scheme='light',
        )

        # Set realistic browser properties
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        """)

        self.page = await self.context.new_page()

    async def close(self):
        """Close the page we created, but never close the user's browser."""
        try:
            if self.page:
                await self.page.close()
        except Exception:
            pass
        # Don't close the browser — it belongs to the user
        if self._playwright:
            await self._playwright.stop()

    async def wait_for_login(self):
        import json, time

        ezproxy_url = self.config['ezproxy']['url']
        login_timeout = self.config['ezproxy']['login_timeout']
        check_url = self.config['ezproxy'].get('login_check_url', 'https://ieeexplore.ieee.org')
        status_file = "/tmp/paper-downloader-status.json"
        command_file = "/tmp/paper-downloader-command.json"

        ezproxy_check_url = to_ezproxy_url(check_url)

        self.console.print(f"[dim]Checking existing ezproxy session...[/dim]")
        try:
            response = await self.page.goto(ezproxy_check_url, wait_until='domcontentloaded', timeout=45000)
            await asyncio.sleep(2)
            current_url = self.page.url
            if 'ezproxy.ugm.ac.id' in current_url and 'login' not in current_url.lower():
                self.console.print(f"[green]✓ Already logged in to ezproxy![/green]")
                with open(status_file, 'w') as f:
                    json.dump({"state": "running", "message": "Already logged in", "timestamp": time.time()}, f, indent=2)
                return
            self.console.print(f"[dim]Not logged in yet, attempting auto-login...[/dim]")
        except Exception as e:
            self.console.print(f"[dim]Session check failed ({e}), showing login page...[/dim]")

        self.console.print(f"\n[bold blue]→ Opening ezproxy login:[/] {ezproxy_url}")
        try:
            await self.page.goto(ezproxy_url, wait_until='load', timeout=60000)
        except Exception as e:
            self.console.print(f"[yellow]⚠️  Login page timeout ({e}), continuing...[/yellow]")

        # Try auto-login if credentials available
        auto_user = self.config['ezproxy'].get('username', '')
        auto_pass = self.config['ezproxy'].get('password', '')
        if auto_user and auto_pass:
            self.console.print("[dim]Attempting auto-login...[/dim]")
            try:
                user_field = self.page.locator('input[name="user"], input[type="text"], input[id="username"]').first
                await user_field.fill(auto_user)
                await asyncio.sleep(0.5)
                pass_field = self.page.locator('input[name="pass"], input[type="password"], input[id="password"]').first
                await pass_field.fill(auto_pass)
                await asyncio.sleep(0.5)
                login_btn = self.page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")').first
                await login_btn.click()
                await asyncio.sleep(5)

                # Verify
                try:
                    await self.page.goto(ezproxy_check_url, wait_until='domcontentloaded', timeout=30000)
                    await asyncio.sleep(2)
                except Exception:
                    pass
                current_url = self.page.url
                if 'ezproxy.ugm.ac.id' in current_url and 'login' not in current_url.lower():
                    self.console.print("[green]✓ Auto-login successful![/green]")
                    with open(status_file, 'w') as f:
                        json.dump({"state": "running", "message": "Auto-login successful", "timestamp": time.time()}, f, indent=2)
                    return
                self.console.print("[yellow]Auto-login may have failed, falling back to manual...[/yellow]")
            except Exception as e:
                self.console.print(f"[yellow]Auto-login error: {e}, falling back to manual...[/yellow]")

        with open(status_file, 'w') as f:
            json.dump({"state": "login_required", "message": "Login to UGM ezproxy in the browser, then send 'continue'", "timestamp": time.time(), "url": self.page.url}, f, indent=2)

        self.console.print(Panel.fit(
            "[bold yellow]ACTION REQUIRED[/bold yellow]\n\n"
            f"1. Login to UGM ezproxy in the browser window\n"
            f"2. Then tell Claude to send 'continue'\n"
            f"   (or it will auto-continue after {login_timeout}s)\n\n"
            f"[dim]Status file: {status_file}[/dim]\n"
            f"[dim]Command file: {command_file}[/dim]",
            title="🔐 Login Required"
        ))

        start = time.time()
        while time.time() - start < login_timeout:
            if time.time() - start > 5:
                try:
                    with open(command_file, 'r') as f:
                        cmd_data = json.load(f)
                    cmd = cmd_data.get("command")
                    if cmd == "continue":
                        with open(command_file, 'w') as f:
                            json.dump({"command": None}, f)
                        self.console.print("[green]✓ Continue signal received![/green]")
                        break
                    elif cmd == "abort":
                        with open(command_file, 'w') as f:
                            json.dump({"command": None}, f)
                        raise RuntimeError("User aborted login")
                except (FileNotFoundError, json.JSONDecodeError):
                    pass
            await asyncio.sleep(2)
        else:
            self.console.print("[yellow]⏰ Login timeout, auto-continuing...[/yellow]")

        self.console.print(f"[dim]Verifying login via: {ezproxy_check_url}[/dim]")
        try:
            await self.page.goto(ezproxy_check_url, wait_until='load', timeout=30000)
            await asyncio.sleep(2)
        except Exception as e:
            self.console.print(f"[yellow]⚠️  Navigation timeout, but continuing anyway: {e}[/yellow]")

        current_url = self.page.url
        if 'ezproxy.ugm.ac.id' in current_url:
            self.console.print(f"[green]✓ Login verified! Using ezproxy URL: {current_url}[/green]")
        elif 'login' in current_url.lower():
            self.console.print("[yellow]⚠️  Redirected to login page. Please try again.[/yellow]")
        else:
            self.console.print(f"[yellow]⚠️  Current URL: {current_url}. Proceeding anyway...[/yellow]")

        with open(status_file, 'w') as f:
            json.dump({"state": "running", "message": "Login complete, proceeding", "timestamp": time.time()}, f, indent=2)
