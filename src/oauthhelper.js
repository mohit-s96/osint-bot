const crypto = require("crypto");
const oauth1a = require("oauth-1.0a");
const dotenv = require("dotenv");
dotenv.config();

const config = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret,
};

class Oauth1Helper {
  static getAuthHeaderForRequest(request) {
    const oauth = oauth1a({
      consumer: { key: config.consumer_key, secret: config.consumer_secret },
      signature_method: "HMAC-SHA1",
      hash_function(base_string, key) {
        return crypto
          .createHmac("sha1", key)
          .update(base_string)
          .digest("base64");
      },
    });

    const authorization = oauth.authorize(request, {
      key: config.access_token,
      secret: config.access_token_secret,
    });

    return oauth.toHeader(authorization);
  }
}

module.exports = Oauth1Helper;
