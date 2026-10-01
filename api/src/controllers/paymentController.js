import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

// Helper to fetch PayMongo keys from environment or shop_settings table in MySQL
async function getPayMongoSecretKey() {
  if (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.trim()) {
    return process.env.PAYMONGO_SECRET_KEY.trim();
  }
  try {
    const [rows] = await pool.query("SELECT settings_json FROM shop_settings WHERE id = 1");
    if (rows.length && rows[0].settings_json) {
      const parsed = typeof rows[0].settings_json === "string" ? JSON.parse(rows[0].settings_json) : rows[0].settings_json;
      if (parsed.paymongoSecretKey && parsed.paymongoSecretKey.trim()) {
        return parsed.paymongoSecretKey.trim();
      }
    }
  } catch {
    /* ignore fallback */
  }
  return "";
}

/**
 * POST /api/payments/paymongo/create-source
 * Creates a live PayMongo Payment Intent & QR Code for GCash / QRPh
 */
export async function createSource(req, res) {
  try {
    const { amount, type = "gcash", description = "Cafe Corazon POS Order" } = req.body;
    const amountInCents = Math.round(Number(amount) * 100);

    if (!amountInCents || amountInCents < 100) {
      return res.status(400).json({ message: "Amount must be at least ₱1.00 (100 cents)." });
    }

    const secretKey = await getPayMongoSecretKey();
    if (!secretKey) {
      return res.status(400).json({ message: "PayMongo secret key is not configured in settings." });
    }

    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    // Attempt 1: Try PayMongo Payment Intent API with QRPh Payment Method (Official Dynamic QR Code)
    try {
      const piRes = await fetch("https://api.paymongo.com/v1/payment_intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: amountInCents,
              currency: "PHP",
              payment_method_allowed: ["qrph", "gcash", "paymaya", "card"],
              description: description || "Cafe Corazon POS Payment",
              statement_descriptor: "Cafe Corazon",
            },
          },
        }),
      });

      const piData = await piRes.json();

      if (piRes.ok && piData.data?.id) {
        const piId = piData.data.id;

        // Create QRPh Payment Method
        const pmRes = await fetch("https://api.paymongo.com/v1/payment_methods", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encodedKey}`,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                type: "qrph",
              },
            },
          }),
        });

        const pmData = await pmRes.json();

        if (pmRes.ok && pmData.data?.id) {
          const pmId = pmData.data.id;

          // Attach Payment Method to Payment Intent
          const attachRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${piId}/attach`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${encodedKey}`,
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  payment_method: pmId,
                  return_url: `${process.env.FRONTEND_URL || "https://cafecorazon.shop"}/payment?status=success`,
                },
              },
            }),
          });

          const attachData = await attachRes.json();
          const nextAction = attachData.data?.attributes?.next_action;
          const qrImageUrl = nextAction?.code?.image_url;

          if (attachRes.ok && qrImageUrl) {
            await logAuditFromReq(
              req,
              "PayMongo Intent Created",
              "Payments",
              `Created PayMongo Payment Intent ${piId} with dynamic QR Code for ₱${amount}`,
            );

            return res.json({
              success: true,
              sourceId: piId,
              amount: Number(amount),
              type: "qrph",
              checkoutUrl: "",
              qrCodeUrl: qrImageUrl, // Direct official PayMongo QR Code Image
              status: attachData.data?.attributes?.status || "awaiting_next_action",
            });
          }
        }
      }
    } catch (piErr) {
      console.warn("PayMongo PaymentIntent attempt failed, attempting fallback...", piErr);
    }

    // Attempt 2: Fallback to PayMongo Checkout Sessions API
    const csPayload = {
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          cancel_url: `${process.env.FRONTEND_URL || "https://cafecorazon.shop"}/payment?status=cancelled`,
          success_url: `${process.env.FRONTEND_URL || "https://cafecorazon.shop"}/payment?status=success`,
          line_items: [
            {
              currency: "PHP",
              amount: amountInCents,
              description: description || "Cafe Corazon POS Order",
              name: "Coffee Shop Order",
              quantity: 1,
            },
          ],
          billing: {
            name: req.body.customerName || "Cafe Corazon",
            email: req.body.customerEmail || "customer@cafecorazon.shop",
          },
          payment_method_types: ["qrph", "paymaya", "card", "gcash"],
        },
      },
    };

    const csRes = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedKey}`,
      },
      body: JSON.stringify(csPayload),
    });

    const csData = await csRes.json();

    if (csRes.ok && csData.data) {
      const checkoutUrl = csData.data.attributes?.checkout_url || "";
      const sourceId = csData.data.id;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(checkoutUrl)}`;

      await logAuditFromReq(
        req,
        "PayMongo Checkout Created",
        "Payments",
        `Created PayMongo Checkout Session ${sourceId} for ₱${amount}`,
      );

      return res.json({
        success: true,
        sourceId,
        amount: Number(amount),
        type: "checkout_session",
        checkoutUrl,
        qrCodeUrl,
        status: "pending",
      });
    }

    const errMsg = csData.errors?.[0]?.detail || "Failed to generate PayMongo QR Code.";
    return res.status(400).json({ message: errMsg, errors: csData.errors });
  } catch (err) {
    console.error("PayMongo createSource error:", err);
    return res.status(500).json({ message: err.message || "PayMongo payment creation failed." });
  }
}

/**
 * GET /api/payments/paymongo/status/:sourceId
 * Check live status of a PayMongo source, payment intent, or checkout session
 */
export async function getSourceStatus(req, res) {
  try {
    const { sourceId } = req.params;
    if (!sourceId) return res.status(400).json({ message: "Source ID is required." });

    const secretKey = await getPayMongoSecretKey();
    if (!secretKey) return res.status(400).json({ message: "PayMongo secret key missing." });

    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    let endpoint = `https://api.paymongo.com/v1/sources/${sourceId}`;
    if (sourceId.startsWith("pi_")) {
      endpoint = `https://api.paymongo.com/v1/payment_intents/${sourceId}`;
    } else if (sourceId.startsWith("cs_")) {
      endpoint = `https://api.paymongo.com/v1/checkout_sessions/${sourceId}`;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Basic ${encodedKey}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok || responseData.errors) {
      return res.status(400).json({ message: "Failed to check PayMongo payment status." });
    }

    const attr = responseData.data?.attributes || {};
    let status = attr.status || "pending";
    let isPaid = false;

    if (sourceId.startsWith("pi_")) {
      isPaid = status === "succeeded";
      if (isPaid) status = "paid";
    } else if (sourceId.startsWith("cs_")) {
      const payments = attr.payments || [];
      const hasPaid = payments.some(
        (p) => p.attributes?.status === "paid" || p.attributes?.status === "succeeded"
      );
      isPaid = status === "paid" || hasPaid || attr.payment_intent?.attributes?.status === "succeeded";
      if (isPaid) status = "paid";
    } else {
      isPaid = status === "chargeable" || status === "paid";
    }

    return res.json({
      sourceId,
      status, // 'pending', 'paid', 'succeeded', 'cancelled'
      amount: attr.amount ? attr.amount / 100 : 0,
      isPaid,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "PayMongo status check failed." });
  }
}

/**
 * POST /api/payments/paymongo/webhook
 * PayMongo Webhook listener for instant payment notifications
 */
export async function handleWebhook(req, res) {
  try {
    const event = req.body?.data;
    if (!event) return res.status(400).send("Invalid webhook payload");

    const eventType = event.attributes?.type;
    const sourceData = event.attributes?.data;

    console.log(`[PayMongo Webhook] Event: ${eventType}`, sourceData?.id);

    if (eventType === "source.chargeable") {
      const sourceId = sourceData?.id;
      const amount = sourceData?.attributes?.amount;

      // Automatically charge source to convert to completed payment
      const secretKey = await getPayMongoSecretKey();
      const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

      await fetch("https://api.paymongo.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount,
              currency: "PHP",
              source: {
                id: sourceId,
                type: "source",
              },
              description: "Cafe Corazon POS Webhook Auto-Charge",
            },
          },
        }),
      });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("PayMongo webhook error:", err);
    return res.status(500).send("Webhook handler error");
  }
}
