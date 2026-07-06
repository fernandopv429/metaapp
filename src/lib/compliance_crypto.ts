import crypto from 'crypto';

export function verifySignature(payload: string | Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const signature = signatureHeader.slice(7);
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);
}

export function decodeSignedRequest(signedRequest: string, appSecret: string): any {
  try {
    const [encodedSig, payload] = signedRequest.split('.', 2);
    if (!encodedSig || !payload) throw new Error('Invalid signed_request format');

    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

    // Validate signature using expected method for signed_request (HMAC-SHA256)
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest();

    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      throw new Error('Invalid signed_request signature');
    }

    return data;
  } catch (err) {
    console.error("Error decoding signed_request:", err);
    return null;
  }
}
