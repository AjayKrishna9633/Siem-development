// The marker line has a fixed shape on purpose: install.sh finds the token in `docker compose
// logs api` by matching "SIEMple setup token:", so change both together.
export const setupTokenLine = (token: string, appUrl: string): string =>
  `==== SIEMple setup token: ${token} (open ${appUrl} to complete setup) ====`;

export const printSetupTokenBanner = (token: string, expiresAt: Date, appUrl: string): void => {
  console.log(
    [
      '',
      setupTokenLine(token, appUrl),
      `     Valid until ${expiresAt.toISOString()}. Any earlier setup token no longer works.`,
      '     A new one is issued every time the server starts, until setup is complete.',
      '',
    ].join('\n'),
  );
};
