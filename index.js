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
        console.log(`File Name: ${file.name}`)
		await downloadFile(file.bucket, file.name);
		const docFileName = await convertFile(file.name);
		await uploadFile(process.env.DOCX_BUCKET, docFileName);
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
    console.log("")
    console.log("")
    console.log("")
    console.log("Destination", options)
    console.log("")
    console.log("")
    console.log("")
	await storage.bucket(bucketName).file(fileName).download(options);
}

async function convertFile(fileName) {
	//! please Notice that when trying to convert file the file cannot be found!!!
	//? Destination { destination: '/tmp/Gal-Flying-Ticket.pdf' }
	//? lowriter --invisible --convert-to docx "Gal-Flying-Ticket.pdf"--outdir /tmp "/tmp/Gal-Flying-Ticket.pdf"
	//? Error: Error: source file could not be loaded
	//? Error: no export filter for /usr/src/app/Gal-Flying-Ticket.docx found, aborting.
	const cmd =
		"lowriter --invisible --convert-to docx:writer_pdf_export " + `"${fileName}"` + "--outdir /tmp " +
		`"/tmp/${fileName}"`;
	console.log(cmd);
	const { stdout, stderr } = await exec(cmd);
	if (stderr) {
		throw stderr;
	}
	console.log(stdout);
	docFileName = fileName.replace(/\.\w+$/, ".docx");
	return docFileName;
}

async function deleteFile(bucketName, fileName) {
	await storage.bucket(bucketName).file(fileName).delete();
}

async function uploadFile(bucketName, fileName) {
	await storage.bucket(bucketName).upload(`/tmp/${fileName}`);
}









// gcloud builds submit \
//   --tag gcr.io/$GOOGLE_CLOUD_PROJECT/file2docx-converter

// gcloud beta run deploy file2docx-converter \
//   --image gcr.io/$GOOGLE_CLOUD_PROJECT/file2docx-converter \
//   --platform managed \
//   --region us-central1 \
//   --memory=2Gi \
//   --no-allow-unauthenticated \
//   --set-env-vars DOCX_BUCKET=$GOOGLE_CLOUD_PROJECT-docx-done
