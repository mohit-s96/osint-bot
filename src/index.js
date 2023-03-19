const dotenv = require("dotenv");
const axios = require("axios");
const { accounts, splitter } = require("./accounts");
const Oauth1Helper = require("./oauthhelper");
const { TwitterApi } = require("twitter-api-v2");
dotenv.config();

const client = new TwitterApi(process.env.twitter_bearer_token);

async function fetchSingleTweet(id) {
  try {
    const config = {
      method: "get",
      url: `https://api.twitter.com/2/tweets/${id}?tweet.fields=in_reply_to_user_id,referenced_tweets&expansions=author_id`,
      headers: {
        Authorization: `Bearer ${process.env.twitter_bearer_token}`,
      },
    };

    const { data } = await axios(config);
    return data.data;
  } catch (error) {
    console.log(error);
    return {};
  }
}

// run this to generate new rules (in case of addition/deletion of an account) - delete old rules before posting new rules
const rules = splitter(accounts).map((arr) => ({
  value: arr.map((id) => `from:${id}`).join(" OR "),
}));

(async () => {
  try {
    const stream = await client.v2.searchStream({
      "tweet.fields": ["in_reply_to_user_id", "referenced_tweets"],
      "user.fields": ["id"],
      expansions: ["author_id"],
    });

    for await (const { data } of stream) {
      processTweet(data);
    }
  } catch (error) {
    console.log("[Main streaming function]: ", error);
  }
})();

async function processTweet(tweet) {
  if (
    accounts.includes(tweet?.author_id) &&
    !tweet.in_reply_to_user_id &&
    (await isRetweetOfAccountInList(tweet))
  ) {
    try {
      const req = {
        url: `https://api.twitter.com/2/users/${process.env.user_id}/retweets`,
        method: "POST",
        body: {
          tweet_id: tweet.id,
        },
      };
      const oauthHeader = Oauth1Helper.getAuthHeaderForRequest(req);
      const response = await axios.post(req.url, req.body, {
        headers: { ...oauthHeader, "Content-Type": "application/json" },
      });
      if (!response?.data?.data?.retweeted) {
        console.log("something went wrong while retweeting,", tweet.id);
      } else {
        console.log("done");
      }
    } catch (error) {
      console.log("[Process tweet function: ]", error);
    }
  } else {
    return;
  }
}

async function isRetweetOfAccountInList(tweet) {
  try {
    const originalTweetId = isRetweet(tweet);
    if (originalTweetId) {
      const originalTweet = await fetchSingleTweet(originalTweetId);
      if (
        accounts.includes(originalTweet?.author_id) &&
        !originalTweet?.in_reply_to_user_id
      ) {
        return true;
      }
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.log(["isRetweetOfAccountList function: ", error]);
    return false;
  }
}

function isRetweet(tweet) {
  return tweet?.referenced_tweets?.find((ref) => ref.type === "retweeted")?.id;
}
