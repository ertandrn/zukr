var mongoose = require("mongoose");
//var passportLocalMongoose = require("passport-local-mongoose");

var cevapSema = new mongoose.Schema(
    {
        cevap: String,
        olusturan:
        {
            id:
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "kullanici"
            },
            username: String
        },
        like: Number,
        dislike: Number
    }
);

//kullaniciSema.plugin(passportLocalMongoose);

module.exports = mongoose.model("cevap", cevapSema);