require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
var HOST = 'localhost';
var PORT = 3000;
let fs;

//HTTP server
const app = express();
var hsopts, hs;

//use ssl (https) by default
if (process.env.NOSSL || process.env.PRIVKEY_PATH == null || process.env.FULLCHAIN_PATH == null){
    hs = require('http').createServer(app);
} else {
    fs = require('fs');
    hsopts = {
        key: fs.readFileSync(process.env.PRIVKEY_PATH),
        cert: fs.readFileSync(process.env.FULLCHAIN_PATH)
    };
    hs = require('https').createServer(hsopts,app);
}
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, './static/index.html'));
});;
//use below line if add more endpoints
//app.use('/', require('./routes'));

if (process.argv.length > 2){
    HOST = process.argv[2];
}
if (process.argv.length > 3){
    PORT = process.argv[3];
}
hs.listen(PORT, HOST, (error) => {
    if (!error) {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    } else {
        console.log(error);
    }
});