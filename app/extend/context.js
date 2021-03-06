'use strict';

const debug = require('debug')('egg:plugin:i18next');

const LocaleSymbol = Symbol('context#locale');

function formatLocale(locale) {
  // support zh_CN, en_US => zh-CN, en-US
  const [ lng, country ] = locale.replace('_', '-').split('-', 2);
  if (country) {
    return lng.toLowerCase() + '-' + country.toUpperCase();
  }
  return lng.toLowerCase();
}

module.exports = {
  __(...args) {
    const { i18next } = this.app;

    return i18next.t(...args);
  },
  /**
   * get current request locale
   * @member Context#locale
   * @return {String} lower case locale string, e.g.: 'zh-cn', 'en-us'
   */
  get locale() {
    if (this[LocaleSymbol]) {
      return this[LocaleSymbol];
    }
    const { app } = this;
    const { cookieField, queryField, cookieMaxAge } = app.config.i18next;
    const cookieLocale = this.cookies.get(cookieField, { signed: false });

    // 1. Query
    let locale = this.query[queryField];
    let localeOrigin = 'query';

    // 2. Cookie
    if (!locale) {
      locale = cookieLocale;
      localeOrigin = 'cookie';
    }

    // 3. Header
    if (!locale) {
      // Accept-Language: zh-CN,zh;q=0.5
      // Accept-Language: zh-CN
      let languages = this.acceptsLanguages();
      if (languages) {
        if (Array.isArray(languages)) {
          if (languages[0] === '*') {
            languages = languages.slice(1);
          }
          if (languages.length > 0) {
            // TODO: Language selector
            const lang = formatLocale(languages[0]);
            locale = lang;
            localeOrigin = 'header';
          }
        } else {
          locale = languages;
          localeOrigin = 'header (only one accepted language)';
        }
      }
    }

    // 4. all missing
    if (!locale) {
      debug('No locale detected');
      return;
    }

    locale = formatLocale(locale);

    // if header not send, set the locale cookie
    if (cookieLocale !== locale && !this.headerSent) {
      // locale change, need to set cookie
      this.cookies.set(cookieField, locale, {
        // make sure brower javascript can read the cookie
        httpOnly: false,
        maxAge: cookieMaxAge,
        signed: false,
      });
      debug('Saved cookie with locale %s', locale);
    }
    debug('Locale: %s from %s', locale, localeOrigin);
    this.__locale = locale;
    return locale;
  },
};
