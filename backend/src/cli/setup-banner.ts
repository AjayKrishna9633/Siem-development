// The one place a raw setup token is ever written anywhere: the operator's terminal.
// It is not stored (only its hash is), so this output is the only copy.
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
