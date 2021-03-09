require("dotenv").config();
const request = require("request");
const https = require("https");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
let formData = {};

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

app.use(bodyParser.json());

const port = process.env.port || 8080;

app.listen(port, () => {
	console.log("App is Listening on Port:", port);
});

app.post("/", async (req, res) => {
	try {
		const file = decodeBase64Json(req.body.message.data);
		let fileName = file.name;
		await downloadFile(file.bucket, fileName);
		const docxfileName = await convertFile(fileName);
		await uploadFile(process.env.DOCX_BUCKET, docxfileName);
	} catch (ex) {
		console.log(`Error: ${ex}`);
	}
	res.set("Content-Type", "text/plain");
	res.send("\n\nOK ==== Done\n\n");
});

const decodeBase64Json = (data) => {
	return JSON.parse(Buffer.from(data, "base64").toString());
};

const downloadFile = async (bucketName, fileName) => {
	console.log(`File Name1: ${fileName}`);
	const options = { destination: `/tmp/${fileName}` };
	await storage.bucket(bucketName).file(fileName).download(options);
};

convertFile = async (fileName) => {
	console.log(`File Name2: ${fileName}`);
	// Adding authentication headers
	const headers = {
		"X-ApplicationID": process.env.AppID,
		"X-SecretKey": process.env.AppKey,
	};

	try {
		let conversionRequest = request.post(
			{
				url: "https://api2.docconversionapi.com/jobs/create",
				formData: formData,
				rejectUnauthorized: false,
				headers: headers,
				encoding: "binary",
			},
			(err, response) => {
				let responseParsed = null;

				if (response.statusCode == 200) {
					// Parsing response JSON object and getting fileDownloadUrl value
					responseParsed = JSON.parse(response.body);
					console.log("URL To Download: ", responseParsed.fileDownloadURL);

					// Downloading the file and writing it to the local folder
					const resultFile = fs.createWriteStream(`/tmp/${fileName}`);
					https.get(responseParsed.fileDownloadURL, (res) => {
						res.pipe(resultFile);
					});
					console.log("Result File");
					console.log(resultFile);
				}

				if (err) {
					throw err;
				}
			}
		);
		// Adding all parameters to multipart form
		let form = conversionRequest.form();
		form.append("inputFile", fs.readFileSync(`/tmp/${fileName}`));
		form.append("conversionParameters", "{}");
		form.append("async", "false");
		form.append("outputFormat", "docx");
	} catch (ex) {
		console.log(`Error: ${ex}`);
	}
};

uploadFile = async (bucketName, fileName) => {
	await storage
		.bucket(bucketName)
		.upload(`/tmp/${fileName}`)
		.then(console.log("File Uploaded Successfuly"));
};

