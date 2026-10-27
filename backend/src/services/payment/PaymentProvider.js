/**
 * Payment provider contract — swap SimulatedQRPhProvider for a real gateway later.
 * @typedef {object} PaymentIntentResult
 * @property {string} transactionId
 * @property {string} transactionNumber
 * @property {string} qrToken
 * @property {string} qrPayload
 * @property {string} scanUrl
 * @property {number} amount
 * @property {string} status
 * @property {string} expiresAt
 *
 * @typedef {object} PaymentConfirmResult
 * @property {string} referenceNumber
 * @property {string} paymentChannel
 * @property {string} paidAt
 * @property {string} status
 */

export class PaymentProvider {
  /** @returns {Promise<PaymentIntentResult>} */
  async createIntent(_payload) {
    throw new Error("createIntent not implemented");
  }

  /** @returns {Promise<PaymentConfirmResult>} */
  async confirmPayment(_token, _channel) {
    throw new Error("confirmPayment not implemented");
  }

  /** @returns {Promise<{ status: string }>} */
  async cancelPayment(_token) {
    throw new Error("cancelPayment not implemented");
  }

  /** @returns {Promise<{ referenceNumber: string }>} */
  generateReferenceNumber() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return { referenceNumber: `QRPH-${ts}-${rand}` };
  }
}
