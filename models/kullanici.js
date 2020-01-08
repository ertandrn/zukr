var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");


var kullaniciSema = new mongoose.Schema(
    {
        /*
        id: mongoose.Schema.Types.ObjectId,
        isim: { type: String, required: true },                             
        soyisim: { type: String, required: true },                          
        kullanici_adi: { type: String, required: true },                    
        e_posta: String, //{ type: String, required: true },                            
        sifre: String  //{ type: String, required: true }                            
        dogum_tarihi: { type: Number, required: true },                        
        cinsiyet: { type: String, required: true },                         
        meslek: { type: String, required: true }                            
        */

        /*
       id: mongoose.Schema.Types.ObjectId,
       isim: { type: String, required: true },
       //isim: String,
       //soyisim: String,
       //kullanici_adi: String,
       username: String,
       password: String,
       //dogumYili: Number,
       //cinsiyet: String,
       //meslek: String
        */

        /*
        id: mongoose.Schema.Types.ObjectId,
        isim: { type: String, required: true },                             
        soyisim: { type: String, required: true },                          
        kullanici_adi: { type: String, required: true },                    
        username: String, //{ type: String, required: true },                            
        password: String,  //{ type: String, required: true }                            
        dogum_tarihi: { type: Number, required: true },                        
        cinsiyet: { type: String, required: true },                         
        meslek: { type: String, required: true },
        */

       isim: String,                             
       soyisim: String,                          
       kullanici_adi: String,                    
       username: String, //{ type: String, required: true },                            
       password: String,  //{ type: String, required: true }                            
       dogum_tarihi: Number,                        
       cinsiyet: String,                         
       meslek: String,
       //key: String,
       secret: String,

        /*
        isim: String,                             
        soyisim: String,                          
        kullanici_adi: String,                    
        username: String, //{ type: String, required: true },                            
        password: String,  //{ type: String, required: true }                            
        dogum_tarihi: Number,                        
        cinsiyet: String,                         
        meslek: String,

        facebook: {id: String, email: String, name: String}
        */
    }
);

kullaniciSema.plugin(passportLocalMongoose);

module.exports = mongoose.model("kullanici", kullaniciSema);