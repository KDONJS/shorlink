export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateShortCode(code: string): boolean {
  // Solo letras, números, guiones y guiones bajos, entre 3 y 20 caracteres
  const regex = /^[a-zA-Z0-9_-]{3,20}$/;
  return regex.test(code);
}