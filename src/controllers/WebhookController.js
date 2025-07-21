import { ErrorExtractor } from "../../utils/ErrorHandler.js";

export const webHook = async (req, res) => {
  try {
    console.log('Received webhook:', req.body);

    // Acknowledge webhook (even before processing for some providers)
    res.status(200).send("Received");

    // Optionally process webhook data asynchronously here
    // await processWebhookData(req.body);

  } catch (error) {
    const errMsg = ErrorExtractor(error);
    console.error('Webhook error:', errMsg);
    res.status(500).json({ error: errMsg });
  }
};

