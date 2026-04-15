import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN,
  methods: ["GET", "POST"]
}));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/crear-cargo", async (req, res) => {
  try {
    const { token_id, device_session_id, amount, description } = req.body;

    if (!token_id || !device_session_id || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos obligatorios."
      });
    }

    const merchantId = process.env.OPENPAY_MERCHANT_ID;
    const privateKey = process.env.OPENPAY_PRIVATE_KEY;

    if (!merchantId || !privateKey) {
      return res.status(500).json({
        success: false,
        message: "Faltan variables de entorno de Openpay."
      });
    }

    const auth = Buffer.from(`${privateKey}:`).toString("base64");

    const payload = {
      method: "card",
      source_id: token_id,
      amount: Number(amount),
      currency: "MXN",
      description,
      device_session_id
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

    return res.json({
      success: true,
      charge_id: response.data?.id,
      status: response.data?.status,
      authorization: response.data?.authorization
    });
  } catch (error) {
    const op = error?.response?.data || {};
    return res.status(error?.response?.status || 500).json({
      success: false,
      error_code: op?.error_code || "default",
      message: op?.description || "Error al crear el cargo en Openpay."
    });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor listo en puerto ${port}`);
});
