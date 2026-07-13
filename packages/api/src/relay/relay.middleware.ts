import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { RelayGateway } from './relay.gateway';
import { RequestsService } from '../requests/requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RelayMiddleware implements NestMiddleware {
  constructor(
    private readonly config: ConfigService,
    private readonly gateway: RelayGateway,
    private readonly requestsService: RequestsService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Check if this is the password verification route
    if (req.path === '/verify-tunnel-password' && req.method === 'POST') {
      const { tunnelId, password } = req.body || {};
      if (!tunnelId || !password) {
        res.status(400).json({ message: 'Missing tunnel ID or password' });
        return;
      }

      const tunnel = await this.prisma.tunnel.findUnique({
        where: { id: tunnelId },
      });

      if (!tunnel || !tunnel.passwordHash) {
        res.status(404).json({ message: 'Tunnel not found or not protected' });
        return;
      }

      const isMatch = await bcrypt.compare(password, tunnel.passwordHash);
      if (!isMatch) {
        res.status(401).json({ message: 'Incorrect password' });
        return;
      }

      // Set cookie for 24 hours
      res.setHeader('Set-Cookie', `proxync_tunnel_session_${tunnel.id}=verified; Path=/; HttpOnly; Max-Age=86400`);
      res.status(200).json({ success: true });
      return;
    }

    const host = req.headers.host || '';
    const baseDomain = this.config.get<string>('RELAY_SUBDOMAIN_BASE') || 'localtest.me';
    const domainWithoutPort = host.split(':')[0];

    let subdomain: string | null = null;

    // 2. Resolve subdomain either via wildcards or custom domains
    if (
      domainWithoutPort.endsWith(`.${baseDomain}`) &&
      domainWithoutPort !== baseDomain &&
      !domainWithoutPort.startsWith('api.')
    ) {
      subdomain = domainWithoutPort.replace(`.${baseDomain}`, '');
    } else {
      // Check if domainWithoutPort matches a verified custom domain
      const verifiedDomain = await this.prisma.domain.findFirst({
        where: { name: domainWithoutPort, verified: true },
        include: {
          workspace: {
            include: {
              tunnels: {
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (verifiedDomain && verifiedDomain.workspace.tunnels.length > 0) {
        subdomain = verifiedDomain.workspace.tunnels[0].subdomain;
      }
    }

    if (subdomain) {
      // 3. Check if agent is online
      const agent = this.gateway.getAgent(subdomain);
      if (!agent) {
        res.status(502).send('Bad Gateway: Tunnel not found or offline');
        return;
      }

      // 4. Check for Password Protection
      const tunnel = await this.prisma.tunnel.findUnique({
        where: { id: agent.tunnelId },
      });

      if (tunnel?.passwordHash) {
        const cookieHeader = req.headers.cookie || '';
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const parts = c.trim().split('=');
            return [parts[0], parts.slice(1).join('=')];
          }),
        );

        const isVerified = cookies[`proxync_tunnel_session_${tunnel.id}`] === 'verified';
        if (!isVerified) {
          // Serve gorgeous premium lock screen HTML
          const lockScreenHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Password Protected Tunnel | Proxync</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0b0f;
      --surface: #111218;
      --border: #2a2d3a;
      --accent: #6c63ff;
      --accent-hover: #7c74ff;
      --text: #f1f2f7;
      --text-muted: #8b8fa8;
      --red: #ef4444;
    }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      overflow: hidden;
      position: relative;
    }
    body::before {
      content: '';
      position: absolute;
      top: -30%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(108, 99, 255, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 360px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      text-align: center;
      z-index: 10;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--accent), #9c95ff);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      color: white;
      margin-bottom: 24px;
      box-shadow: 0 0 20px rgba(108, 99, 255, 0.4);
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }
    p {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0 0 24px 0;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: all 0.15s;
      margin-bottom: 16px;
      text-align: center;
    }
    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.15);
    }
    button {
      width: 100%;
      padding: 12px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    button:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    .error {
      color: var(--red);
      font-size: 12px;
      margin-bottom: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">P</div>
    <h1>Protected Tunnel</h1>
    <p>This tunnel requires an access password to view.</p>
    <form>
      <input type="password" name="password" placeholder="Enter password" required autofocus>
      <button type="submit">Unlock Tunnel</button>
    </form>
  </div>
  <script>
    const form = document.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = form.password.value;
      
      let errDiv = document.querySelector('.error');
      if (errDiv) errDiv.remove();

      try {
        const response = await fetch('/verify-tunnel-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tunnelId: '${tunnel.id}',
            password
          })
        });
        if (response.ok) {
          window.location.reload();
        } else {
          const err = await response.json();
          const errorMsg = document.createElement('div');
          errorMsg.className = 'error';
          errorMsg.textContent = '⚠️ ' + (err.message || 'Incorrect password');
          form.insertBefore(errorMsg, form.password);
        }
      } catch (err) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error';
        errorMsg.textContent = '⚠️ Network error. Please try again.';
        form.insertBefore(errorMsg, form.password);
      }
    });
  </script>
</body>
</html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.status(401).send(lockScreenHtml);
          return;
        }
      }

      // 5. Proceed with forwarding request to the online tunnel agent
      const requestId = uuidv4();
      let bodyStr = '';
      if (req.body && Object.keys(req.body).length > 0) {
        bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
      
      const startTime = Date.now();

      await this.requestsService.logRequest({
        id: requestId,
        tunnelId: agent.tunnelId,
        method: req.method,
        path: req.originalUrl || req.url,
        headers: req.headers as Record<string, string>,
        bodyPreview: bodyStr.substring(0, 1024 * 1024), // Cap at 1MB
        capturedAt: new Date().toISOString(),
      });

      const responsePayload = await this.gateway.forwardRequest(
        subdomain,
        requestId,
        req.method,
        req.originalUrl || req.url, // keep full path
        req.headers as Record<string, string>,
        bodyStr,
        30000,
      );

      if (!responsePayload) {
        res.status(504).send('Gateway Timeout');
        await this.requestsService.updateResponse(agent.tunnelId, requestId, 504, Date.now() - startTime);
        return;
      }

      await this.requestsService.updateResponse(
        agent.tunnelId, 
        requestId, 
        responsePayload.status, 
        Date.now() - startTime,
        responsePayload.headers
      );

      res.status(responsePayload.status);
      for (const [k, v] of Object.entries(responsePayload.headers)) {
        if (k.toLowerCase() === 'transfer-encoding') continue;
        if (k.toLowerCase() === 'content-encoding') continue;
        if (k.toLowerCase() === 'content-length') continue;
        res.setHeader(k, v);
      }
      if (responsePayload.body) {
        const bodyBuffer = Buffer.from(responsePayload.body, 'base64');
        res.send(bodyBuffer);
      } else {
        res.send();
      }
      return;
    }

    next();
  }
}
