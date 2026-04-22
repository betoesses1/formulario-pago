const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { amount, description, orderId, token, deviceSessionId } = JSON.parse(event.body);

  const OPENPAY_MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID;
  const OPENPAY_PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY;
  const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

  // 1. Crear cargo en Openpay
  const chargeData = JSON.stringify({
    source_id: token,
    method: 'card',
    amount: parseFloat(amount),
    currency: 'MXN',
    description: description || 'Compra en Tiendas VM',
    device_session_id: deviceSessionId,
    use_3d_secure: true,
    redirect_url: `https://www.tiendasvm.com/orders/${orderId}`
  });

  const openpayResult = await new Promise((resolve, reject) => {
    const auth = Buffer.from(`${OPENPAY_PRIVATE_KEY}:`).toString('base64');
    const req = https.request({
      hostname: 'api.openpay.mx',
      path: `/v1/${OPENPAY_MERCHANT_ID}/charges`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(chargeData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(chargeData);
    req.end();
  });

  // 2. Si el cargo fue exitoso, marcar pedido como pagado en Shopify
  if (openpayResult.status === 201 && openpayResult.body.status === 'completed') {
    if (orderId) {
      const shopifyData = JSON.stringify({
        transaction: {
          kind: 'capture',
          status: 'success',
          amount: amount,
          gateway: 'Openpay'
        }
      });

      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: `${SHOPIFY_STORE}.myshopify.com`,
          path: `/admin/api/2026-04/orders/${orderId}/transactions.json`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_API_KEY,
            'Content-Length': Buffer.byteLength(shopifyData)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(shopifyData);
        req.end();
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, charge: openpayResult.body })
    };
  }

  // 3. Si el cargo falló
  return {
    statusCode: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: openpayResult.body })
  };
};
