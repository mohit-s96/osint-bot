const Twit = require("twit");
const dotenv = require("dotenv");
const axios = require("axios");
const accounts = require("./accounts");
const Oauth1Helper = require("./oauthhelper");
dotenv.config();
const config = {
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret,
};
const T = new Twit(config);

var stream = T.stream("statuses/filter", { follow: accounts });

stream.on("tweet", async (tweet) => {
  if (
    accounts.includes(tweet.user.id_str) &&
    !tweet.in_reply_to_user_id_str &&
    isRetweetOfAccountInList(tweet)
  ) {
    try {
      const req = {
        url: `https://api.twitter.com/2/users/1319638940471623682/retweets`,
        method: "POST",
        body: {
          tweet_id: tweet.id_str,
        },
      };
      const oauthHeader = Oauth1Helper.getAuthHeaderForRequest(req);
      const response = await axios.post(req.url, req.body, {
        headers: { ...oauthHeader, "Content-Type": "application/json" },
      });
      if (!response.data.data?.retweeted) {
        console.log("something went wrong while retweeting,", tweet.id_str);
      } else {
        console.log("done");
      }
    } catch (error) {
      console.log(error);
    }
  } else {
    return;
  }
});

/**
 *
 * @param {*} tweet
 * @returns boolean
 *
 * fixes #1
 */
function isRetweetOfAccountInList(tweet) {
  const originalTweet = tweet.retweeted_status;
  if (originalTweet) {
    if (
      accounts.includes(originalTweet.user.id_str) &&
      !originalTweet.in_reply_to_user_id_str
    ) {
      return true;
    }
    return false;
  } else {
    return true;
  }
}
