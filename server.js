const express = require('express');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = 3000;

// Cấu hình thư mục chứa file F1.txt đến F100.txt
const DATA_DIR = path.join(__dirname, 'data');

app.use(express.static('public'));

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));


app.get('/search', async (req, res) => {

    const keyword = req.query.keyword;
    if (!keyword) return res.status(400).send('Thiếu từ khóa');

    // Thiết lập header cho Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    let totalCount = 0;
    let filesProcessed = 0;

    // Gửi dữ liệu cập nhật về client
    const sendUpdate = (message) => {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
    };

    // Hàm đọc từng file
    const processFile = (filePath) => {
        return new Promise((resolve) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            rl.on('line', (line) => {
                // Tách các từ phân cách bởi dấu phẩy
                const words = line.split(',');
                for (const word of words) {
                    if (word.trim() === keyword) {
                        totalCount++;
                    }
                }
            });

            rl.on('close', () => {
                filesProcessed++;
                resolve();
            });
        });
    };

    // Luồng xử lý chính (Cập nhật sau mỗi 5 giây)
    const intervalId = setInterval(() => {
        sendUpdate({ status: 'running', count: totalCount, filesProcessed });
    }, 5000);

    try {
        for (let i = 1; i <= 100; i++) {
            const filePath = path.join(DATA_DIR, `f${i}.txt`);
            if (fs.existsSync(filePath)) {
                // await snooze(2000);
                // console.log('dang su ly file ' + i);
                await processFile(filePath);
            }
        }

        // Hoàn tất quét dữ liệu
        clearInterval(intervalId);
        sendUpdate({ status: 'done', count: totalCount, filesProcessed });
        res.end();
    } catch (error) {
        clearInterval(intervalId);
        sendUpdate({ status: 'error', message: 'Lỗi hệ thống trong quá trình đọc file' });
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});