import * as express from "express";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/:static(dist|node_modules)/:name(*)", (req, res) => {
    res.sendFile(`${process.env.ROOT}/${req.params.static}/${req.params.name}`);
});

app.get("/static/:file(*)", (req, res) => {
    res.sendFile(`${process.env.ROOT}/contrib/tarballs/libcloudstorage-master/bin/cloudbrowser/resources/${req.params.file}`);
});

app.get("/:cloud/login", (req, res) => {
    res.sendFile(`${process.env.ROOT}/contrib/tarballs/libcloudstorage-master/bin/cloudbrowser/resources/${req.params.cloud}_login.html`);
});

app.get("/*", (_, res) => {
    res.sendFile(`${process.env.ROOT}/index.html`);
});

app.listen(12345, () => {
    console.log('Listening on port 12345!');
});