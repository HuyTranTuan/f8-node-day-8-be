require("dotenv").config();

const readline = require("readline");
const fs = require("node:fs");
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000"
);

async function getRefreshToken() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.file"],
        prompt: "consent",
    });

    console.log("🔗 Truy cập URL để xác thực:");
    console.log(authUrl);
    console.log("\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question("📋 Paste authorization code từ URL: ", async (code) => {
            rl.close();
            const { tokens } = await oauth2Client.getToken(code);
            console.log("\nRefresh Token:");
            console.log(tokens.refresh_token);
            console.log("\nLưu vào .env:");
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            resolve(tokens);
        });
    });
}

// getRefreshToken().catch(console.error);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
});

async function main() {
    const fileName = `${process.env.DB_NAME}-${new Date().toISOString().split("T")[0]}.sql`;
    const filePath = `./backup/${fileName}`;

    try {
        const res = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [`${process.env.GOOGLE_CLIENT_FOLDER_ID}`], // Folder ID
            },
            media: {
                mimeType: "text/plain",
                body: fs.createReadStream(filePath),
            },
        });
        console.log("Upload success:", res.data);
    } catch (error) {
        console.error("Upload failed:", error.message);
    }
}

main().catch(console.error);
