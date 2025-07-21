import { ErrorExtractor } from "../../utils/ErrorHandler.js";

export const webHook = async (req, res) => {
    try {
        // Acknowledge first to avoid retries
        res.status(200).send("Received");

        const body = req.body;

        if (body?.entry?.length > 0 && body.entry[0]?.changes?.length > 0) {
            const change = body.entry[0].changes[0];
            const value = change.value;

            if (value?.messages) {
                // Incoming message
                const message = value.messages[0];
                const contact = value.contacts?.[0];
                handleIncomingMessage({ message, contact, value, req });
            } else if (value?.statuses) {
                // Outgoing message status
                const status = value.statuses[0];
                // You may want to extract contact or other info if available
                handleOutgoingMessage({ message: status, contact: null, value, req });
            } else {
                console.log("⚠️ No valid message or status found in webhook");
            }
        } else {
            console.log("⚠️ No valid entry/changes found in webhook");
        }
    } catch (error) {
        const errMsg = ErrorExtractor(error);
        console.error("Webhook processing error:", errMsg);
    }
};

// For outgoing, you will call handleOutgoingMessage with the appropriate object when needed
// Function to handle incoming messages
function handleIncomingMessage({ message, contact, value, req }) {
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
}

// Function to handle outgoing messages (to be implemented as needed)
function handleOutgoingMessage({ message, contact, value, req }) {
    // Log the status of the outgoing message
    // message here is the status object from value.statuses[0]
    if (message && message.status) {
        console.log('Outgoing message status:', message.status);
    } else {
        console.log('No status found in outgoing message object:', message);
    }
}


