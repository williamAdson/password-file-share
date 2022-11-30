// necessary modules needed
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const multer = require('multer');
const hbs = require('express-handlebars')
.create({ defaultLayout: 'main', extname: 'hbs'});
const express = require('express');
const app = express();
const File = require('./models/FileModel');

// connect to database
mongoose.connect(process.env.DATABASE_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}, ()=>{
    console.log('database connection successful!');
}, (err)=>{
    console.log('database connection failed!\n'+err);
});

// config view engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// form data middleware
app.use(express.urlencoded({ extended: true }));

// config file uploads
const upload = multer({dest: 'uploads'})
.single('file');            

// project routes
app.get('/', (req, res)=>{
    res.render('home');
});
app.post('/upload',upload, async (req, res)=>{
    let fileData = new File();
    if(req.file){
        const filePath = req.file.path.replace(/\\/g, "/");
        fileData.path = filePath;
        fileData.originalName = req.file.originalname;
    }
    if(req.body.password != ""){
        fileData.password = await bcrypt.hash(req.body.password, 10);
    }
    await fileData.save();
    res.status(302).render('home', { fileLink: `${req.headers.origin}/file/${fileData._id}`});
});

const fileDownloads = async (req, res)=>{
    const dataID = req.params.id;
    const file = await File.findById(dataID);

    // check file has password
    if(file.password != null){
        if(req.body.password == null){
            res.render('password')
            return
        }
        // check password is valid
        if(!(await bcrypt.compare(req.body.password, file.password))){
            res.render('password', { error: true});
            return
        }
    }
    
    file.downloadCount++;
    await file.save();
    console.log(file.downloadCount);

    res.download(file.path, file.originalName);
}
app.route('/file/:id').get(fileDownloads).post(fileDownloads);

// project listening on
app.listen(process.env.PORT, ()=>{
    console.log(`file share manager running on http://localhost:${process.env.PORT}`)
});