const { Client, MessageEmbed } = require('discord.js');

const client = new Client({ fetchAllMembers: true });
const express = require('express');
const ejs = require('ejs');
const passport = require('passport');
const { Strategy } = require('passport-discord');

const app = express();
app.listen(process.env.PORT || 3000);
const moment = require('moment');

moment.locale('tr');
const url = require('url');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const settings = require('./src/configs/settings.json');
const conf = require('./src/configs/config.json');

client
  .login(settings.token)
  .then(() => console.log('Giriş başarılı!'))
  .catch(() => console.log('Giriş Başarısız!'));

client.on('ready', () =>
  client.user.setPresence({ activity: { name: 'Devotion ©' }, status: 'dnd' })
);

app.engine('.ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(`${__dirname}/views/`));
app.use(
  session({
    secret: 'secret-session-thing',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());

passport.serializeUser((user, done) => {
  const channel = client.channels.cache.get('833663988096172063');
  const clientUser = client.users.cache.get(user.id);
  const embed = new MessageEmbed()
    .setThumbnail(channel.guild.iconURL({ dynamic: true }))
    .setAuthor(clientUser.username, clientUser.avatarURL({ dynamic: true }))
    .setColor('#ff3f56')
    .setFooter(client.user.username, client.user.avatarURL())
    .setTitle('Siteye yeni giriş sağlandı!').setDescription(`
**Kullanıcı adı:** ${clientUser.tag}
**Kullanıcı ID:** ${clientUser.id}
**Hesap Oluşturma Tarihi:** ${moment(clientUser.createdTimestamp).format(
    'LLL'
  )} (\`${moment(clientUser.createdTimestamp).fromNow()}\`)
    `);
  channel.send(embed);
  return done(null, user);
});
passport.deserializeUser((obj, done) => done(null, obj));

const scopes = ['identify', 'guilds'];
passport.use(
  new Strategy(
    {
      clientID: settings.clientID,
      clientSecret: settings.clientSecret,
      callbackURL: settings.callbackURL,
      scope: scopes,
    },
    (accessToken, refreshToken, profile, done) =>
      process.nextTick(() => done(null, profile))
  )
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/login', passport.authenticate('discord', { scope: scopes }));
app.get(
  '/callback',
  passport.authenticate('discord', { failureRedirect: '/error' }),
  (req, res) => res.redirect('/')
);
app.get('/logout', (req, res) => {
  req.logOut();
  return res.redirect('/');
});

app.get('/', (req, res) => {
  res.render('index', { url: req.originalUrl, user: req.user });
});

app.get('/members', (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const founders = guild.roles.cache.get(conf.roles.founderRole).members;
  const admins = guild.roles.cache.get(conf.roles.adminRole).members;
  const mods = guild.roles.cache.get(conf.roles.modRole).members;
  const interns = guild.roles.cache.get(conf.roles.internRole).members;
  const revole = guild.members.cache.get('751045196455608569');
  res.render('members', {
    founders,
    admins,
    mods,
    interns,
    revole,
    url: req.originalUrl,
    user: req.user,
  });
});

app.get('/partners', (req, res) => {
  const guild = client.guilds.cache.get(conf.guildID);
  const partners = guild.roles.cache.get(conf.roles.partnerRole).members;
  const supporters = guild.roles.cache.get(conf.roles.supporterRole).members;
  res.render('partners', {
    partners,
    supporters,
    url: req.originalUrl,
    user: req.user,
  });
});

app.get('/workwithus', (req, res) => {
  if (!req.user)
    return error(
      res,
      138,
      'Yetkili başvurusunda bulunabilmek için siteye giriş yapmanız gerekmektedir!'
    );
  res.render('workwithus', { url: req.originalUrl, user: req.user });
});

app.get('/error', (req, res) => {
  res.render('error', {
    user: req.user,
    statuscode: req.query.statuscode,
    message: req.query.message,
    url: req.originalUrl,
  });
});

app.post('/basvuru', async (req, res) => {
  if (!req.user)
    return error(
      res,
      138,
      'Yetkili başvurusunda bulunabilmek için siteye giriş yapmanız gerekmektedir..'
    );

  const channel = client.channels.cache.get('833664103938916362');
  const member = channel.guild.members.cache.get(req.user.id);
  if (!member)
    return error(
      res,
      403,
      'Başvuru yapabilmek için Discord sunucumuzda bulunmanız gerekmektedir..'
    );
  const clientUser = client.users.cache.get(req.user.id);
  console.log(req.body.position);
  const embed = new MessageEmbed()
    .setThumbnail(channel.guild.iconURL({ dynamic: true }))
    .setAuthor(clientUser.username, clientUser.avatarURL({ dynamic: true }))
    .setColor('#ff3f56')
    .setFooter(client.user.username, client.user.avatarURL())
    .setTitle('Yeni yetkili başvurusu!').setDescription(`
**Kullanıcı:** ${channel.guild.members.cache.get(req.user.id).toString()} - \`${
    req.user.id
  }\`
**Adı Soyadı:** ${req.body.name}
**E-mail:** ${req.body.email}
**Doğum Tarihi:** ${req.body.birthday}
**Yaptığı İşler:** ${req.body.jobs}
**Pozisyonu:** ${req.body.position}

**Neden Devotion?:** ${req.body.whyDevotion}
**Kendinizden Bahsedin:** ${req.body.whyMe}
    `);
  await channel.send(embed);
  return res.redirect('/');
});

app.use((req, res) => error(res, 404, 'Sayfa bulunamadı!'));

const error = (res, statuscode, message) =>
  res.redirect(
    url.format({ pathname: '/error', query: { statuscode, message } })
  );

client.on('message', async (message) => {
  const prefix = '.';
  const owners = ['350976460313329665'];
  if (
    message.author.bot ||
    !message.guild ||
    !message.content.toLowerCase().startsWith(prefix)
  )
    return;
  const args = message.content.split(' ').slice(1);
  const command = message.content.split(' ')[0].slice(prefix.length);

  if (command === 'eval' && owners.includes(message.author.id)) {
    if (!args[0]) return message.channel.send(`Kod belirtilmedi`);
    const code = args.join(' ');

    function clean(text) {
      if (typeof text !== 'string')
        text = require('util').inspect(text, { depth: 0 });
      text = text
        .replace(/`/g, `\`${String.fromCharCode(8203)}`)
        .replace(/@/g, `@${String.fromCharCode(8203)}`);
      return text;
    }

    try {
      const evaled = clean(await eval(code));
      if (evaled.match(new RegExp(`${client.token}`, 'g')))
        evaled
          .replace('token', 'Yasaklı komut')
          .replace(client.token, 'Yasaklı komut');
      await message.channel.send(
        `${evaled.replace(client.token, 'Yasaklı komut')}`,
        { code: 'js', split: true }
      );
    } catch (err) {
      await message.channel.send(err, { code: 'js', split: true });
    }
  }
});

// internet sorunsalı

/*
founder 808437704005648455
admin 808414414839480450
moderatör 808414360975704104
ıntern 809163256031346738
*/

/*
supporter 816288370908856362
*/
