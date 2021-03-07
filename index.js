const express = require("express");
const app = express();
const bodyParser = require("body-parser")

app.use(bodyParser.json())
const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("App Is Listening on Port: ",port);
})

app.post("/", async(req,res) => {
    console.log("Post OK")
    try {
        const file = B64Decoder(req.body.message.data);
        console.log(`File: ${JSON.stringify(file)}`);
    } catch(ex) {
        console.log(ex);
    }
    res.set("Content-Type", "text/plain");
    res.send("\n\nPost OK\n\n")
})

const B64Decoder = (data) => {
    return JSON.parse(Buffer.from(data, "base64").toString());
}
