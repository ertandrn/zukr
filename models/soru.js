var mongoose = require("mongoose");
//var passportLocalMongoose = require("passport-local-mongoose");

var soruSema = new mongoose.Schema(
    {
        baslik: String,
        icerik: String,
        etiket: String,
        olusturan:
        {
            id: 
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "kullanici"
            },
            username: String
        },
        cevaplar:
        [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "cevap"
        }],
        like: Number,
        dislike: Number
    }
);

//kullaniciSema.plugin(passportLocalMongoose);

module.exports = mongoose.model("soru", soruSema);