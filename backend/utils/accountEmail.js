const templates = {
  en: {
    subject: 'Reset your KitapStore password',
    introduction: 'Use this link to choose a new password:',
    expiresOne: 'The link expires in {{minutes}} minute and can be used once.',
    expiresOther: 'The link expires in {{minutes}} minutes and can be used once.',
    ignore: 'If you did not request this, ignore this email.',
  },
  de: {
    subject: 'Ihr KitapStore-Passwort zurücksetzen',
    introduction: 'Wählen Sie über diesen Link ein neues Passwort:',
    expiresOne: 'Der Link ist {{minutes}} Minute gültig und kann nur einmal verwendet werden.',
    expiresOther: 'Der Link ist {{minutes}} Minuten gültig und kann nur einmal verwendet werden.',
    ignore: 'Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.',
  },
  qt: {
    subject: 'KitapStore şifreñizni yañartıñız',
    introduction: 'Yañı şifre saylamaq içün bu bağlantını qullanıñız:',
    expiresOther: 'Bağlantı {{minutes}} daqqa keçerli ve yalıñız bir kere qullanıla bile.',
    ignore: 'Bunı siz istemegen olsañız, bu mektüpni diqqatqa almañız.',
  },
  ru: {
    subject: 'Сброс пароля KitapStore',
    introduction: 'Перейдите по ссылке, чтобы выбрать новый пароль:',
    expiresOne: 'Ссылка действует {{minutes}} минуту и может быть использована один раз.',
    expiresFew: 'Ссылка действует {{minutes}} минуты и может быть использована один раз.',
    expiresMany: 'Ссылка действует {{minutes}} минут и может быть использована один раз.',
    expiresOther: 'Ссылка действует {{minutes}} минуты и может быть использована один раз.',
    ignore: 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо.',
  },
};
function accountLanguage(value) {
  return typeof value === 'string' && Object.hasOwn(templates, value) ? value : 'en';
}
function passwordResetEmail(language, link, minutes, expiresAt) {
  const selected = accountLanguage(language);
  const template = templates[selected];
  const category = selected === 'qt' ? 'other' : new Intl.PluralRules(selected).select(minutes);
  let expiration = template[`expires${category[0].toUpperCase()}${category.slice(1)}`] || template.expiresOther;
  if (expiresAt) {
    const deadline = new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    expiration = { en: 'This link expires at {{minutes}} and can be used once.',
      de: 'Dieser Link läuft am {{minutes}} ab und kann nur einmal verwendet werden.',
      qt: 'Bu bağlantı {{minutes}} tarihinde keçersiz ola ve yalıñız bir kere qullanıla bile.',
      ru: 'Ссылка действует до {{minutes}} и может быть использована один раз.' }[selected];
    minutes = deadline;
  }
  return { subject: template.subject,
    text: `${template.introduction}\n${link}\n\n${expiration.replace('{{minutes}}', String(minutes))} ${template.ignore}` };
}
module.exports = { accountLanguage, passwordResetEmail };
