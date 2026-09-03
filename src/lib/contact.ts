/** Canal de contacto oficial de Chequi (único: WhatsApp). */
export const WHATSAPP_NUMBER = "573204963384";
export const WHATSAPP_DISPLAY = "+57 320 496 3384";

export const WHATSAPP_MESSAGE =
  "Hola, estoy interesado en conocer más sobre Chequi para mis eventos. ¿Podrían brindarme información?";

export const getWhatsAppUrl = (message: string = WHATSAPP_MESSAGE) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
