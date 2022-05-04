const express = require('express');
const fileUpload = require("express-fileupload");
const fs = require("fs");
const sql = require("sqlite3");
const app = express();
const port = 8080;

let db = new sql.Database("./db.sqlite3");
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS files (hash TEXT PRIMARY KEY, filename TEXT NOT NULL, mime TEXT NOT NULL)");
});

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }
}));

app.set("view engine", "ejs");

app.get('/upload', (req, res) => {
  res.render("upload");
});

app.get("/upload/:hash", (req, res) => {
  res.render("upload", {
    file_link: `/file/${req.params.hash}`
  });
});

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).redirect("/upload");
  
  file = req.files.uploaded;

  db.get("SELECT * FROM files WHERE hash = ?", [file.md5], (err, row) => {
    if (err)
      return res.status(500).redirect("/upload");
    
    if (!row) {
      db.run("INSERT INTO files(hash, filename, mime) VALUES (?, ?, ?)", [file.md5, file.name, file.mimetype], err => {
        if (err)
          return res.status(500).redirect("/upload");
        let upload_path = `${__dirname}/upload/${file.md5}`;
        file.mv(upload_path, err => {
          if (err)
            return res.status(500).redirect("/upload");
          
          return res.status(201).redirect(`/file/${file.md5}`);
        });
      });
    }
    else return res.redirect(`/upload/${file.md5}`);
  });
});

app.get("/file/:hash", (req, res) => {
  let hash = req.params.hash;
  if (!hash)
    return res.status(404).redirect("/upload");
  
  db.get("SELECT * FROM files WHERE hash = ?", [hash], (err, row) => {
    if (err)
      return res.status(500).redirect("/upload");

    if (!row)
      return res.status(404).redirect("/upload");

    res.setHeader("Content-Type", row.mime);
    res.setHeader("Content-Disposition", `inline; filename=${row.filename}`);
    res.writeHead(200);
    res.end(fs.readFileSync(`${__dirname}/upload/${hash}`));
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
