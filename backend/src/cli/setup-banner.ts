// install.sh matches "SIEMple setup token:"; change both together.
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
