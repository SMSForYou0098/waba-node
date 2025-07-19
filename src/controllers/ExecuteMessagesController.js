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
        const { numbers, campaign_id, messagesApi, waToken, messagePayload } = req.body;
        if (!Array.isArray(numbers) || !messagesApi || !waToken || !messagePayload) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        res.json({ status: true, message: 'Processing started' });

        setImmediate(async () => {
            console.log(`Started processing campaign ${campaign_id} with ${numbers.length} numbers`);
            const batches = chunkArray(numbers, 10);
            let reportArray = [];
            let totalSent = 0;
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                console.log(`Processing batch ${batchIndex + 1}/${batches.length} (numbers: ${batch.join(', ')})`);
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
                            const msg = response.data?.messages?.[0];
                            if (msg && (msg.message_status === 'accepted' || msg.id)) {
                                reportArray.push({
                                    campaign_id,
                                    message_id: msg.id,
                                    mobile_number: number,
                                    status: 'sent',
                                });
                                totalSent++;
                                console.log(`Message sent to ${number} (total sent: ${totalSent})`);
                            }
                            return { number, status: 'success', data: response.data };
                        } catch (err) {
                            console.error(`Error sending message to ${number}:`, err.response?.data || err.message);
                            return { number, status: 'error', error: err.response?.data.error || err.err.response?.data.message };
                        }
                    })
                );
                batchResults.forEach((result, idx) => {
                    if (result.status === 'rejected' || (result.value && result.value.status === 'error')) {
                        console.error('Batch error for number', batch[idx], result.reason || result.value?.error);
                    }
                });
                console.log(`Finished batch ${batchIndex + 1}/${batches.length}`);
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
            // After all batches, send bulk report update
            if (reportArray.length > 0) {
                try {
                    console.log(`Sending bulk report update for campaign ${campaign_id} with ${reportArray.length} reports`);
                    const bulkPayload = { reports: reportArray };
                    const bulkResponse = await axios.post('https://waba.smsforyou.biz/api/campaign-report/bulk-update', bulkPayload);
                    console.log('Bulk report update response:', bulkResponse.data);
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
