import axios from 'axios';

// Helper to split array into chunks
function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// Function to update campaign report
async function updateCampaignReport({ message_id, report_id, mobile_number, campaign_id }) {
    try {
        const response = await axios.post('https://waba.smsforyou.biz/api/campaign-report/update', {
            message_id,
            report_id,
            //The mobile number field must be a string
            mobile_number: String(mobile_number),
            status: 'sent',
            campaign_id, // Include campaign_id in the request
        });
        return { status: 'success', data: response.data };
    } catch (error) {
        return { status: 'error', error: error.response.data };
    }
}

export const executeMessages = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Missing request body' });
        }
        // Adjusted keys as per actual request
        const { numbers, campaign_id, messagesApi, waToken, messagePayload } = req.body;
        if (!Array.isArray(numbers) || !messagesApi || !waToken || !messagePayload) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Respond instantly
        res.json({ status: true, message: 'Processing started' });

        // Run message sending in background - 20 per second (Meta API limit)
        setImmediate(async () => {
            const batches = chunkArray(numbers, 20);
            for (const batch of batches) {
                const batchResults = await Promise.allSettled(
                    batch.map(async (number) => {
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
                            let reportUpdateResult = null;
                            const msg = response.data?.messages?.[0];
                            // console.log(`Message sent to ${number}`);
                            if (msg && (msg.message_status === 'accepted' || msg.id)) {
                                reportUpdateResult = await updateCampaignReport({
                                    message_id: msg.id,
                                    mobile_number: number,
                                    campaign_id,
                                });
                                // console.log(`Report updated for ${number} : ${JSON.stringify(reportUpdateResult)}`);
                            }
                            return { number, status: 'success', data: response.data, reportUpdateResult };
                        } catch (err) {
                            // console.error('Meta API error for number', number, err.response?.data || err.message);
                            return { number, status: 'error', error: err.response?.data.error || err.err.response?.data.message };
                        }
                    })
                );
                // Log batch results for debugging
                batchResults.forEach((result, idx) => {
                    if (result.status === 'rejected' || (result.value && result.value.status === 'error')) {
                        console.error('Batch error for number', batch[idx], result.reason || result.value?.error);
                    }
                });
                // Wait 1 second before next batch to respect Meta API throughput
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
