const { promisify } = require("util");
const { Storage } = require("@google-cloud/storage");
const exec = promisify(require("child_process").exec);
const storage = new Storage();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log("Listening on port", port);
});

app.post("/", async (req, res) => {
	try {
		const file = decodeBase64Json(req.body.message.data);
		await downloadFile(file.bucket, file.name);
		const docxFileName = await convertFile(file.name);
		await uploadFile(process.env.DOCX_BUCKET, docxFileName);
		await deleteFile(file.bucket, file.name);
	} catch (ex) {
		console.log(`Error: ${ex}`);
	}
	res.set("Content-Type", "text/plain");
	res.send("\n\nOK\n\n");
});

function decodeBase64Json(data) {
	return JSON.parse(Buffer.from(data, "base64").toString());
}

async function downloadFile(bucketName, fileName) {
	const options = { destination: `/tmp/${fileName}` };
	await storage.bucket(bucketName).file(fileName).download(options);
}



async function convertFile(fileName) {
	const cmd =
		"lowriter --invisible --convert-to doc --outdir /tmp " +
		`"/tmp/${fileName}"`;
	console.log(cmd);
	const { stdout, stderr } = await exec(cmd);
	if (stderr) {
		throw stderr;
	}
	console.log(stdout);
	docxFileName = fileName.replace(/\.\w+$/, ".docx");
	return docxFileName;
}

async function deleteFile(bucketName, fileName) {
	await storage.bucket(bucketName).file(fileName).delete();
}

async function uploadFile(bucketName, fileName) {
	await storage.bucket(bucketName).upload(`/tmp/${fileName}`);
}
