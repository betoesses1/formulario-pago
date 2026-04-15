import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/debug-env", (_req, res) => {
  const merchantId = (process.env.OPENPAY_MERCHANT_ID || "").trim();
  const privateKey = (process.env.OPENPAY_PRIVATE_KEY || "").trim();

  res.json({
    merchantIdMasked: merchantId ? `${merchantId.slice(0, 4)}...${merchantId.slice(-4)}` : "VACIO",
    merchantIdLength: merchantId.length,
    privateKeyMasked: privateKey ? `${privateKey.slice(0, 3)}...${privateKey.slice(-4)}` : "VACIO",
    privateKeyLength: privateKey.length
  });
});

app.get("/pagar", async (_req, res) => {
  try {
    const merchantId = (process.env.OPENPAY_MERCHANT_ID || "").trim();
    const privateKey = (process.env.OPENPAY_PRIVATE_KEY || "").trim();

    if (!merchantId || !privateKey) {
      return res.status(500).send("Faltan variables de entorno de Openpay.");
    }

    const auth = Buffer.from(`${privateKey}:`).toString("base64");

    const payload = {
      method: "card",
      amount: 100.00,
      description: "Pago de pedido VM Tecnología",
      customer: {
        name: "Cliente",
        last_name: "Prueba",
        phone_number: "5511111111",
        email: "cliente@correo.com"
      },
      confirm: false,
      send_email: false,
      redirect_url: "https://www.tiendasvm.com.mx/inicio/confirmacion"
    };

    const response = await axios.post(
      `https://sandbox-api.openpay.co/v1/${merchantId}/charges`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`
        },
        timeout: 20000
      }
    );

    const openpayUrl = response.data?.payment_method?.url;

    if (!openpayUrl) {
      return res.status(500).send("No se pudo obtener la URL de pago.");
    }

    return res.redirect(openpayUrl);
  } catch (error) {
    const msg =
      error?.response?.data?.description ||
      error?.message ||
      "Error al crear el pago en Openpay.";
    return res.status(500).send(msg);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor activo en puerto ${port}`);
});
