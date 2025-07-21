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

      const messageType = message?.type;
      let content = null;
      switch (messageType) {
        case 'text':
          content = message?.text?.body;
          break;
        case 'image':
          content = {
            id: message?.image?.id,
            mimeType: message?.image?.mime_type,
            caption: message?.image?.caption,
            url: message?.image?.url
          };
          break;
        case 'video':
          content = {
            id: message?.video?.id,
            mimeType: message?.video?.mime_type,
            caption: message?.video?.caption,
            url: message?.video?.url
          };
          break;
        case 'document':
          content = {
            id: message?.document?.id,
            mimeType: message?.document?.mime_type,
            filename: message?.document?.filename,
            url: message?.document?.url
          };
          break;
        case 'audio':
          content = {
            id: message?.audio?.id,
            mimeType: message?.audio?.mime_type,
            url: message?.audio?.url
          };
          break;
        default:
          content = null;
      }

      // Log all extracted variables
      console.log('Extracted userWaId:', userWaId);
      console.log('Extracted contact:', contact);
      console.log('Extracted phoneNumber:', phoneNumber);
      console.log('Extracted messageType:', messageType);
      console.log('Extracted content:', content);

      // Compose message object to send via socket
      const payload = {
        from: userWaId,
        name: contact?.profile?.name || 'Unknown',
        type: messageType,
        content,
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


