var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var passportLocal = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var flash = require('connect-flash');
var kullanici = require("./models/kullanici");
var methodOverride = require("method-override");

var soru = require("./models/soru");
var cevap = require("./models/cevap");

var facebook = require('passport-facebook');
var google = require('passport-google-oauth').OAuth2Strategy;
//var TotpStrategy = require('passport-totp').Strategy;

var speakeasy = require("speakeasy");
var QRCode = require("qrcode");

//Anahtar üret
//var secret = speakeasy.generateSecret();



mongoose.connect("mongodb://localhost/zukr");
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(express.static("public"));

//Session umuz olması lazım giriş yaptıktan sonra giriş yapılı olarak tutacak.
app.use(require("express-session")({
    secret: "Bu bir session express uygulamasıdır.",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportLocal(kullanici.authenticate()));

//passport.serializeUser(kullanici.serializeUser());
//passport.deserializeUser(kullanici.deserializeUser());

passport.serializeUser(function(kullanici, done) {
	console.log(kullanici);
	done(null, kullanici._id);
});

passport.deserializeUser(function(id, done) {
	kullanici.findById(id, function(err, kullanici) {
		done(err, kullanici);
	});
});

//Bütün Route'lar ile paylaşılan bilgiler
app.use(function(req, res, next){
    res.locals.currentUser=req.user;
    next();
});

/*
app.configure(function() {
    app.use(express.cookieParser('keyboard cat'));
    app.use(express.session({ cookie: { maxAge: 60000 }}));
    app.use(flash());
  });
*/

app.get("/", function(req, res){
    res.render("giris");
});

app.post("/", passport.authenticate("local", {
    //Kullanıcı giriş yapabilirse sisteme yapmadıysa girise gönder
    successRedirect:"/ikifa",
    failureRedirect:"/"
}) ,function(req, res){
});

//2FA
app.get("/ikifa", function(req, res){
    res.render("ikifa");
});



var durum = 0;
app.post("/ikifa", function(req, res){
    var userToken = req.body.secret;

    var base32secret = req.user.secret;
    //var base32secret = 'NNQXAMJTOI7HWWTLNF3WST2AEUZHWOJDGAUWY7KXNR2EQW3BKJTQ';

    var verified = speakeasy.totp.verify({ secret: base32secret,
        encoding: 'base32',
        token: userToken });

        if(verified)
        {
            durum = 1;
            //res.render("/sistem");
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("back");
        }
});



//2FA ve QR Code
app.get("/ikifaQrCode", function(req, res){
    res.render("ikifaQrCode");
});



var durum = 0;
app.post("/ikifaQrCode", function(req, res){
    var userToken = req.body.secret;

    var base32secret = req.user.secret;
    //var base32secret = 'NNQXAMJTOI7HWWTLNF3WST2AEUZHWOJDGAUWY7KXNR2EQW3BKJTQ';

    var verified = speakeasy.totp.verify({ secret: base32secret,
        encoding: 'base32',
        token: userToken });

        if(verified)
        {
            durum = 1;
            //res.render("/sistem");
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("back");
        }
});



app.get("/kaydol", girisYapmis, function(req, res){
    res.render("kaydol");
});

app.post("/kaydol", function(req, res){
    kullanici.register(new kullanici({
        isim: req.body.isim,
        soyisim: req.body.soyisim,
        kullanici_adi: req.body.kullanici_adi,
        dogum_tarihi: req.body.dogum_tarihi,
        cinsiyet: req.body.cinsiyet,
        meslek: req.body.meslek,
        //key: speakeasy.generateSecret().base32,
        secret: speakeasy.generateSecret().base32,
        username: req.body.username}), req.body.password, function(err, kullanici){
        if(err)
        {
            console.log(err);
            //passport.authenticate('local', { failureFlash: 'Invalid username or password.' });
            return res.render("giris");
        }
        passport.authenticate("local")(req, res, function(){
            //res.redirect("/sistem");
            //res.render("ikifa");
            res.redirect("/ikifaQrCode");
        });
    });

});

// /:id/profile
app.get("/guncelle/:id", kullaniciKontrol, function(req, res){
/*
    kullanici.findById(req.params.id, function(err, bulunanKullanici){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            //res.render("/guncelle"), {}
        }
       res.render("guncelle");
    });
*/
    res.render("guncelle");
});

//req.body.currentUser,
app.put("/guncelle/:id", kullaniciKontrol, function(req, res){
    kullanici.findByIdAndUpdate(req.params.id, req.body.currentUser, function(err, guncellenmisKullanici){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/guncelle/"+req.params.id);
        }
    });
});

app.delete("/guncelle/:id", kullaniciKontrol, function(req, res){
    kullanici.findByIdAndRemove(req.params.id, function(err){
        if(err){
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/");
        }
    });
});



//Facebook ile giriş
passport.use(new facebook({
    clientID: '281638285888929',
    clientSecret: '3b4eca6e1608558c9d67013adfbc2675',
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileFields: ['id','displayName','emails']
  },
  function(accessToken, refreshToken, profile, done) {

    console.log(profile);

    var me = new kullanici({
        isim:profile.displayName,
        username:profile.emails[0].value
    });

    //Kullanıcı yeni ise kaydet
    kullanici.findOne({username:me.username}, function(err, u) {
        if(!u) {
            durum = 1;
            me.save(function(err, me) {
                if(err) return done(err);
                done(null,me);
            });
        } else {
            durum = 1;
            console.log(u);
            done(null, u);
        }
    });
}
));

app.get('/auth/facebook', passport.authenticate('facebook', {scope:"email"}));
app.get('/auth/facebook/callback', passport.authenticate('facebook', 
{ successRedirect: '/sistem', failureRedirect: '/' }));





//Google ile giriş
passport.use(new google({
    clientID: '849778168344-nbu5m01evsrloa3170sht1onto72flg6.apps.googleusercontent.com',
    clientSecret: 'cNdddQC1M8k7SSPpaK3pJKBx',
    callbackURL: "http://localhost:3000/auth/google/callback"
    //profileFields: ['id','displayName','emails']
  },
  function(accessToken, refreshToken, profile, done) {

    console.log(profile);

    var me = new kullanici({
        isim:profile.displayName,
        username:profile.emails[0].value
    });

    //Kullanıcı yeni ise kaydet
    kullanici.findOne({username:me.username}, function(err, u) {
        if(!u) {
            durum = 1;
            me.save(function(err, me) {
                if(err) return done(err);
                done(null,me);
            });
        } else {
            durum = 1;
            console.log(u);
            done(null, u);
        }
    });
}
));

app.get('/auth/google', passport.authenticate('google', {scope:"email"}));
app.get('/auth/google/callback', passport.authenticate('google', 
{ successRedirect: '/sistem', failureRedirect: '/' }));







app.get("/sistem", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
            soru.find({}, function(err, soruDBB){
                if(err){
                    console.log(err);
                } else{
                    res.render("sistem", {sorular:soruDB, yuksekPuan:soruDBB});
                }
            }).sort({like: -1}).limit(10);
		}
    });
});






//Soruları etiketlere göre listele
app.get("/etiket/genel", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Genel" });
});
app.get("/etiket/yazilim", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Yazılım" });
});
app.get("/etiket/donanim", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Donanım" });
});
app.get("/etiket/kultur", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Kültür" });
});
app.get("/etiket/sanat", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Sanat" });
});
app.get("/etiket/eglence", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Eğlence" });
});
app.get("/etiket/bilim", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Bilim" });
});
app.get("/etiket/internet", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "İnternet" });
});
app.get("/etiket/oyun", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Oyun" });
});
app.get("/etiket/saglik", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Sağlık" });
});
//
app.get("/etiket/alisveris", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Alışveriş" });
});
app.get("/etiket/kariyer", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Kariyer" });
});
app.get("/etiket/sinema", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Sinema" });
});
app.get("/etiket/muzik", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Müzik" });
});
app.get("/etiket/kitap", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Kitap" });
});
app.get("/etiket/egitim", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Eğitim" });
});
app.get("/etiket/spor", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
        if(err){
            console.log(err);
        }
        else{
            res.render("etiket", {sorular:soruDB});
        }
    }).find({ etiket: "Spor" });
});










app.get("/bildirim", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
            res.render("bildirim", {sorular:soruDB});
		}
    });
});







/*
app.get("/ikifa/:id", girisYapmamis, function(req, res){

    res.render("ikifa");

});
*/



/*


passport.use(new TotpStrategy(
    function(kullanici, done) {

        var key = kullanici.key;
        if(!key) {
            return done(new Error('No key'));
        } else {
            return done(null, base32.decode(key), 30); //30 = valid key period
        }
    })
);


app.get('/totp-setup',
    isLoggedIn,
    ensureTotp,
    function(req, res) {
        var url = null;
        if(req.kullanici.key) {
            var qrData = sprintf('otpauth://totp/%s?secret=%s',
                                 req.kullanici.username, req.kullanici.key);
            url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" +
                   qrData;
        }

        res.render('totp-setup', {
            strings: strings,
            user: req.user,
            qrUrl: url
        });
    }
);

app.post('/totp-setup',
    isLoggedIn,
    ensureTotp,
    function(req, res) {
        if(req.body.totp) {
            req.session.method = 'totp';

            var secret = base32.encode(crypto.randomBytes(16));
            //Discard equal signs (part of base32,
            //not required by Google Authenticator)
            //Base32 encoding is required by Google Authenticator.
            //Other applications
            //may place other restrictions on the shared key format.
            secret = secret.toString().replace(/=/g, '');
            req.kullanici.key = secret;
        } else {
            req.session.method = 'plain';

            req.kullanici.key = null;
        }

        res.redirect('/totp-setup');
    }
);


function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

function ensureTotp(req, res, next) {
    if((req.kullanici.key && req.session.method == 'totp') ||
       (!req.kullanici.key && req.session.method == 'plain')) {
        next();
    } else {
        res.redirect('/');
    }
}


*/















/*

//Soru güncelle
app.get("/soru/:id/soruGuncelle", function(req, res)
{
    soru.findById(req.params.id, function(err, bulunanSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.render("soruGuncelle", {soru: bulunanSoru});
        }
    });
});

*/

/*

app.get("/ikifa/:id", function(req, res){

    if (verifyToken(kullanici.key, req.query.token)) {
        res.send('Verified');
      } else {
        res.send('Failed to verify');
      }


});


function getToken(secret) {
    return speakeasy.time({secret: secret, encoding: 'base32'})
  }
  
  function verifyToken(secret, token) {
    return speakeasy.time.verify({secret: secret, encoding: 'base32', token: token})
  }

*/


/*

QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
    console.log(data_url);
  
    // Display this data URL to the user in an <img> tag
    // Example:
    //write('<img src="' + data_url + '">');
  });

*/
























/*

    kullanici.findOne({username:me.username}, function(err, u) {
        if(!u) {
            me.save(function(err, me) {
                if(err) return done(err);
                done(null,me);
            });
        } else {
            console.log(u);
            done(null, u);
        }
    });
}
));

*/


/*

app.get("/sistem", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
            soru.find({}, function(err, soruDBB){
                if(err){
                    console.log(err);
                } else{
                    res.render("sistem", {sorular:soruDB, yuksekPuan:soruDBB});
                }
            }).sort({like: -1});
		}
    });
});

*/






/*

passport.use(new facebook({
    clientID: '281638285888929',
    clientSecret: '3b4eca6e1608558c9d67013adfbc2675',
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    //profileFields: ['emails']
  },
  function(accessToken, refreshToken, profile, done) {

    console.log(accessToken, refreshToken, profile);

    kullanici.findOne({ 'facebook.id' : profile.id }, function(err, user) {
        if (err) return done(err);
        if (user) return done(null, user);
        else {
          // if there is no user found with that facebook id, create them
          var newUser = new kullanici();
  
          // set all of the facebook information in our user model
          newUser.facebook.id = profile.id;
          newUser.facebook.token = accessToken;
          newUser.facebook.name  = profile.displayName;
          if (typeof profile.emails != 'undefined' && profile.emails.length > 0)
            newUser.facebook.email = profile.emails[0].value;
  
          // save our user to the database
          newUser.save(function(err) {
              if (err) throw err;
              return done(null, newUser);
          });
        }
  });

  }
));


app.get('/auth/facebook', passport.authenticate('facebook'));

app.get("/auth/facebook/callback",
passport.authenticate('facebook', {failureRedirect: '/'}),
function(req,res){
    console.log(req.user);
    res.redirect('/deneme');
}
);

/*
app.route('/auth/facebook/callback')
.get(passport.authenticate('facebook', function(err, user, info){
    console.log(err, user, info);
    res.redirect("/");
}));
*/




//Kullanıcının soru oluşturması
app.post("/soru", girisYapmamis, function(req, res){
    var baslik = req.body.baslik;
    var icerik = req.body.icerik;
    var etiket = req.body.etiket;
    var olusturan = {id: req.user._id, username: req.user.username};

    var yeniSoru = {baslik: baslik, icerik: icerik, etiket: etiket, olusturan: olusturan, like: 0, dislike:0};

    //Yeni soru oluştur ve DB'ye kaydet
    soru.create(yeniSoru, function(err, yeniOlusturulmusSoru){
        var currentUser = req.user;

        if(err)
        {
            console.log(err);
            res.redirect("/");
        }
        else
        {
            //currentUser.soru.push(yeniOlusturulmusSoru);
            currentUser.save();
            res.redirect("/sistem");
        }
    })
})

app.get("/soru/soruSor", girisYapmamis, function(req, res){
	res.render("soruSor");
});

/*
//Soruları Ana sayfada listele
app.get("/sistem", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
			res.render("sistem", {sorular:soruDB});
		}
    });
});
*/

//Soruları Ana sayfada listele
app.get("/sistem", girisYapmamis, function(req, res){
    //Soruları DB'den al
    soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
            soru.find({}, function(err, soruDBB){
                if(err){
                    console.log(err);
                } else{
                    res.render("sistem", {sorular:soruDB, yuksekPuan:soruDBB});
                }
            }).sort({like: -1}).limit(10);
		}
    });
});

/*
app.get("/yuksek", girisYapmamis, function(req, res){
	soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
			res.render("sistem", {yuksekPuan:soruDB});
		}
    }).sort({like: -1});
});

*/

/*
    //Soruları DB'den al en çok puanlananlar için
	soru.find({}, function(err, soruDB){
		if(err){
			console.log(err);
		} else{
			res.render("sistem", {yuksekPuan:soruDB});
		}
    }).sort({like: 1});
    
    */

//Bir sorunun detyalrının gösterilmesi // cevaplar a bir bak hatalı oalabilir !!!!!!!!!!!!!!!!!!!!!!!
app.get("/soru/:id", girisYapmamis, function(req, res){
	soru.findById(req.params.id).populate("cevaplar").exec(function(err, bulunanSoru){
		if(err){
			console.log(err);
		} else{
			res.render("soruGoster",{soru : bulunanSoru});
		}
    });
	
});


//Soru güncelle
app.get("/soru/:id/soruGuncelle", kullaniciKontrolSoru, function(req, res)
{
    soru.findById(req.params.id, function(err, bulunanSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.render("soruGuncelle", {soru: bulunanSoru});
        }
    });
});

app.put("/soru/:id", kullaniciKontrolSoru, function(req, res){
    soru.findByIdAndUpdate(req.params.id, req.body.soru, function(err, guncellenmisSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/soru/"+ req.params.id);
        }
    });
});


//cevap güncelle
app.get("/soru/:id/cevapGuncelle/:cevapId/", function(req, res)
{
    soru.findById(req.params.id, function(err, bulunanSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }

        cevap.findById(req.params.cevapId, function (err2, bulunanCevap) {
            if(err2)
            {
                console.log(err2);
                res.redirect("/sistem");
            }
            else
            {
                res.render("cevapGuncelle", {soru: bulunanSoru, cevap: bulunanCevap});
            }

        })
    });
});

app.put("/soru/:id/cevapGuncelle/:cevapId/", function(req, res){
    cevap.findByIdAndUpdate(req.params.cevapId, req.body.cevap, function(err, guncellenmisSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/soru/"+ req.params.id);
        }
    });
});

app.post("/soru/:id/like", function(req, res){
    soru.findById(req.params.id, function(err, soru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            soru.like += 1;
            soru.save(function(err){
                if(err) return res.status(500).send('Something went wrong!');
                return res.send({like: soru.like});
            });
        }
    });
});

app.post("/soru/:id/dislike", function(req, res){
    soru.findById(req.params.id, function(err, soru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            soru.dislike += 1;
            soru.save(function(err){
                if(err) return res.status(500).send('Something went wrong!');
                return res.send({dislike: soru.dislike});
            });
        }
    });
});

app.post("/cevap/:cevapId/like", function(req, res){
    cevap.findById(req.params.cevapId, function(err, cevap){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            cevap.like += 1;
            cevap.save(function(err){
                if(err) return res.status(500).send('Something went wrong!');
                return res.send({like: cevap.like});
            });
        }
    });
});

app.post("/cevap/:cevapId/dislike", function(req, res){
    cevap.findById(req.params.cevapId, function(err, cevap){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            cevap.dislike += 1;
            cevap.save(function(err){
                if(err) return res.status(500).send('Something went wrong!');
                return res.send({dislike: cevap.dislike});
            });
        }
    });
});

app.put("/soru/:id", girisYapmamis, function(req, res){
    soru.findByIdAndUpdate(req.params.id, req.body.soru, function(err, guncellenmisSoru){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/soru/"+ req.params.id);
        }
    });
});

/*


app.put("/guncelle/:id", function(req, res){
    kullanici.findByIdAndUpdate(req.params.id, req.body.currentUser, function(err, guncellenmisKullanici){
        if(err)
        {
            console.log(err);
            res.redirect("/sistem");
        }
        else
        {
            res.redirect("/guncelle/"+req.params.id);
        }
    });
});

*/


//Cevap
app.get("/soru/:id/cevap", girisYapmamis, function(req, res){
	soru.findById(req.params.id, function(err, bulunanSoru){
		if (err) {
			console.log(err);
		} else{
			res.render("cevap", {soru : bulunanSoru});
		}
	});
});

app.post("/soru/:id/cevap", girisYapmamis, function(req, res){
		soru.findById(req.params.id, function(err, bulunanSoru){
		if (err) {
			console.log(err);
			res.redirect("/soru");
		} else{
			cevap.create(req.body.cevap, function(err, cevap){
				cevap.olusturan.id = req.user._id;
				cevap.olusturan.username = req.user.username;
				cevap.like = 0;
				cevap.dislike = 0;
				cevap.save();

				bulunanSoru.cevaplar.push(cevap);
				bulunanSoru.save();
				res.redirect('/soru/' + bulunanSoru._id);
			});
		}
	});
});





/*
app.get("/sistem", girisYapmamis, function(req, res){
    res.render("sistem");
});

*/


















app.get("/cikis", function(req, res){
    durum = 0;
    req.logout();
    res.redirect("/");
});

//Giriş yapmamış kullanıcılara göstermek istemediğim sayfalar için
function girisYapmamis(req, res, next)
{
    //Griş yapılmış ise ve 2fa durmu 1 ise true, next devam et...
    if(req.isAuthenticated() && durum == 1)
    {
        return next();
    }
    //Giriş yapılmamışsa giriş sayfasına yönlendir
    res.redirect("/");
}

//Giriş yapmış kullanıcılara göstermek istemediğim sayfalar için
function girisYapmis(req, res, next)
{
    //Griş yapılmış ise sistem sayfasına yönlendir
    if(req.isAuthenticated())
    {
        res.redirect("/sistem");
    }
    //Griş yapılmamış ise true, next devam et...
    else
    {
        return next();
    }
}


app.get("/deneme", function(req, res){
        res.render("deneme");
 });


//Diğer kullanıcıların başka bir kullanıcılarının sorularını güncellememesi için
function kullaniciKontrolSoru(req, res, next){
    //Birisi giriş yapmış mı? Yapmış ise o kişiyi öğrenebilirim.
    if(req.isAuthenticated()){
        soru.findById(req.params.id, function(err, bulunanSoru){
            if(err){
                console.log(err);
                //back devam etmemesi için.
                res.redirect("back");
            }
            else
            {
                console.log("DENEMEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                console.log(req.user._id);
                console.log(req.params.id);

                //req.user._id DOĞRU DEĞİŞTİRME
                //bulunanKullanici BURADA SIKINTI VAR. null DÖNDÜRÜYOR!!!
                if(bulunanSoru.olusturan.id.equals(req.user._id)){
                    //res.redirect("/sistem");
                    next ();
                }
                else{
                    res.redirect("back");
                }
            }
        });
    }
}

//Diğer kullanıcıların başka bir kullanıcılarının cevaplarını güncellememesi için
function kullaniciKontrolCevap(req, res, next){
    //Birisi giriş yapmış mı? Yapmış ise o kişiyi öğrenebilirim.
    if(req.isAuthenticated()){
        cevap.findById(req.params.id, function(err, bulunanCevap){
            if(err){
                console.log(err);
                //back devam etmemesi için.
                res.redirect("back");
            }
            else
            {
                console.log("DENEMEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                console.log(req.user._id);
                console.log(req.params.id);

                //req.user._id DOĞRU DEĞİŞTİRME
                //bulunanKullanici BURADA SIKINTI VAR. null DÖNDÜRÜYOR!!!
                if(bulunanCevap.olusturan.id.equals(req.user._id)){
                    //res.redirect("/sistem");
                    next ();
                }
                else{
                    res.redirect("back");
                }
            }
        });
    }
}

//Diğer kullanıcıların başka bir kullanıcılarının bilgilerini güncellememesi için
function kullaniciKontrol(req, res, next){
    //Birisi giriş yapmış mı? Yapmış ise o kişiyi öğrenebilirim.
    if(req.isAuthenticated()){
        kullanici.findById(req.params.id, function(err, bulunanKullanici){
            if(err){
                console.log(err);
                //back devam etmemesi için.
                res.redirect("back");
            }
            else
            {
                console.log("DENEMEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE");
                console.log(req.user._id);
                console.log(req.params.id);

                //req.user._id DOĞRU DEĞİŞTİRME
                //bulunanKullanici BURADA SIKINTI VAR. null DÖNDÜRÜYOR!!!
                if(bulunanKullanici._id.equals(req.user._id)){
                    //res.redirect("/sistem");
                    next ();
                }
                else{
                    res.redirect("back");
                }
            }
        });
    }
}

/*

app.get("/sistem", girisYapmamis, function(req, res){
    res.render("sistem");
});
*/


var sunucu = app.listen(3000, function(){
    console.log("Sunucu Portu : %d", sunucu.address().port);
});