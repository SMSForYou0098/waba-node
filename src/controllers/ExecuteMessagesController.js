import axios from 'axios';

// Helper to split array into chunks
function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}


export const executeMessages = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Missing request body' });
        }
        console.log('req.io',req.io)
        const { numbers, campaign_id, messagesApi, waToken, messagePayload } = req.body;
        if (!Array.isArray(numbers) || !messagesApi || !waToken || !messagePayload) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const total = numbers.length;
        res.json({ status: true, message: 'Processing started' });

        setImmediate(async () => {
            const io = req.io; // grab socket.io instance
            const sendChunks = chunkArray(numbers, 20);
            let resultArray = [];

            let sentCount = 0;

            for (let chunkIndex = 0; chunkIndex < sendChunks.length; chunkIndex++) {
                const chunk = sendChunks[chunkIndex];

                const chunkResults = await Promise.allSettled(
                    chunk.map(async (number) => {
                        const replaceNumber = (obj) => {
                            for (const key in obj) {
                                if (typeof obj[key] === 'string') {
                                    obj[key] = obj[key].replace(/#number/g, number);
                                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                    replaceNumber(obj[key]);
                                }
                            }
                        };
                        const payloadCopy = JSON.parse(JSON.stringify(messagePayload));
                        replaceNumber(payloadCopy);

                        try {
                            const response = await axios.post(messagesApi, payloadCopy, {
                                headers: {
                                    Authorization: `Bearer ${waToken}`,
                                    'Content-Type': 'application/json',
                                },
                            });

                            const msg = response.data?.messages?.[0];
                            if (msg && (msg.message_status === 'accepted' || msg.id)) {
                                resultArray.push({
                                    campaign_id,
                                    message_id: msg.id,
                                    mobile_number: number,
                                    status: 'sent',
                                });
                                sentCount++;

                                // 🔥 Emit message progress to frontend
                                io.to(campaign_id).emit("messageProgress", {
                                    total,
                                    sent: sentCount,
                                    percent: Math.round((sentCount / total) * 100),
                                });
                            }

                        } catch (err) {
                            resultArray.push({
                                campaign_id,
                                message_id: null,
                                mobile_number: number,
                                status: 'error',
                                error: err.response?.data?.error || err.message,
                            });
                        }
                    })
                );

                await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            // 🔁 Send report progress in chunks
            const reportChunks = chunkArray(resultArray, 10);
            for (let i = 0; i < reportChunks.length; i++) {
                try {
                    await axios.post('https://waba.smsforyou.biz/api/campaign-report/bulk-update', {
                        reports: reportChunks[i],
                    });

                    // 🔥 Emit report progress
                    io.to(campaign_id).emit("reportProgress", {
                        total: reportChunks.length,
                        done: i + 1,
                        percent: Math.round(((i + 1) / reportChunks.length) * 100),
                    });

                } catch (err) {
                    console.error('Bulk report update error:', err.response?.data || err.message);
                }
            }

            console.log(`Finished processing campaign ${campaign_id}`);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

 