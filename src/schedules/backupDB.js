const { spawn, execSync } = require("node:child_process");
const fs = require("fs");
const emailService = require("../services/email.service");

function backupDB() {
  const outputFile = `./backup/${process.env.DB_NAME}-${
    new Date().toISOString().split("T")[0]
  }.sql`;

  const outputStream = fs.createWriteStream(outputFile);

  const mysqldumpPath = process.env.SQL_DUMP;

  const mysqldump = spawn(mysqldumpPath, [
    `-u${process.env.DB_USER}`,
    `-p${process.env.DB_PASSWORD}`,
    `-P${process.env.DB_PORT}`,
    process.env.DB_NAME,
  ]);

  mysqldump.stdout.pipe(outputStream);

  mysqldump.on("error", (error) => {
    console.log(error);
    outputStream.end();
    console.error(`mysqldump error: ${error.message}`);
  });

  mysqldump.on("close", async (code) => {
    outputStream.end();
    console.log(`child process exited with code ${code}`);

    const rclonePath = process.env.R_CLONE;

    if (code === 0) {
      try {
        console.log(`✅ Backup successfully! File: ${outputFile}`);
        const stats = fs.statSync(outputFile);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📊 File size: ${fileSizeMB} MB`);
        execSync(`"${rclonePath}" sync ./backup f8BlogDay8Drive:Rclone`, { stdio: 'inherit' });
        console.log(`Upload GDrive successfully!`);
  
        await emailService.sendBackupReport(
          process.env.BACKUP_EMAIL,
          "Backup thanh cong",
          outputFile,
        );
        console.log(`Send email report successfully!`);
      } catch (err) {
        console.error(`❌ Cannot read file info: ${err.message}`);
      }
    } else {
      console.error(`❌ Backup failed with exit code: ${code}`);
      if (signal) console.error(`Signal: ${signal}`);

      if (fs.existsSync(outputFile)) {
        try {
          fs.unlinkSync(outputFile);
          console.log(`🗑️ Removed failed file: ${outputFile}`);
        } catch (err) {
          console.error(`⚠️ Cannot remove failed file: ${err.message}`);
        }
      }
    }
  });
}

module.exports = backupDB;
