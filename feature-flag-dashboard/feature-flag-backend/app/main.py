from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import re
import random
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

DEVIN_API_URL = "https://api.devin.ai/v1"
DEVIN_API_TOKEN = os.getenv("DEVIN_API_TOKEN", "")
REPO = "komeslik/Spring-Boot-Microservices-Banking-Application"
GITHUB_RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/main"

# ── Feature Flag Registry (all known flags — live status checked against repo) ──
ALL_KNOWN_FLAGS = [
    {
        "id": "user-registration",
        "name": "User Registration",
        "description": "Controls the POST /api/users/register endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-registration.enabled",
        "field_name": "userRegistrationEnabled",
        "status": "enabled",
    },
    {
        "id": "user-read",
        "name": "User Read",
        "description": "Controls the GET /api/users and GET /api/users/{id} endpoints",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-read.enabled",
        "field_name": "userReadEnabled",
        "status": "enabled",
    },
    {
        "id": "user-update-profile",
        "name": "User Update Profile",
        "description": "Controls the PUT /api/users/{id} endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-update-profile.enabled",
        "field_name": "userUpdateProfileEnabled",
        "status": "enabled",
    },
    {
        "id": "user-update-status",
        "name": "User Update Status",
        "description": "Controls the PATCH /api/users/{id} endpoint",
        "type": "backend",
        "service": "User Service",
        "location": "User-Service/src/main/java/org/training/user/service/controller/UserController.java",
        "config_location": "User-Service/src/main/resources/application.yml",
        "property": "feature.user-update-status.enabled",
        "field_name": "userUpdateStatusEnabled",
        "status": "enabled",
    },
    {
        "id": "account-creation",
        "name": "Account Creation",
        "description": "Controls the POST /accounts endpoint",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-creation.enabled",
        "field_name": "accountCreationEnabled",
        "status": "enabled",
    },
    {
        "id": "account-read",
        "name": "Account Read",
        "description": "Controls the GET /accounts and GET /accounts/{id} endpoints",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-read.enabled",
        "field_name": "accountReadEnabled",
        "status": "enabled",
    },
    {
        "id": "account-update-status",
        "name": "Account Update Status",
        "description": "Controls the PATCH /accounts endpoint",
        "type": "backend",
        "service": "Account Service",
        "location": "Account-Service/src/main/java/org/training/account/service/controller/AccountController.java",
        "config_location": "Account-Service/src/main/resources/application.yml",
        "property": "feature.account-update-status.enabled",
        "field_name": "accountUpdateStatusEnabled",
        "status": "enabled",
    },
    {
        "id": "transaction-create",
        "name": "Transaction Create",
        "description": "Controls the POST /transactions endpoint (deposits/withdrawals)",
        "type": "backend",
        "service": "Transaction Service",
        "location": "Transaction-Service/src/main/java/org/training/transactions/controller/TransactionController.java",
        "config_location": "Transaction-Service/src/main/resources/application.yml",
        "property": "feature.transaction-create.enabled",
        "field_name": "transactionCreateEnabled",
        "status": "enabled",
    },
    {
        "id": "transaction-read",
        "name": "Transaction Read",
        "description": "Controls the GET /transactions endpoint",
        "type": "backend",
        "service": "Transaction Service",
        "location": "Transaction-Service/src/main/java/org/training/transactions/controller/TransactionController.java",
        "config_location": "Transaction-Service/src/main/resources/application.yml",
        "property": "feature.transaction-read.enabled",
        "field_name": "transactionReadEnabled",
        "status": "enabled",
    },
    {
        "id": "sequence-generation",
        "name": "Sequence Generation",
        "description": "Controls the POST /sequence endpoint",
        "type": "backend",
        "service": "Sequence Generator",
        "location": "Sequence-Generator/src/main/java/org/training/sequence/generator/controller/SequenceController.java",
        "config_location": "Sequence-Generator/src/main/resources/application.yml",
        "property": "feature.sequence-generation.enabled",
        "field_name": "sequenceGenerationEnabled",
        "status": "enabled",
    },
    {
        "id": "fund-transfer",
        "name": "Fund Transfer",
        "description": "Controls the POST /fund-transfers endpoint",
        "type": "backend",
        "service": "Fund Transfer",
        "location": "Fund-Transfer/src/main/java/org/training/fundtransfer/controller/FundTransferController.java",
        "config_location": "Fund-Transfer/src/main/resources/application.yml",
        "property": "feature.fund-transfer.enabled",
        "field_name": "fundTransferEnabled",
        "status": "enabled",
    },
    {
        "id": "enable-demo-tab",
        "name": "Demo Tab",
        "description": "Shows/hides the Demo tab in the frontend sidebar navigation",
        "type": "frontend",
        "service": "Frontend",
        "location": "banking-frontend/src/App.tsx",
        "config_location": "banking-frontend/src/featureFlags.ts",
        "property": "ENABLE_DEMO_TAB",
        "field_name": "ENABLE_DEMO_TAB",
        "status": "enabled",
    },
    {
        "id": "enable-send-money",
        "name": "Send Money",
        "description": "Shows/hides the Send Money component in the Demo tab dashboard",
        "type": "frontend",
        "service": "Frontend",
        "location": "banking-frontend/src/DemoPanel.tsx",
        "config_location": "banking-frontend/src/featureFlags.ts",
        "property": "ENABLE_SEND_MONEY",
        "field_name": "ENABLE_SEND_MONEY",
        "status": "enabled",
    },
]

# ── Flag Dependency Graph ──
# Maps flag_id -> list of flag_ids it depends on
# Based on the actual service call chain in the banking app
FLAG_DEPENDENCIES: dict[str, list[str]] = {
    # User registration doesn't depend on other flagged features
    "user-registration": [],
    # Read endpoints are independent
    "user-read": [],
    "account-read": [],
    "transaction-read": [],
    # User profile/status updates depend on being able to read users
    "user-update-profile": ["user-read"],
    "user-update-status": ["user-read"],
    # Account creation depends on sequence generator (for account numbers) and user-read (to validate user)
    "account-creation": ["sequence-generation", "user-read"],
    # Account status update depends on reading accounts
    "account-update-status": ["account-read"],
    # Transaction create depends on account-read (to check balance)
    "transaction-create": ["account-read"],
    # Sequence generation is independent (utility service)
    "sequence-generation": [],
    # Fund transfer depends on account-read, transaction-create, and account-update-status
    "fund-transfer": ["account-read", "transaction-create"],
    # Demo tab depends on all the backend features used in the demo setup flow
    "enable-demo-tab": ["user-registration", "user-read", "user-update-profile", "user-update-status",
                        "account-creation", "account-read", "account-update-status",
                        "transaction-create", "transaction-read", "sequence-generation", "fund-transfer"],
    # Send money depends on fund-transfer and account-read
    "enable-send-money": ["fund-transfer", "account-read"],
}

# ── Mock Staleness Data ──
# Deterministic random staleness per flag (seeded by flag id for consistency)
_staleness_cache: dict[str, int] = {}

def _get_mock_staleness(flag_id: str) -> int:
    """Return a deterministic mock staleness value in days for a flag."""
    if flag_id not in _staleness_cache:
        rng = random.Random(flag_id)  # deterministic seed per flag
        _staleness_cache[flag_id] = rng.randint(3, 180)
    return _staleness_cache[flag_id]


def _get_all_dependents(flag_id: str) -> list[str]:
    """Return all flags that transitively depend on the given flag."""
    dependents: list[str] = []
    for fid, deps in FLAG_DEPENDENCIES.items():
        if flag_id in deps:
            dependents.append(fid)
    return dependents


def _get_dependency_count(flag_id: str) -> int:
    """Count how many flags depend on this flag (used for safety ranking)."""
    return len(_get_all_dependents(flag_id))


# In-memory tracking of removal sessions
removal_sessions: dict[str, dict] = {}

# Cache for live flag status from GitHub (to avoid hammering the API)
_live_flags_cache: dict[str, list[dict]] = {"flags": []}
_live_flags_cache_time: float = 0.0
LIVE_CACHE_TTL = 60.0  # seconds


async def _check_flag_exists_in_repo(client: httpx.AsyncClient, flag: dict) -> bool:
    """Check if a feature flag still exists in the repo by reading its config file from GitHub."""
    config_path = flag["config_location"]
    url = f"{GITHUB_RAW_BASE}/{config_path}"
    try:
        response = await client.get(url, timeout=10.0)
        if response.status_code != 200:
            # File doesn't exist or can't be read — flag may have been removed
            return False
        content = response.text
        if flag["type"] == "backend":
            # Backend flags are stored as nested YAML keys, e.g.:
            #   feature:
            #     user-read:
            #       enabled: true
            # The property is "feature.user-read.enabled" but in the file
            # we need to search for the middle key portion (e.g. "user-read")
            parts = flag["property"].split(".")
            # The unique middle key (e.g. "user-read" from "feature.user-read.enabled")
            flag_key = parts[1] if len(parts) >= 3 else flag["property"]
            return flag_key in content
        else:
            # For frontend flags, check if the flag name exists in the file
            return flag["field_name"] in content
    except httpx.RequestError:
        # On network error, assume flag still exists (don't hide it due to transient errors)
        return True


async def _get_live_flags() -> list[dict]:
    """Return only the flags that currently exist in the repo (cached for LIVE_CACHE_TTL seconds)."""
    import time
    global _live_flags_cache, _live_flags_cache_time

    now = time.time()
    if _live_flags_cache["flags"] and (now - _live_flags_cache_time) < LIVE_CACHE_TTL:
        return _live_flags_cache["flags"]

    live_flags = []
    try:
        async with httpx.AsyncClient() as client:
            for flag in ALL_KNOWN_FLAGS:
                exists = await _check_flag_exists_in_repo(client, flag)
                if exists:
                    live_flags.append(flag)
    except Exception:
        # On any error, fall back to returning all known flags
        return ALL_KNOWN_FLAGS

    _live_flags_cache["flags"] = live_flags
    _live_flags_cache_time = now
    return live_flags


async def _refresh_in_progress_sessions() -> None:
    """Poll Devin API to update the status of any in-progress removal sessions."""
    if not DEVIN_API_TOKEN:
        return
    in_progress = [
        (fid, info) for fid, info in removal_sessions.items()
        if info["status"] == "in_progress"
    ]
    if not in_progress:
        return
    try:
        async with httpx.AsyncClient() as client:
            for flag_id, session_info in in_progress:
                try:
                    response = await client.get(
                        f"{DEVIN_API_URL}/session/{session_info['session_id']}",
                        headers={"Authorization": f"Bearer {DEVIN_API_TOKEN}"},
                        timeout=10.0,
                    )
                    if response.status_code == 200:
                        devin_data = response.json()
                        devin_status = devin_data.get("status", "unknown")
                        if devin_status in ("finished", "stopped"):
                            session_info["status"] = "completed"
                            session_info["pull_request"] = devin_data.get("pull_request")
                        elif devin_status == "error":
                            session_info["status"] = "failed"
                except httpx.RequestError:
                    pass
    except httpx.RequestError:
        pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/flags")
async def list_flags():
    """Return only flags that currently exist in the repo, with removal status, staleness, and dependencies."""
    await _refresh_in_progress_sessions()
    live_flags = await _get_live_flags()
    live_flag_ids = {f["id"] for f in live_flags}
    flags_with_status = []
    for flag in live_flags:
        flag_copy = dict(flag)
        if flag["id"] in removal_sessions:
            flag_copy["removal"] = removal_sessions[flag["id"]]
        # Add staleness (mock)
        flag_copy["staleness_days"] = _get_mock_staleness(flag["id"])
        # Add dependencies (only those that still exist in repo)
        raw_deps = FLAG_DEPENDENCIES.get(flag["id"], [])
        flag_copy["dependencies"] = [d for d in raw_deps if d in live_flag_ids]
        # Add dependents (flags that depend on this one)
        flag_copy["dependents"] = [fid for fid in _get_all_dependents(flag["id"]) if fid in live_flag_ids]
        # Safety score = number of live dependents (lower = safer to remove)
        flag_copy["dependent_count"] = len(flag_copy["dependents"])
        flags_with_status.append(flag_copy)
    # Sort by safety: least dependents first (safest to remove)
    flags_with_status.sort(key=lambda f: f["dependent_count"])
    return {"flags": flags_with_status}


@app.get("/api/flags/{flag_id}")
async def get_flag(flag_id: str):
    """Return a single feature flag by ID."""
    for flag in ALL_KNOWN_FLAGS:
        if flag["id"] == flag_id:
            flag_copy = dict(flag)
            if flag_id in removal_sessions:
                flag_copy["removal"] = removal_sessions[flag_id]
            return flag_copy
    raise HTTPException(status_code=404, detail=f"Feature flag '{flag_id}' not found")


@app.post("/api/flags/{flag_id}/remove")
async def remove_flag(flag_id: str):
    """Trigger a Devin session to remove a feature flag from the codebase."""
    if not DEVIN_API_TOKEN:
        raise HTTPException(status_code=500, detail="DEVIN_API_TOKEN not configured")

    flag = None
    for f in ALL_KNOWN_FLAGS:
        if f["id"] == flag_id:
            flag = f
            break
    if not flag:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_id}' not found")

    if flag_id in removal_sessions and removal_sessions[flag_id]["status"] == "in_progress":
        return {
            "message": "Removal already in progress",
            "session": removal_sessions[flag_id],
        }

    if flag["type"] == "backend":
        prompt = _build_backend_removal_prompt(flag)
    else:
        prompt = _build_frontend_removal_prompt(flag)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DEVIN_API_URL}/sessions",
                headers={
                    "Authorization": f"Bearer {DEVIN_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": prompt,
                    "title": f"Remove feature flag: {flag['name']} ({flag['id']})",
                    "tags": ["feature-flag-removal", flag_id],
                },
                timeout=30.0,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Devin API error: {response.text}",
            )

        data = response.json()
        session_info = {
            "flag_id": flag_id,
            "session_id": data["session_id"],
            "session_url": data["url"],
            "status": "in_progress",
        }
        removal_sessions[flag_id] = session_info

        return {
            "message": f"Devin session created to remove feature flag '{flag['name']}'",
            "session": session_info,
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to reach Devin API: {str(e)}")


@app.get("/api/flags/{flag_id}/removal-status")
async def get_removal_status(flag_id: str):
    """Check the status of a feature flag removal session."""
    if flag_id not in removal_sessions:
        return {"status": "not_started"}

    await _refresh_in_progress_sessions()
    return removal_sessions[flag_id]


def _build_backend_removal_prompt(flag: dict) -> str:
    return f"""You are tasked with removing a backend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}
**Controller File:** {flag['location']}
**Config File:** {flag['config_location']}
**Field Name in Controller:** {flag['field_name']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the feature flag from the controller** (`{flag['location']}`):
   - Remove the `@Value("${{{flag['property']}}}:true")` annotation and the `private boolean {flag['field_name']};` field.
   - Remove the `if (!{flag['field_name']})` check and the 503 response block from the affected endpoint method(s). Keep the actual business logic that was inside the "enabled" branch.
   - Remove any unused imports (e.g., `HttpStatus` if no longer needed).

3. **Remove the feature flag from application.yml** (`{flag['config_location']}`):
   - Remove the `{flag['property']}: true` line and any empty parent `feature:` keys left behind.

4. **Update the unit tests** (look for `*FeatureFlagTest.java` in the same service's test directory):
   - Remove the test methods that tested this specific flag's enabled/disabled behavior.
   - If the entire test class only tested this one flag, delete the test file entirely.
   - If the test class tests multiple flags, only remove the methods for this flag.

5. **Run `mvn test`** in the affected service directory to ensure all remaining tests pass. **Capture the full terminal output of the test run** -- you will need it for the PR description.

6. **Take a screenshot of the terminal** showing the test results (BUILD SUCCESS or test summary). Save the screenshot so it can be attached to the PR.

7. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description that includes:
     - Which flag was removed and why (it was fully enabled and no longer needed)
     - Which files were changed and a summary of each change
     - **A "Test Results" section** containing:
       - The full terminal output of `mvn test` wrapped in a code block (copy-paste the entire output including the test count summary and BUILD SUCCESS line)
       - A screenshot of the terminal showing the test results (attach the screenshot image to the PR description)
       - A clear statement like "All X tests passed" with the specific count

**Important:** The feature flag is currently enabled (true), so removing it means the endpoint should always be available (the "enabled" code path becomes the only path). Do NOT remove the endpoint itself -- only remove the flag gating logic.
"""


def _build_frontend_removal_prompt(flag: dict) -> str:
    if flag["id"] == "enable-demo-tab":
        return f"""You are tasked with removing a frontend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the flag from `banking-frontend/src/featureFlags.ts`**:
   - Remove the `ENABLE_DEMO_TAB: true` entry from the featureFlags object.

3. **Update `banking-frontend/src/App.tsx`**:
   - The Demo tab entry in the `tabs` array is conditionally included with `...(featureFlags.ENABLE_DEMO_TAB ? [...] : [])`.
   - Replace this with always including the Demo tab entry (remove the conditional spread).
   - Remove the `import featureFlags from './featureFlags'` if no other flags are used in App.tsx.

4. **Update the frontend tests** (`banking-frontend/src/test/featureFlags.test.tsx`):
   - Remove the `ENABLE_DEMO_TAB` test cases.
   - If no tests remain, delete the test file.

5. **Run `npm test`** in `banking-frontend/` to ensure tests pass. **Capture the full terminal output of the test run** -- you will need it for the PR description.

6. **Take a screenshot of the terminal** showing the test results. Save the screenshot so it can be attached to the PR.

7. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description that includes:
     - Which flag was removed and why (it was fully enabled and no longer needed)
     - Which files were changed and a summary of each change
     - **A "Test Results" section** containing:
       - The full terminal output of `npm test` wrapped in a code block (copy-paste the entire output including pass/fail counts)
       - A screenshot of the terminal showing the test results (attach the screenshot image to the PR description)
       - A clear statement like "All X tests passed" with the specific count

**Important:** The flag is currently enabled (true), so removing it means the Demo tab should always be shown. Do NOT remove the Demo tab itself.
"""
    else:
        return f"""You are tasked with removing a frontend feature flag from the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Feature Flag:** `{flag['property']}`
**Flag Name:** {flag['name']}
**Description:** {flag['description']}

## Instructions

1. **Create a new branch** from `main` named `devin/remove-flag-{flag['id']}`.

2. **Remove the flag from `banking-frontend/src/featureFlags.ts`**:
   - Remove the `ENABLE_SEND_MONEY: true` entry from the featureFlags object.

3. **Update `banking-frontend/src/DemoPanel.tsx`**:
   - Find the conditional rendering `featureFlags.ENABLE_SEND_MONEY ? (...) : (...)`.
   - Keep only the "enabled" branch (the actual Send Money component). Remove the "disabled" branch (the grayed-out placeholder).
   - Remove the `import featureFlags from './featureFlags'` if no other flags are used in DemoPanel.tsx.

4. **Update the frontend tests** (`banking-frontend/src/test/featureFlags.test.tsx`):
   - Remove the `ENABLE_SEND_MONEY` test cases.
   - If no tests remain, delete the test file.

5. **Run `npm test`** in `banking-frontend/` to ensure tests pass. **Capture the full terminal output of the test run** -- you will need it for the PR description.

6. **Take a screenshot of the terminal** showing the test results. Save the screenshot so it can be attached to the PR.

7. **Create a PR** into `main` with:
   - Title: "Remove feature flag: {flag['name']}"
   - Description that includes:
     - Which flag was removed and why (it was fully enabled and no longer needed)
     - Which files were changed and a summary of each change
     - **A "Test Results" section** containing:
       - The full terminal output of `npm test` wrapped in a code block (copy-paste the entire output including pass/fail counts)
       - A screenshot of the terminal showing the test results (attach the screenshot image to the PR description)
       - A clear statement like "All X tests passed" with the specific count

**Important:** The flag is currently enabled (true), so removing it means the Send Money component should always be shown. Do NOT remove the component itself.
"""


# ══════════════════════════════════════════════════════════════════════════════
# VERSION DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

# Service registry: all services with their pom.xml / package.json paths
SERVICE_REGISTRY = [
    {
        "id": "service-registry",
        "name": "Service Registry (Eureka)",
        "type": "backend",
        "port": 8761,
        "pom_path": "Service-Registry/pom.xml",
    },
    {
        "id": "api-gateway",
        "name": "API Gateway",
        "type": "backend",
        "port": 8080,
        "pom_path": "API-Gateway/pom.xml",
    },
    {
        "id": "user-service",
        "name": "User Service",
        "type": "backend",
        "port": 8082,
        "pom_path": "User-Service/pom.xml",
    },
    {
        "id": "account-service",
        "name": "Account Service",
        "type": "backend",
        "port": 8081,
        "pom_path": "Account-Service/pom.xml",
    },
    {
        "id": "fund-transfer",
        "name": "Fund Transfer Service",
        "type": "backend",
        "port": 8085,
        "pom_path": "Fund-Transfer/pom.xml",
    },
    {
        "id": "transaction-service",
        "name": "Transaction Service",
        "type": "backend",
        "port": 8084,
        "pom_path": "Transaction-Service/pom.xml",
    },
    {
        "id": "sequence-generator",
        "name": "Sequence Generator",
        "type": "backend",
        "port": 8083,
        "pom_path": "Sequence-Generator/pom.xml",
    },
    {
        "id": "banking-frontend",
        "name": "Banking Frontend",
        "type": "frontend",
        "port": 5174,
        "package_json_path": "banking-frontend/package.json",
    },
]

# Latest stable versions (known targets)
LATEST_VERSIONS = {
    "spring_boot": "3.4.3",
    "spring_cloud": "2024.0.0",
    "java": "21",
    "react": "19.0.0",
    "react_dom": "19.0.0",
    "typescript": "5.7.3",
    "vite": "6.2.0",
}

# Cache for version data
_version_cache: dict[str, list[dict]] = {"services": []}
_version_cache_time: float = 0.0
VERSION_CACHE_TTL = 120.0  # seconds

# In-memory tracking of upgrade sessions
upgrade_sessions: dict[str, dict] = {}


def _parse_pom_version(pom_content: str, tag: str) -> str:
    """Extract a version string from a pom.xml content."""
    match = re.search(rf"<{tag}>([^<]+)</{tag}>", pom_content)
    return match.group(1) if match else "unknown"


def _parse_pom_property(pom_content: str, prop: str) -> str:
    """Extract a property value from pom.xml <properties> block."""
    match = re.search(rf"<{prop}>([^<]+)</{prop}>", pom_content)
    return match.group(1) if match else "unknown"


def _parse_package_json_dep(pkg_content: str, dep_name: str) -> str:
    """Extract a dependency version from package.json content."""
    match = re.search(rf'"{dep_name}"\s*:\s*"([^"]+)"', pkg_content)
    return match.group(1).lstrip("^~") if match else "unknown"


def _version_is_outdated(current: str, latest: str) -> bool:
    """Simple major version comparison."""
    try:
        current_clean = current.lstrip("^~").split(".")[0]
        latest_clean = latest.lstrip("^~").split(".")[0]
        return int(current_clean) < int(latest_clean)
    except (ValueError, IndexError):
        return current != latest


async def _fetch_service_versions() -> list[dict]:
    """Fetch current version info for all services from GitHub."""
    global _version_cache, _version_cache_time

    now = time.time()
    if _version_cache["services"] and (now - _version_cache_time) < VERSION_CACHE_TTL:
        return _version_cache["services"]

    results = []
    try:
        async with httpx.AsyncClient() as client:
            for svc in SERVICE_REGISTRY:
                svc_info: dict = {
                    "id": svc["id"],
                    "name": svc["name"],
                    "type": svc["type"],
                    "port": svc["port"],
                    "versions": {},
                    "latest": {},
                    "outdated": [],
                }

                if svc["type"] == "backend":
                    url = f"{GITHUB_RAW_BASE}/{svc['pom_path']}"
                    try:
                        resp = await client.get(url, timeout=10.0)
                        if resp.status_code == 200:
                            pom = resp.text
                            sb_ver = _parse_pom_version(pom, "version")
                            # Find the spring-boot-starter-parent version specifically
                            parent_match = re.search(
                                r"<parent>.*?<artifactId>spring-boot-starter-parent</artifactId>\s*<version>([^<]+)</version>",
                                pom,
                                re.DOTALL,
                            )
                            if parent_match:
                                sb_ver = parent_match.group(1)
                            java_ver = _parse_pom_property(pom, "java.version")
                            sc_ver = _parse_pom_property(pom, "spring-cloud.version")

                            svc_info["versions"] = {
                                "spring_boot": sb_ver,
                                "java": java_ver,
                                "spring_cloud": sc_ver,
                            }
                            svc_info["latest"] = {
                                "spring_boot": LATEST_VERSIONS["spring_boot"],
                                "java": LATEST_VERSIONS["java"],
                                "spring_cloud": LATEST_VERSIONS["spring_cloud"],
                            }
                            for key in ["spring_boot", "java", "spring_cloud"]:
                                if _version_is_outdated(
                                    svc_info["versions"][key],
                                    svc_info["latest"][key],
                                ):
                                    svc_info["outdated"].append(key)
                    except httpx.RequestError:
                        svc_info["versions"] = {"error": "Failed to fetch"}

                else:  # frontend
                    url = f"{GITHUB_RAW_BASE}/{svc['package_json_path']}"
                    try:
                        resp = await client.get(url, timeout=10.0)
                        if resp.status_code == 200:
                            pkg = resp.text
                            react_ver = _parse_package_json_dep(pkg, "react")
                            ts_ver = _parse_package_json_dep(pkg, "typescript")
                            vite_ver = _parse_package_json_dep(pkg, "vite")

                            svc_info["versions"] = {
                                "react": react_ver,
                                "typescript": ts_ver,
                                "vite": vite_ver,
                            }
                            svc_info["latest"] = {
                                "react": LATEST_VERSIONS["react"],
                                "typescript": LATEST_VERSIONS["typescript"],
                                "vite": LATEST_VERSIONS["vite"],
                            }
                            for key in ["react", "typescript", "vite"]:
                                if _version_is_outdated(
                                    svc_info["versions"][key],
                                    svc_info["latest"][key],
                                ):
                                    svc_info["outdated"].append(key)
                    except httpx.RequestError:
                        svc_info["versions"] = {"error": "Failed to fetch"}

                # Attach upgrade session info if any
                if svc["id"] in upgrade_sessions:
                    svc_info["upgrade"] = upgrade_sessions[svc["id"]]

                results.append(svc_info)

    except Exception:
        return _version_cache.get("services", [])

    _version_cache["services"] = results
    _version_cache_time = now
    return results


async def _refresh_upgrade_sessions() -> None:
    """Poll Devin API to update the status of any in-progress upgrade sessions."""
    if not DEVIN_API_TOKEN:
        return
    in_progress = [
        (sid, info) for sid, info in upgrade_sessions.items()
        if info["status"] == "in_progress"
    ]
    if not in_progress:
        return
    try:
        async with httpx.AsyncClient() as client:
            for service_id, session_info in in_progress:
                try:
                    response = await client.get(
                        f"{DEVIN_API_URL}/session/{session_info['session_id']}",
                        headers={"Authorization": f"Bearer {DEVIN_API_TOKEN}"},
                        timeout=10.0,
                    )
                    if response.status_code == 200:
                        devin_data = response.json()
                        devin_status = devin_data.get("status", "unknown")
                        if devin_status in ("finished", "stopped"):
                            session_info["status"] = "completed"
                            session_info["pull_request"] = devin_data.get("pull_request")
                        elif devin_status == "error":
                            session_info["status"] = "failed"
                except httpx.RequestError:
                    pass
    except httpx.RequestError:
        pass


@app.get("/api/versions")
async def list_versions():
    """Return version info for all services."""
    await _refresh_upgrade_sessions()
    services = await _fetch_service_versions()
    total_outdated = sum(1 for s in services if len(s.get("outdated", [])) > 0)
    return {
        "services": services,
        "total": len(services),
        "outdated_count": total_outdated,
    }


@app.post("/api/versions/{service_id}/upgrade")
async def upgrade_service(service_id: str):
    """Trigger a Devin session to upgrade a service to latest versions."""
    if not DEVIN_API_TOKEN:
        raise HTTPException(status_code=500, detail="DEVIN_API_TOKEN not configured")

    svc = None
    for s in SERVICE_REGISTRY:
        if s["id"] == service_id:
            svc = s
            break
    if not svc:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    if service_id in upgrade_sessions and upgrade_sessions[service_id]["status"] == "in_progress":
        return {
            "message": "Upgrade already in progress",
            "session": upgrade_sessions[service_id],
        }

    # Fetch current versions to build a meaningful prompt
    services = await _fetch_service_versions()
    svc_info = next((s for s in services if s["id"] == service_id), None)

    if svc["type"] == "backend":
        prompt = _build_backend_upgrade_prompt(svc, svc_info)
    else:
        prompt = _build_frontend_upgrade_prompt(svc, svc_info)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DEVIN_API_URL}/sessions",
                headers={
                    "Authorization": f"Bearer {DEVIN_API_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": prompt,
                    "title": f"Upgrade {svc['name']} to latest versions",
                    "tags": ["version-upgrade", service_id],
                },
                timeout=30.0,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Devin API error: {response.text}",
            )

        data = response.json()
        session_info = {
            "service_id": service_id,
            "session_id": data["session_id"],
            "session_url": data["url"],
            "status": "in_progress",
        }
        upgrade_sessions[service_id] = session_info

        return {
            "message": f"Devin session created to upgrade {svc['name']}",
            "session": session_info,
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to reach Devin API: {str(e)}")


def _build_backend_upgrade_prompt(svc: dict, svc_info: dict | None) -> str:
    current = svc_info["versions"] if svc_info else {}
    latest = svc_info["latest"] if svc_info else LATEST_VERSIONS
    outdated = svc_info["outdated"] if svc_info else ["spring_boot", "java", "spring_cloud"]

    pom_path = svc["pom_path"]
    service_dir = pom_path.rsplit("/", 1)[0]

    upgrades_desc = []
    if "spring_boot" in outdated:
        upgrades_desc.append(f"- Spring Boot: {current.get('spring_boot', '?')} -> {latest.get('spring_boot', LATEST_VERSIONS['spring_boot'])}")
    if "java" in outdated:
        upgrades_desc.append(f"- Java: {current.get('java', '?')} -> {latest.get('java', LATEST_VERSIONS['java'])}")
    if "spring_cloud" in outdated:
        upgrades_desc.append(f"- Spring Cloud: {current.get('spring_cloud', '?')} -> {latest.get('spring_cloud', LATEST_VERSIONS['spring_cloud'])}")

    upgrades_text = "\n".join(upgrades_desc) if upgrades_desc else "- All versions to latest"

    return f"""You are tasked with upgrading a backend microservice in the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Service:** {svc['name']}
**Service Directory:** {service_dir}
**POM File:** {pom_path}

## Version Upgrades Needed
{upgrades_text}

## Instructions

1. **Create a new branch** from `main` named `devin/upgrade-{svc['id']}`.

2. **Update `{pom_path}`**:
   - Update `spring-boot-starter-parent` version to `{latest.get('spring_boot', LATEST_VERSIONS['spring_boot'])}`.
   - Update `<java.version>` property to `{latest.get('java', LATEST_VERSIONS['java'])}`.
   - Update `<spring-cloud.version>` property to `{latest.get('spring_cloud', LATEST_VERSIONS['spring_cloud'])}`.

3. **Migrate javax -> jakarta namespace** (required for Spring Boot 3.x):
   - In ALL Java source files under `{service_dir}/src/`, replace `import javax.persistence.*` with `import jakarta.persistence.*`.
   - Replace `import javax.validation.*` with `import jakarta.validation.*`.
   - Replace any other `javax.*` imports that have moved to `jakarta.*` in Jakarta EE.

4. **Update GlobalExceptionHandler** (if present in the service):
   - The `handleMethodArgumentNotValid` method signature changed in Spring Boot 3.x.
   - The method now takes `HttpStatusCode` instead of `HttpStatus` as the third parameter.
   - The method visibility changed from `public` to `protected`.
   - Add `import org.springframework.http.HttpStatusCode;` if needed.

5. **Update test files** if any tests use deprecated Spring Boot 2.x APIs:
   - `@MockBean` import path may have changed in Spring Boot 3.x (moved to `org.springframework.test.context.bean.override.mockito`).
   - Check that all test utilities still compile.

6. **Build the service**: Run `mvn clean package -DskipTests` in the `{service_dir}/` directory first to check compilation.

7. **Run tests**: Run `mvn test` in `{service_dir}/` to verify all tests pass. **Capture the full terminal output**.

8. **Take a screenshot** of the test results.

9. **Create a PR** into `main` with:
   - Title: "Upgrade {svc['name']} to Spring Boot {latest.get('spring_boot', LATEST_VERSIONS['spring_boot'])}, Java {latest.get('java', LATEST_VERSIONS['java'])}"
   - Description including what was upgraded, files changed, and a **Test Results** section with full terminal output and screenshot.

**Important:** This service runs alongside other services that are still on Spring Boot 2.7.x. The upgraded service must remain compatible with the Eureka service registry and other microservices via Feign clients / REST. Do NOT change any API contracts or endpoint signatures.
"""


def _build_frontend_upgrade_prompt(svc: dict, svc_info: dict | None) -> str:
    current = svc_info["versions"] if svc_info else {}
    latest = svc_info["latest"] if svc_info else LATEST_VERSIONS
    outdated = svc_info["outdated"] if svc_info else ["react", "typescript", "vite"]

    pkg_path = svc["package_json_path"]
    frontend_dir = pkg_path.rsplit("/", 1)[0]

    upgrades_desc = []
    if "react" in outdated:
        upgrades_desc.append(f"- React: {current.get('react', '?')} -> {latest.get('react', LATEST_VERSIONS['react'])}")
    if "typescript" in outdated:
        upgrades_desc.append(f"- TypeScript: {current.get('typescript', '?')} -> {latest.get('typescript', LATEST_VERSIONS['typescript'])}")
    if "vite" in outdated:
        upgrades_desc.append(f"- Vite: {current.get('vite', '?')} -> {latest.get('vite', LATEST_VERSIONS['vite'])}")

    upgrades_text = "\n".join(upgrades_desc) if upgrades_desc else "- All versions to latest"

    return f"""You are tasked with upgrading the frontend of the Spring Boot Microservices Banking Application.

**Repository:** {REPO}
**Frontend Directory:** {frontend_dir}
**Package JSON:** {pkg_path}

## Version Upgrades Needed
{upgrades_text}

## Instructions

1. **Create a new branch** from `main` named `devin/upgrade-{svc['id']}`.

2. **Update dependencies** in `{frontend_dir}/`:
   - Run `npm install react@latest react-dom@latest` to upgrade React.
   - Run `npm install -D typescript@latest` to upgrade TypeScript.
   - Run `npm install -D vite@latest` to upgrade Vite.
   - Also update `@types/react` and `@types/react-dom` to versions compatible with the new React.
   - Run `npm install` to ensure lock file is updated.

3. **Fix any breaking changes**:
   - If upgrading to React 19, check for deprecated APIs (e.g., `ReactDOM.render` should use `createRoot`).
   - Update `@vitejs/plugin-react` if needed for Vite compatibility.
   - Check TypeScript strict mode changes.

4. **Build the frontend**: Run `npm run build` in `{frontend_dir}/` to check for compilation errors.

5. **Run tests**: Run `npm test` in `{frontend_dir}/` to verify tests pass. **Capture the full terminal output**.

6. **Take a screenshot** of the test results.

7. **Create a PR** into `main` with:
   - Title: "Upgrade Banking Frontend to React {latest.get('react', LATEST_VERSIONS['react'])}, TypeScript {latest.get('typescript', LATEST_VERSIONS['typescript'])}"
   - Description including what was upgraded, files changed, and a **Test Results** section with full terminal output and screenshot.

**Important:** Do NOT change any functionality or UI. This is a dependency upgrade only.
"""
