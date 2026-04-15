import express from "express";
import axios from "axios";

const app = express();

const merchantId = "mcu1a7seu2rgu8lpnwes";
const privateKey = process.env.OPENPAY_PRIVATE_KEY;
const port = process.env.PORT || 3000;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/pagar", async (_req, res) => {
  try {
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
        }
      }
    );

    const openpayUrl = response.data?.payment_method?.url;

    if (!openpayUrl) {
      return res.status(500).send("No se pudo obtener la URL de pago.");
    }

    return res.redirect(openpayUrl);
  } catch (error) {
    const msg = error?.response?.data?.description || "Error al crear el pago.";
    return res.status(500).send(msg);
  }
});

app.listen(port, () => {
  console.log(`Servidor activo en puerto ${port}`);
});
