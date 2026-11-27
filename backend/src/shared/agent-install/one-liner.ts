import { AgentOs } from '../../domain/enums/AgentOs.ts';
import { quoteBash, quotePowerShell } from './shell-quote.ts';
import { installScriptFileName } from './install-script.ts';

// How a one-liner reaches the enrollment service over TLS. Empty for now; step 8 (the service's
// own self-signed certificate) fills it with certificate pinning (for example curl's
// --pinnedpubkey, and a PowerShell certificate check) without changing the page or this builder.
export interface IOneLinerTls {
  curlArgs: string[];
  powershellPrelude: string[];
}

export const NO_TLS_PINNING: IOneLinerTls = { curlArgs: [], powershellPrelude: [] };

// The copyable fallback: downloads the same one-time script, then runs it.
export const buildOneLiner = (
  os: AgentOs,
  scriptUrl: string,
  tls: IOneLinerTls = NO_TLS_PINNING,
): string => {
  const file = installScriptFileName(os);
  if (os === AgentOs.WINDOWS) {
    return [
      ...tls.powershellPrelude,
      `Invoke-WebRequest -Uri ${quotePowerShell(scriptUrl)} -OutFile ${file} -UseBasicParsing`,
      `powershell -ExecutionPolicy Bypass -File .\\${file}`,
    ].join('; ');
  }
  return [
    ['curl', '-fsSL', ...tls.curlArgs, '-o', file, quoteBash(scriptUrl)].join(' '),
    `sudo bash ${file}`,
  ].join(' && ');
};
