export function buildShareUrls(params: { url: string; title: string; text: string }) {
  const { url, title, text } = params;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`,
  };
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.share);
}

export async function nativeShare(params: { url: string; title: string; text: string }): Promise<boolean> {
  if (!canUseNativeShare()) return false;
  try {
    await navigator.share({
      url: params.url,
      title: params.title,
      text: params.text,
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
