import { ErrorExtractor } from "../../utils/ErrorHandler.js";

export const webHook = async (req, res) => {
  try {
    // Acknowledge first to avoid retries
    res.status(200).send("Received");

    const body = req.body;

    if (
      body?.entry?.length > 0 &&
      body.entry[0]?.changes?.length > 0 &&
      body.entry[0].changes[0]?.value?.messages
    ) {
      const change = body.entry[0].changes[0];
      const value = change.value;

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      const phoneNumber = value.metadata?.display_phone_number;
      const userWaId = message?.from;
      const messageText = message?.text?.body;
      const messageType = message?.type;

      // Compose message object to send via socket
      const payload = {
        from: userWaId,
        name: contact?.profile?.name || 'Unknown',
        text: messageText,
        type: messageType,
        to: phoneNumber,
        timestamp: message?.timestamp,
      };

      // 🔥 Emit message to frontend using userId as room
      const io = req.io;
      const userId = userWaId; // or map this to your internal user id if needed
      io.to(userId).emit("incomingMessage", payload);
      console.log("📩 Message emitted to socket room:", userId, payload);
    } else {
      console.log("⚠️ No valid message found in webhook");
    }
  } catch (error) {
    const errMsg = ErrorExtractor(error);
    console.error("Webhook processing error:", errMsg);
  }
};


