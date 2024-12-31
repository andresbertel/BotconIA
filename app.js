const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const { chat } = require('./scripts/gemini.js');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const nodemailer = require('nodemailer');

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes cambiar a otro proveedor como Outlook o Yahoo
    auth: {
        user: 'tiendaalfasmart@gmail.com', // Reemplaza con tu correo
        pass: 'wnml bxyx pvdv bawg' // Reemplaza con tu contraseña (usa App Password si es necesario)
    }
});

// Función para enviar el correo
async function enviarCorreo(destinatario, asunto, mensaje) {
    try {
        const info = await transporter.sendMail({
            from: '"andres@hotmail.com"', // Remitente
            to: destinatario, // Dirección de destino
            subject: asunto, // Asunto del correo
            text: mensaje, // Cuerpo del correo
        });

        console.log('Correo enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error al enviar el correo:', error);
        return false;
    }
}


// Variables globales para almacenar las respuestas
let nombre = '';
let direccion = '';
let telefono = '';
let producto = '';

const flowCompra = addKeyword(['comprar', 'Comprar', 'compra', 'Compra'])
    // Pregunta del nombre
    .addAnswer('Para poder procesar tu compra, necesito algunos datos. ¿Cómo te llamas?', { capture: true })
    .addAction(async (ctx, { flowDynamic, fallBack }) => {
        // Guardar la respuesta del nombre en la variable global
        nombre = ctx.body || '';

        // Validar si el nombre es válido
        if (!nombre) {
            await flowDynamic([{ body: 'Por favor, ingresa tu nombre para continuar.' }]);
            return fallBack();
        }
        
        return;
    })
    // Pregunta de dirección
    .addAnswer('¿Cuál es tu dirección de envío?', { capture: true })
    .addAction(async (ctx, { flowDynamic, fallBack }) => {
        // Guardar la respuesta de la dirección en la variable global
        direccion = ctx.body || '';

        // Validar si la dirección es válida
        if (!direccion) {
            await flowDynamic([{ body: 'Por favor, ingresa tu dirección para continuar.' }]);
            return fallBack();
        }

       
        return;
    })
    // Pregunta de teléfono
    .addAnswer('¿Cuál es tu número de teléfono?', { capture: true })
    .addAction(async (ctx, { flowDynamic, fallBack }) => {
        // Guardar la respuesta del teléfono en la variable global
        telefono = ctx.body || '';

        // Validar si el teléfono es válido
        if (!telefono) {
            await flowDynamic([{ body: 'Por favor, ingresa tu número de teléfono para continuar.' }]);
            return fallBack();
        }

              return;
    })
    // Pregunta de producto
    .addAnswer('¿Qué producto deseas comprar?', { capture: true })
    .addAction(async (ctx, { flowDynamic, fallBack, provider }) => {
        // Guardar la respuesta del producto en la variable global
        producto = ctx.body || '';

        // Validar si el producto es válido
        if (!producto) {
            await flowDynamic([{ body: 'Por favor, ingresa el producto que deseas comprar.' }]);
            return fallBack();
        }

        // Crear el mensaje con los datos del cliente y su pedido
        const mensajePedido = `
            **Nuevo Pedido de Cliente:**
            - Nombre: ${nombre}
            - Dirección: ${direccion}
            - Teléfono: ${telefono}
            - Producto: ${producto}
        `;

      // Concatenar el nombre y el producto para el asunto del correo
            const asuntoCorreo = `Pedido de : ${nombre} - ${producto}`;

            // Enviar correo al finalizar el flujo
            const correoEnviado = await enviarCorreo(
                'rembertomontes2013@gmail.com', // Correo de destino
                asuntoCorreo,          // Asunto con el nombre y producto
                mensajePedido         // Cuerpo del mensaje
            );

        if (correoEnviado) {
            await flowDynamic([{
                body: 'Tu pedido ha sido enviado por correo al dueño. Pronto te contactarán para confirmar tu compra. ¡Gracias!'
            }]);
            

            return;

        } else {
            await flowDynamic([{
                body: 'Hubo un problema al procesar tu pedido. Por favor, intenta más tarde.'
            }]);
        }

        return fallBack();
    });









// Flujo genérico para manejar cualquier otro mensaje
const flowGenerico = addKeyword([EVENTS.WELCOME])
    .addAnswer(
        '🙌 Hola, bienvenido a Alfa Smart, es un placer tenerte aquí. ¿En qué te puedo ayudar?'
    )
    .addAction({
        capture: true,
    }, async (ctx, { flowDynamic, fallBack }) => {
        const prompt = process.env.PROMPT;
        const text = ctx.body.trim();

        if (!text) {
            await flowDynamic([{ body: "¿En qué más puedo ayudarte?" }]);
            return fallBack();
        }

        let response;
        try {
            if (/^[0-9+\-*/().\s]+$/.test(text)) {
                response = `El resultado es: ${eval(text)}`;
            } else {
                response = await chat(prompt, text);
            }
        } catch (err) {
            response = "Lo siento, no entendí tu mensaje. ¿Puedes intentar de nuevo?";
        }

        // Enviar respuesta y mostrar botones interactivos
        await flowDynamic([
            { body: response },
        ]);

        // Agregar botones
        await flowDynamic([
            {
                body: 'Elige una opción:',
                buttons: [
                    { body: 'Comprar' },
                    { body: 'Seguir buscando' },
                ],
            },
        ]);

        return fallBack();
    });

// Flujo para manejar palabras relacionadas con ubicación
const flowUbicacion = addKeyword([
    'ubicados', 
    'ubicados', 
    'ubicacion', 
    'donde estan', 
    'mapa', 
    'dirección', 
    'direccion'
])
.addAnswer(
    'Estamos ubicados en el siguiente lugar: https://maps.app.goo.gl/WiPH2bnYMPjXPGFh6');
        



// Configuración principal del bot
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowGenerico, flowCompra,flowUbicacion]); // Agregamos ambos flujos
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
