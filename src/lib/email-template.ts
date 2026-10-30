export function passcodeHtml({ code }: { code: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AlgoEdge Pro Passcode</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0a0a0f;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#11111a;border:1px solid #22222a;border-radius:24px;overflow:hidden;">
<tr>
<td align="center" style="padding:48px 32px 24px;">
<div style="font-size:52px;margin-bottom:16px;line-height:1;">📈</div>
<h1 style="font-size:32px;font-weight:700;margin:0 0 6px 0;color:#ffffff;letter-spacing:-1px;">AlgoEdge Pro</h1>
<p style="font-size:16px;color:#a1a1aa;margin:0 0 32px 0;">Your identity verification code</p>
</td>
</tr>
<tr>
<td align="center" style="padding:0 32px 40px;">
<div style="background-color:#1a1a24;border:1px solid #33333f;border-radius:16px;padding:36px;text-align:center;">
<p style="font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px 0;">Passcode</p>
<div style="font-size:48px;font-weight:700;color:#10b981;letter-spacing:10px;font-family:'SF Mono',Monaco,Inconsolata,'Courier New',monospace;">${code}</div>
<p style="font-size:14px;color:#a1a1aa;margin:20px 0 0 0;">This code expires in <strong style="color:#ffffff;">10 minutes</strong>.</p>
</div>
</td>
</tr>
<tr>
<td style="padding:0 32px 40px;border-top:1px solid #22222a;">
<p style="font-size:13px;color:#777777;text-align:center;line-height:1.6;margin:0;">
If you didn't request this, you can safely ignore this email.<br />
For your security, never share this code with anyone.
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function passcodeText({ code }: { code: string }) {
  return `Your AlgoEdge Pro verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n- AlgoEdge Pro Team`;
}
// New Magic Link Templates
export function magicLinkHtml({ 
  magicUrl, 
  email 
}: { 
  magicUrl: string; 
  email: string; 
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AlgoEdge Pro Magic Link</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;color:#ffffff;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0a0a0f;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#11111a;border:1px solid #22222a;border-radius:24px;overflow:hidden;">
<tr>
<td align="center" style="padding:48px 32px 24px;">
<div style="font-size:52px;margin-bottom:16px;line-height:1;">✨</div>
<h1 style="font-size:32px;font-weight:700;margin:0 0 6px 0;color:#ffffff;letter-spacing:-1px;">AlgoEdge Pro</h1>
<p style="font-size:16px;color:#a1a1aa;margin:0 0 32px 0;">Your secure sign-in link</p>
</td>
</tr>
<tr>
<td align="center" style="padding:0 32px 40px;">
<div style="background-color:#1a1a24;border:1px solid #33333f;border-radius:16px;padding:36px;text-align:center;">
<p style="font-size:18px;color:#ffffff;margin:0 0 24px 0;">Click the button below to sign in securely:</p>
<a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg, #8b5cf6, #a855f7);color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:600;font-size:16px;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(139,92,246,0.3);transition:all 0.2s ease;">
🪄 Sign In with Magic Link
</a>
<p style="font-size:14px;color:#a1a1aa;margin:24px 0 0 0;">This link expires in <strong style="color:#ffffff;">15 minutes</strong>.</p>
</div>
</td>
</tr>
<tr>
<td style="padding:0 32px 40px;border-top:1px solid #22222a;">
<p style="font-size:13px;color:#777777;text-align:center;line-height:1.6;margin:16px 0 0 0;">
If the button doesn't work, copy and paste this link:<br />
<span style="color:#8b5cf6;word-break:break-all;font-family:monospace;">${magicUrl}</span>
</p>
<p style="font-size:13px;color:#777777;text-align:center;line-height:1.6;margin:16px 0 0 0;">
If you didn't request this, you can safely ignore this email.<br />
This was requested for: <strong style="color:#ffffff;">${email}</strong>
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function magicLinkText({ 
  magicUrl, 
  email 
}: { 
  magicUrl: string; 
  email: string; 
}) {
  return `Sign in to AlgoEdge Pro

Click this link to sign in securely:
${magicUrl}

This link expires in 15 minutes and can only be used once.

If you didn't request this, please ignore this email.
This was requested for: ${email}

- AlgoEdge Pro Team`;
}