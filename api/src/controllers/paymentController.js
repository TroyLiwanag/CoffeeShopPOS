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
 * Creates a PayMongo Source for GCash / QRPh
 */
export async function createSource(req, res) {
  try {
    const { amount, type = "gcash", description = "Cafe Corazon POS Order" } = req.body;
    const amountInCents = Math.round(Number(amount) * 100);

    if (!amountInCents || amountInCents < 100) {
      return res.status(400).json({ message: "Amount must be at least ₱1.00 (100 cents)." });
    }

    const secretKey = await getPayMongoSecretKey();
    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    // Attempt 1: Try creating PayMongo Source (qrph first or gcash)
    let sourceType = type === "gcash" ? "gcash" : "qrph";
    let payload = {
      data: {
        attributes: {
          amount: amountInCents,
          currency: "PHP",
          type: sourceType,
          redirect: {
            success: `${process.env.FRONTEND_URL || "https://cafecorazon.shop"}/payment?status=success`,
            failed: `${process.env.FRONTEND_URL || "https://cafecorazon.shop"}/payment?status=failed`,
          },
          billing: {
            name: req.body.customerName || "Cafe Corazon",
            email: req.body.customerEmail || "customer@cafecorazon.shop",
          },
        },
      },
    };

    let response = await fetch("https://api.paymongo.com/v1/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedKey}`,
      },
      body: JSON.stringify(payload),
    });

    let responseData = await response.json();

    // If GCash source fails because organization isn't enabled for legacy direct gcash, retry with QRPh or Checkout Session
    if (!response.ok && responseData.errors && sourceType === "gcash") {
      sourceType = "qrph";
      payload.data.attributes.type = "qrph";
      response = await fetch("https://api.paymongo.com/v1/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        body: JSON.stringify(payload),
      });
      responseData = await response.json();
    }

    // Attempt 2: If Sources API fails, try PayMongo Checkout Session API (supports QRPh, GCash, Maya, Cards)
    if (!response.ok || responseData.errors) {
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
                description: "Cafe Corazon POS Order",
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
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkoutUrl)}`;

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

      const errMsg = responseData.errors?.[0]?.detail || csData.errors?.[0]?.detail || "Failed to create PayMongo payment.";
      return res.status(400).json({ message: errMsg, errors: responseData.errors || csData.errors });
    }

    const attr = responseData.data?.attributes || {};
    const sourceId = responseData.data?.id;
    const checkoutUrl = attr.redirect?.checkout_url || "";
    const status = attr.status || "pending";

    // Dynamic QR Generator URL for QRPh / GCash display
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkoutUrl || sourceId)}`;

    await logAuditFromReq(
      req,
      "PayMongo Source Created",
      "Payments",
      `Created PayMongo ${sourceType.toUpperCase()} source ${sourceId} for ₱${amount}`,
    );

    return res.json({
      success: true,
      sourceId,
      amount: Number(amount),
      type: sourceType,
      checkoutUrl,
      qrCodeUrl,
      status,
    });
  } catch (err) {
    console.error("PayMongo createSource error:", err);
    return res.status(500).json({ message: err.message || "PayMongo payment creation failed." });
  }
}

/**
 * GET /api/payments/paymongo/status/:sourceId
 * Check live status of a PayMongo source
 */
export async function getSourceStatus(req, res) {
  try {
    const { sourceId } = req.params;
    const secretKey = await getPayMongoSecretKey();
    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch(`https://api.paymongo.com/v1/sources/${sourceId}`, {
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
    const status = attr.status || "pending";

    return res.json({
      sourceId,
      status, // 'pending', 'chargeable', 'paid', 'cancelled'
      amount: attr.amount ? attr.amount / 100 : 0,
      isPaid: status === "chargeable" || status === "paid",
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
