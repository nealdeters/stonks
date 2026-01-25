export const handler = async (event) => {
    const { task, secret } = event.queryStringParameters || {};
    
    // Security Check: Ensure only authorized requests can trigger these tasks
    if (secret !== process.env.APP_SECRET) {
        return { statusCode: 401, body: "Unauthorized" };
    }

    switch (task) {
        case 'reminders':
            const { sendReminder } = await import('../lib/reminders.js');
            return await sendReminder(event);
            
        case 'report':
            const { sendReport } = await import('../lib/reports.js');
            return await sendReport(event);

        case 'benchmarks':
            const { updateBenchmarks } = await import('../lib/benchmarks.js');
            return await updateBenchmarks(event);

        case 'finalize':
            const { finalizeContest } = await import('../lib/contest.js');
            return await finalizeContest(event);

        case 'sync-stock':
            const { syncStockData } = await import('../lib/stock-data.js');
            return await syncStockData(event);

        case 'sync-news':
            const { syncNews } = await import('../lib/news.js');
            return await syncNews(event);

        default:
            return { 
                statusCode: 400, 
                body: "Please specify a valid task (?task=benchmarks, finalize, reminders, or report)" 
            };
    }
};