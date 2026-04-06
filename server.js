const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const maxRequestsPerWindow = 5;
const rateLimitWindowMs = 10 * 60 * 1000;
const requestStore = new Map();
const allowedSegments = new Set(['infantil', 'fundamental-medio', 'universitario', 'escritorio']);

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const hostOrigin = `${req.protocol}://${req.get('host')}`;

    if (!origin || origin === hostOrigin) {
        res.header('Access-Control-Allow-Origin', origin || hostOrigin);
    }

    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.static(__dirname, { dotfiles: 'ignore', extensions: ['html'] }));

const requiredEnvKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO'];

const segmentLabels = {
    infantil: 'Ensino Infantil',
    'fundamental-medio': 'Ensino Fundamental',
    universitario: 'Ensino Medio / Universitario',
    escritorio: 'Corporativo / Escritorio'
};

const sanitize = (value) => String(value || '').trim();
const escapeHtml = (value) => sanitize(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isWithinLimit = (value, limit) => sanitize(value).length <= limit;

const hasMailConfig = () => requiredEnvKeys.every((key) => sanitize(process.env[key]) !== '');

const createTransporter = () => nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const isRateLimited = (ip) => {
    const now = Date.now();
    const previous = requestStore.get(ip) || [];
    const activeRequests = previous.filter((timestamp) => now - timestamp < rateLimitWindowMs);

    if (activeRequests.length >= maxRequestsPerWindow) {
        requestStore.set(ip, activeRequests);
        return true;
    }

    activeRequests.push(now);
    requestStore.set(ip, activeRequests);
    return false;
};

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        mailConfigured: hasMailConfig()
    });
});

app.post('/api/contact', async (req, res) => {
    const company = sanitize(req.body.company);
    const segment = sanitize(req.body.segment);
    const name = sanitize(req.body.name);
    const email = sanitize(req.body.email);
    const message = sanitize(req.body.message);
    const website = sanitize(req.body.website);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (website) {
        return res.status(400).json({
            ok: false,
            message: 'Envio rejeitado.'
        });
    }

    if (isRateLimited(clientIp)) {
        return res.status(429).json({
            ok: false,
            message: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
        });
    }

    if (!segment || !name || !email || !message) {
        return res.status(400).json({
            ok: false,
            message: 'Preencha os campos obrigatorios antes de enviar.'
        });
    }

    if (!allowedSegments.has(segment)) {
        return res.status(400).json({
            ok: false,
            message: 'Segmento invalido.'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            ok: false,
            message: 'Informe um e-mail valido.'
        });
    }

    if (!isWithinLimit(company, 120) || !isWithinLimit(name, 120) || !isWithinLimit(email, 160) || !isWithinLimit(message, 4000)) {
        return res.status(400).json({
            ok: false,
            message: 'Alguns campos ultrapassaram o limite permitido.'
        });
    }

    if (!hasMailConfig()) {
        return res.status(500).json({
            ok: false,
            message: 'O servidor ainda nao foi configurado com as credenciais de e-mail.'
        });
    }

    try {
        const transporter = createTransporter();
        await transporter.verify();

        const formattedSegment = segmentLabels[segment] || segment;
        const companyLine = company ? company : 'Nao informado';
        const fromHeader = sanitize(process.env.CONTACT_FROM) || process.env.SMTP_USER;
        const safeName = escapeHtml(name);
        const safeEmail = escapeHtml(email);
        const safeCompany = escapeHtml(companyLine);
        const safeSegment = escapeHtml(formattedSegment);
        const safeMessage = escapeHtml(message);

        await transporter.sendMail({
            from: fromHeader,
            to: process.env.CONTACT_TO,
            replyTo: email,
            subject: `Novo contato pelo site MoveBrink - ${name}`,
            text: [
                'Novo formulario enviado pelo site MoveBrink.',
                '',
                `Nome: ${name}`,
                `Email: ${email}`,
                `Empresa: ${companyLine}`,
                `Segmento: ${formattedSegment}`,
                '',
                'Mensagem:',
                message
            ].join('\n'),
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2933;">
                    <h2 style="margin-bottom: 16px;">Novo contato pelo site MoveBrink</h2>
                    <p><strong>Nome:</strong> ${safeName}</p>
                    <p><strong>Email:</strong> ${safeEmail}</p>
                    <p><strong>Empresa:</strong> ${safeCompany}</p>
                    <p><strong>Segmento:</strong> ${safeSegment}</p>
                    <p><strong>Mensagem:</strong></p>
                    <div style="padding: 16px; background: #f6f8fa; border-radius: 8px; white-space: pre-wrap;">${safeMessage}</div>
                </div>
            `
        });

        return res.json({
            ok: true,
            message: 'Mensagem enviada com sucesso. Em breve a empresa recebera este contato.'
        });
    } catch (error) {
        console.error('Erro ao enviar contato:', error);

        return res.status(500).json({
            ok: false,
            message: 'Nao foi possivel enviar o e-mail agora. Verifique as credenciais SMTP e tente novamente.'
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor MoveBrink ativo em http://localhost:${port}`);
});
