export const handler = async (event) => {
    const { task } = event.queryStringParameters || {};
    
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

        default:
            return { 
                statusCode: 400, 
                body: "Please specify a valid task (?task=benchmarks, finalize, reminders, or report)" 
            };
    }
};