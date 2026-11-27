import { describe, expect, it } from 'vitest';
import { buildInstallScript } from '../../src/shared/agent-install/install-script.ts';
import { AgentArch, AgentOs } from '../../src/domain/enums/AgentOs.ts';

const CLIENT_KEY = `001 web-01 any ${'ab12'.repeat(16)}`;
const KEY = Buffer.from(CLIENT_KEY).toString('base64');
const base = {
  arch: AgentArch.X86_64,
  agentVersion: '4.14.10',
  managerAddress: '192.168.1.20',
  agentName: 'web-01',
  agentKey: KEY,
};
const script = (os: AgentOs, overrides: Partial<typeof base> = {}) =>
  buildInstallScript({ os, ...base, ...overrides });

describe('install script for a pre-registered agent', () => {
  it.each([AgentOs.WINDOWS, AgentOs.LINUX_DEB, AgentOs.LINUX_RPM])(
    'never enrolls through authd on %s',
    (os) => {
      const { body } = script(os);
      expect(body).not.toMatch(/WAZUH_REGISTRATION|WAZUH_AGENT_GROUP|WAZUH_AGENT_NAME|authd\.pass/);
      expect(body).not.toContain('1515');
      // Inside the Linux sed expression the slashes are escaped.
      expect(body).toMatch(/<enrollment><enabled>no<\\?\/enabled><\\?\/enrollment>/);
      expect(body).toMatch(/WAZUH_MANAGER/);
      expect(body).toContain('1514');
    },
  );

  it.each([AgentOs.WINDOWS, AgentOs.LINUX_DEB, AgentOs.LINUX_RPM])(
    'never passes the key on a command line, nor runs manage_agents, on %s',
    (os) => {
      const { body } = script(os);
      expect(body).not.toContain('manage_agents');
      expect(body).not.toContain(KEY);
      expect(body.split(CLIENT_KEY)).toHaveLength(2);
    },
  );

  it('writes client.keys from a variable, root:wazuh 640, then restarts the agent (Linux)', () => {
    const { body } = script(AgentOs.LINUX_DEB);
    expect(body).toContain(`CLIENT_KEY='${CLIENT_KEY}'`);
    expect(body).toContain(
      `( umask 077 && printf '%s\\n' "$CLIENT_KEY" > /var/ossec/etc/client.keys )`,
    );
    expect(body).toContain('chown root:wazuh /var/ossec/etc/client.keys');
    expect(body).toContain('chmod 640 /var/ossec/etc/client.keys');
    const keysAt = body.indexOf('> /var/ossec/etc/client.keys');
    expect(body.indexOf('systemctl restart wazuh-agent')).toBeGreaterThan(keysAt);
  });

  it('writes client.keys with an Administrators-only ACL, then restarts the agent (Windows)', () => {
    const { body } = script(AgentOs.WINDOWS);
    expect(body).toContain(`$ClientKey = '${CLIENT_KEY}'`);
    expect(body).toContain("$keys = Join-Path $InstallDir 'client.keys'");
    expect(body).toContain(
      '[IO.File]::WriteAllText($keys, $ClientKey + "`n", [Text.Encoding]::ASCII)',
    );
    expect(body).toContain("SecurityIdentifier('S-1-5-32-544')");
    expect(body).toContain('$acl.SetAccessRuleProtection($true, $false)');
    expect(body).toContain('Set-Acl -LiteralPath $keys -AclObject $acl');
    expect(body.indexOf("Restart-Service -Name 'WazuhSvc'")).toBeGreaterThan(
      body.indexOf('Set-Acl'),
    );
  });

  it('installs with apt-get on Debian and dnf (or yum) on RHEL', () => {
    const deb = script(AgentOs.LINUX_DEB, { arch: AgentArch.ARM64 }).body;
    expect(deb).toContain('apt-get install -y "$TMP/wazuh-agent.deb"');
    expect(deb).toContain('wazuh-agent_4.14.10-1_arm64.deb');
    expect(deb).toContain('systemctl enable wazuh-agent');

    const rpm = script(AgentOs.LINUX_RPM).body;
    expect(rpm).toContain('dnf install -y "$TMP/wazuh-agent.rpm"');
    expect(rpm).toContain('yum install -y "$TMP/wazuh-agent.rpm"');
    expect(rpm).toContain('wazuh-agent-4.14.10-1.x86_64.rpm');
  });

  it('installs the MSI quietly with only WAZUH_MANAGER', () => {
    const { body } = script(AgentOs.WINDOWS);
    expect(body).toContain(`'/i "{0}" /q WAZUH_MANAGER={1}'`);
    expect(body).toContain('wazuh-agent-4.14.10-1.msi');
    expect(body).toContain('#Requires -RunAsAdministrator');
  });

  it('uses one fixed file name per OS, with CRLF line ends for PowerShell', () => {
    expect(script(AgentOs.LINUX_RPM)).toMatchObject({
      fileName: 'siemple-agent.sh',
      contentType: 'text/x-shellscript; charset=utf-8',
    });
    const windows = script(AgentOs.WINDOWS);
    expect(windows.fileName).toBe('siemple-agent.ps1');
    expect(windows.body).toContain('\r\n');
  });

  it('only deletes itself, never whatever $0 is under curl | sh', () => {
    expect(script(AgentOs.LINUX_DEB).body).toContain(
      'case "$0" in *siemple-agent*.sh) rm -f -- "$0" ;; esac',
    );
  });

  const encode = (line: string) => Buffer.from(line).toString('base64');
  it.each([
    ['a key that is not base64', { agentKey: "abc'; rm -rf /" }],
    ['a key that is not a client.keys line', { agentKey: encode('001 web-01 any $(reboot)') }],
    ['a key with a short secret', { agentKey: encode('001 web-01 any abc123') }],
    ['a key for another agent', { agentKey: encode(`002 other-01 any ${'ab12'.repeat(16)}`) }],
    ['a manager address with a shell character', { managerAddress: '1.2.3.4;reboot' }],
    ['an agent name with a space', { agentName: 'web 01' }],
    ['a version that is not a version', { agentVersion: 'latest' }],
  ])('refuses %s', (_label, overrides) => {
    expect(() => script(AgentOs.LINUX_DEB, overrides)).toThrow();
    expect(() => script(AgentOs.WINDOWS, overrides)).toThrow();
  });
});
