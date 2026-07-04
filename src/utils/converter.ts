/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts a UTF-8 string into a binary string.
 * @param text The input text to convert.
 * @param separator The character to separate bytes (default is space).
 * @returns The binary representation of the input text.
 */
export function textToBinary(text: string, separator: string = ' '): string {
  if (!text) return '';
  
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  
  const binaryArray: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    binaryArray.push(bytes[i].toString(2).padStart(8, '0'));
  }
  
  return binaryArray.join(separator);
}

/**
 * Converts a binary string back into a UTF-8 string.
 * @param binary The binary input string (can be separated by spaces, commas, or raw).
 * @returns An object with success status, decoded text, and optional error message.
 */
export function binaryToText(binary: string): { success: boolean; text: string; error?: string } {
  if (!binary || binary.trim() === '') {
    return { success: true, text: '' };
  }

  // Sanitize the binary input
  // Replace non-binary and non-whitespace characters
  const sanitized = binary.replace(/[^01\s,;-]/g, '').trim();
  
  if (sanitized === '') {
    return { success: false, text: '', error: 'El texto no contiene dígitos binarios válidos (0 o 1).' };
  }

  let binaryBlocks: string[] = [];

  // Determine if it is separated by whitespace/punctuation or is a continuous stream
  if (/[\s,;-]/.test(sanitized)) {
    // Split by spaces, commas, semicolons, dashes, or newlines
    binaryBlocks = sanitized.split(/[\s,;-]+/).filter(block => block.length > 0);
  } else {
    // Continuous stream of 0s and 1s, slice into chunks of 8 bits
    for (let i = 0; i < sanitized.length; i += 8) {
      binaryBlocks.push(sanitized.slice(i, i + 8));
    }
  }

  const bytes: number[] = [];

  for (let i = 0; i < binaryBlocks.length; i++) {
    const block = binaryBlocks[i];
    
    // Check if the block consists only of 0 and 1
    if (!/^[01]+$/.test(block)) {
      return { 
        success: false, 
        text: '', 
        error: `El bloque "${block}" en la posición ${i + 1} contiene caracteres no binarios.` 
      };
    }
    
    // Check block length - standard bytes are 8 bits.
    // If it's less than 8, pad it on the left or show warning, let's parse it as is, but alert if it's longer than 8 bits
    if (block.length > 8) {
      return {
        success: false,
        text: '',
        error: `El bloque "${block}" supera los 8 bits (un byte). Por favor, verifica el formato.`
      };
    }

    const byteValue = parseInt(block, 2);
    if (isNaN(byteValue) || byteValue < 0 || byteValue > 255) {
      return {
        success: false,
        text: '',
        error: `Valor de byte inválido en el bloque "${block}".`
      };
    }

    bytes.push(byteValue);
  }

  try {
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const decodedText = decoder.decode(uint8Array);
    return { success: true, text: decodedText };
  } catch (err) {
    return { 
      success: false, 
      text: '', 
      error: 'Error al decodificar UTF-8: La secuencia de bytes binarios no forma caracteres UTF-8 válidos.' 
    };
  }
}
