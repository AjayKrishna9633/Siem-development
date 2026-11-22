// navigator.clipboard only exists on HTTPS or localhost. A plain-HTTP install on a LAN IP (the
// default) falls back to a hidden textarea and the older copy command.
export const copyText = async (text: string): Promise<void> => {
  if (window.isSecureContext && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  if (!copied) throw new Error('Copy failed');
};
