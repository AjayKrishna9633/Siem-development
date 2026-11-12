export const printSetupTokenBanner = (token: string, expiresAt: Date): void => {
  const rule = '='.repeat(72);
  console.log(
    [
      '',
      rule,
      '  SIEMple first-run setup',
      '',
      '  Open SIEMple in your browser and enter this setup token:',
      '',
      `      ${token}`,
      '',
      `  Valid until ${expiresAt.toISOString()}. It is shown only once.`,
      '  Lost it? Run "npm run setup-token" in the backend folder for a new one.',
      rule,
      '',
    ].join('\n'),
  );
};
