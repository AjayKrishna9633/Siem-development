# Lab checklist: adding a Windows agent end to end

A manual test of **Agents → Add agent** on two machines: the **SIEMple server** (running the stack from this branch) and the **Agent PC** (Windows, which still has an old Wazuh agent from the earlier lab). Tick each box; the expected result is under each step.

## 1. Server

- [ ] **Stop the old lab manager** if it still runs on this machine (`docker ps`): it holds ports 1514 and 1515, so SIEMple's manager couldn't start.
- [ ] **Settings.** In the stack's `.env` (root of the repo for `npm run stack:up`, or `/opt/siemple/.env`), set:

  ```ini
  WAZUH_API_PASSWORD=<Aa1- plus 28 random letters and digits>
  WAZUH_ENROLLMENT_PASSWORD=<Aa1- plus 28 random letters and digits>
  WAZUH_PUBLIC_ADDRESS=<the server's LAN IP, e.g. 192.168.1.20>
  ```

  Generate the passwords as shown in [INSTALL.md](../INSTALL.md#3-create-the-settings-file).

- [ ] **Start:** `docker compose up -d --build --wait`

  _Expected:_ the command returns with every service healthy; `docker compose ps wazuh-manager` shows it running.

- [ ] **Firewall:** allow TCP 1514 and 1515 inbound (Windows server, PowerShell as Administrator):

  ```powershell
  New-NetFirewallRule -DisplayName "SIEMple agents" -Direction Inbound -Protocol TCP -LocalPort 1514,1515 -Action Allow -Profile Private
  ```

## 2. Agent PC: connectivity

- [ ] In PowerShell: `Test-NetConnection <server IP> -Port 1514` and again with `-Port 1515`.

  _Expected:_ `TcpTestSucceeded : True` for both. If not, fix this first: the server firewall, or Wi-Fi client isolation (the earlier lab failure). A wired connection or a phone hotspot without isolation works around the latter.

## 3. Agent PC: remove the old agent

- [ ] Settings → Apps → **Wazuh Agent** → Uninstall.
- [ ] In PowerShell as Administrator, confirm nothing is left:

  ```powershell
  Get-Service WazuhSvc -ErrorAction SilentlyContinue
  Test-Path 'C:\Program Files (x86)\ossec-agent'
  ```

  _Expected:_ no service printed, and `False`. If the folder is still there: `Remove-Item -Recurse -Force 'C:\Program Files (x86)\ossec-agent'`.

## 4. SIEMple: generate the command

- [ ] Sign in as an **administrator** and open **Agents**.

  _Expected:_ an empty list ("No agents yet") and an **Add agent** button.

- [ ] **Add agent** → **Windows** → **Next** → group **default**, name `lab-pc-01` → **Generate command**.

  _Expected:_ a PowerShell script with the password shown as `********`, the warning about the enrollment secret, the requirements and a `Test-NetConnection` check.

- [ ] **Reveal** shows the real password; **Hide** masks it again. **Copy**.

## 5. Agent PC: run it

- [ ] Open **Windows PowerShell as Administrator**, paste, press Enter.

  _Expected:_ after the download and install, `Wazuh agent installed and started`. No MSI is left in `%TEMP%`.

## 6. SIEMple: see it connect

- [ ] Back on the page: **I ran it, wait for the agent**.

  _Expected:_ "Waiting for agent...", then **Connected** within about a minute, showing `lab-pc-01`, the Windows version, the PC's IP and `v4.14.10`.

- [ ] **View the agent in Agents**.

  _Expected:_ the list with `lab-pc-01` highlighted, status **Active**, group `default`.

## 7. SIEMple: audit log

- [ ] **Audit Log** → category **Agents**.

  _Expected:_ "Generated an agent enroll command" by you. Its details show `os: windows`, `group: default`, `agentName: lab-pc-01`, and **no password anywhere**.

## 8. Negative checks

- [ ] **Run the same command again** on the Agent PC.

  _Expected:_ it stops with "A Wazuh agent is already installed on this computer..." and changes nothing.

- [ ] **Generate again with the name `lab-pc-01`.**

  _Expected:_ "An agent with this name is already registered..." (409); no command.

- [ ] **Sign in as a T1 or T2 analyst** and open **Agents**.

  _Expected:_ the list, but no Add agent button; opening `/agents/new` directly shows the Unauthorized page.

- [ ] _(Optional)_ **Blocked ports:** disable the firewall rule, uninstall the agent, generate a command with a new name, run it, and wait.

  _Expected:_ after two minutes the troubleshooting list appears, and the page keeps waiting. Re-enable the rule.

- [ ] _(Optional)_ **Manager down:** `docker compose stop wazuh-manager`, then reload **Agents**.

  _Expected:_ "SIEMple can't reach the Wazuh manager..."; `docker compose start wazuh-manager` brings the list back.

## 9. Backups (Linux install only)

- [ ] `sudo /opt/siemple/install.sh backup --no-logs`

  _Expected:_ a `.dump` and a `-wazuh.tar.gz` in `/opt/siemple/backups/`, and the agent reconnects by itself after the manager's short stop.

## When you're done

To uninstall the lab agent again: Settings → Apps → **Wazuh Agent** → Uninstall.
